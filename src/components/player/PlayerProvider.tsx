"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { track as ga } from "@/lib/analytics";
import { getPrefs, setPrefs } from "@/lib/storage";
import type { AudioRendition, ParaTimings } from "@/lib/types";

export interface TtsSource {
  kind: "tts";
  bookCode: string;
  chapterNumber: number;
  chapterTitle: string;
  bookTitle: string;
  renditions: AudioRendition[];
  voiceKey: string;
}

export interface TrackSource {
  kind: "track";
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  durationMs?: number;
}

export type PlayerSource = TtsSource | TrackSource;

interface PlayerState {
  source: PlayerSource | null;
  playing: boolean;
  /** current position in ms, ~4Hz resolution */
  positionMs: number;
  durationMs: number;
  rate: number;
  sleepRemainingMs: number | null;
  playTts: (src: Omit<TtsSource, "kind" | "voiceKey">, opts?: { voiceKey?: string; startMs?: number }) => void;
  playTrack: (src: Omit<TrackSource, "kind">) => void;
  /** switch voice, re-resolving position by paragraph (PRD §5) */
  switchVoice: (voiceKey: string) => void;
  toggle: () => void;
  seekMs: (ms: number) => void;
  setRate: (rate: number) => void;
  setSleepTimer: (minutes: number | null) => void;
  close: () => void;
}

const PlayerContext = createContext<PlayerState | null>(null);

export function usePlayer(): PlayerState {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer outside PlayerProvider");
  return ctx;
}

/** rendition currently playing, for a tts source */
export function activeRendition(source: PlayerSource | null): AudioRendition | null {
  if (!source || source.kind !== "tts") return null;
  return source.renditions.find((r) => r.voice_key === source.voiceKey) ?? null;
}

/** paragraph sequence bracketed by [start_ms,end_ms] at the given position */
export function paraAtPosition(timings: ParaTimings, positionMs: number): number | null {
  for (const [seq, [start, end]] of Object.entries(timings)) {
    if (positionMs >= start && positionMs < end) return Number(seq);
  }
  return null;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [source, setSource] = useState<PlayerSource | null>(null);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [rate, setRateState] = useState(1);
  const [sleepRemainingMs, setSleepRemaining] = useState<number | null>(null);
  const sleepUntil = useRef<number | null>(null);

  // one <audio> element for the whole app — survives route changes
  const audio = useCallback((): HTMLAudioElement => {
    if (!audioRef.current) {
      const el = new Audio();
      el.preload = "metadata";
      audioRef.current = el;
    }
    return audioRef.current;
  }, []);

  useEffect(() => {
    setRateState(getPrefs().playbackRate);
  }, []);

  // wire element events once
  useEffect(() => {
    const el = audio();
    const onTime = () => {
      setPositionMs(el.currentTime * 1000);
      if (sleepUntil.current !== null) {
        const left = sleepUntil.current - Date.now();
        setSleepRemaining(left);
        if (left <= 0) {
          el.pause();
          sleepUntil.current = null;
          setSleepRemaining(null);
        }
      }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onDuration = () => setDurationMs(el.duration * 1000 || 0);
    const onEnded = () => {
      setPlaying(false);
      ga("tts_complete");
    };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("durationchange", onDuration);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("durationchange", onDuration);
      el.removeEventListener("ended", onEnded);
    };
  }, [audio]);

  const load = useCallback(
    (url: string, startMs = 0) => {
      const el = audio();
      if (el.src !== url) el.src = url;
      el.currentTime = startMs / 1000;
      el.playbackRate = rate;
      void el.play().catch(() => setPlaying(false));
    },
    [audio, rate]
  );

  const playTts: PlayerState["playTts"] = useCallback(
    (src, opts = {}) => {
      // fresh-first default: audio_renditions[0] (contract §2.3)
      const voiceKey = opts.voiceKey ?? src.renditions[0]?.voice_key;
      const rendition = src.renditions.find((r) => r.voice_key === voiceKey);
      if (!rendition) return;
      setSource({ kind: "tts", ...src, voiceKey });
      setDurationMs(rendition.duration_ms);
      load(rendition.audio_url, opts.startMs ?? 0);
      ga("tts_play", { voice: rendition.voice_label });
    },
    [load]
  );

  const playTrack: PlayerState["playTrack"] = useCallback(
    (src) => {
      setSource({ kind: "track", ...src });
      if (src.durationMs) setDurationMs(src.durationMs);
      load(src.url, 0);
      ga("audio_track_play");
    },
    [load]
  );

  const switchVoice = useCallback(
    (voiceKey: string) => {
      setSource((prev) => {
        if (!prev || prev.kind !== "tts") return prev;
        const from = prev.renditions.find((r) => r.voice_key === prev.voiceKey);
        const to = prev.renditions.find((r) => r.voice_key === voiceKey);
        if (!to) return prev;
        // re-resolve by paragraph, not timestamp (PRD §5)
        const el = audio();
        const seq = from ? paraAtPosition(from.para_timings, el.currentTime * 1000) : null;
        const startMs = seq !== null ? (to.para_timings[String(seq)]?.[0] ?? 0) : 0;
        setDurationMs(to.duration_ms);
        load(to.audio_url, startMs);
        ga("tts_play", { voice: to.voice_label });
        return { ...prev, voiceKey };
      });
    },
    [audio, load]
  );

  const toggle = useCallback(() => {
    const el = audio();
    if (el.paused) void el.play().catch(() => undefined);
    else el.pause();
  }, [audio]);

  const seekMs = useCallback(
    (ms: number) => {
      const el = audio();
      el.currentTime = Math.max(0, ms / 1000);
      setPositionMs(ms);
    },
    [audio]
  );

  const setRate = useCallback(
    (r: number) => {
      setRateState(r);
      audio().playbackRate = r;
      setPrefs({ playbackRate: r });
    },
    [audio]
  );

  const setSleepTimer = useCallback((minutes: number | null) => {
    if (minutes === null) {
      sleepUntil.current = null;
      setSleepRemaining(null);
    } else {
      sleepUntil.current = Date.now() + minutes * 60_000;
      setSleepRemaining(minutes * 60_000);
    }
  }, []);

  const close = useCallback(() => {
    const el = audio();
    el.pause();
    el.removeAttribute("src");
    setSource(null);
    setPositionMs(0);
    setDurationMs(0);
    sleepUntil.current = null;
    setSleepRemaining(null);
  }, [audio]);

  // Media Session API — lock-screen controls (PRD §6; iOS testing tracked
  // separately, not blocking)
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    if (!source) {
      ms.metadata = null;
      return;
    }
    ms.metadata = new MediaMetadata(
      source.kind === "tts"
        ? { title: source.chapterTitle, artist: source.bookTitle, album: "MD Study" }
        : { title: source.title, artist: source.subtitle ?? "", album: "MD Study" }
    );
    const el = audio();
    ms.setActionHandler("play", () => void el.play().catch(() => undefined));
    ms.setActionHandler("pause", () => el.pause());
    ms.setActionHandler("seekbackward", () => {
      el.currentTime = Math.max(0, el.currentTime - 10);
    });
    ms.setActionHandler("seekforward", () => {
      el.currentTime = el.currentTime + 10;
    });
    try {
      ms.setActionHandler("seekto", (d) => {
        if (d.seekTime !== undefined && d.seekTime !== null) el.currentTime = d.seekTime;
      });
    } catch {
      // seekto unsupported on some browsers
    }
    return () => {
      ms.setActionHandler("play", null);
      ms.setActionHandler("pause", null);
      ms.setActionHandler("seekbackward", null);
      ms.setActionHandler("seekforward", null);
      try {
        ms.setActionHandler("seekto", null);
      } catch {
        // ignore
      }
    };
  }, [source, audio]);

  const value = useMemo<PlayerState>(
    () => ({
      source,
      playing,
      positionMs,
      durationMs,
      rate,
      sleepRemainingMs: sleepRemainingMs,
      playTts,
      playTrack,
      switchVoice,
      toggle,
      seekMs,
      setRate,
      setSleepTimer,
      close,
    }),
    [
      source,
      playing,
      positionMs,
      durationMs,
      rate,
      sleepRemainingMs,
      playTts,
      playTrack,
      switchVoice,
      toggle,
      seekMs,
      setRate,
      setSleepTimer,
      close,
    ]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
