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
import { clearListeningPosition, getPrefs, setListeningPosition, setPrefs } from "@/lib/storage";
import type { AudioRendition, ParaTimings } from "@/lib/types";
import { DeviceSpeaker, hindiVoice, onVoicesChanged, type SpokenPara } from "./deviceSpeech";

export interface TtsSource {
  kind: "tts";
  bookCode: string;
  chapterNumber: number;
  chapterTitle: string;
  bookTitle: string;
  renditions: AudioRendition[];
  voiceKey: string;
}

/**
 * Fallback read-aloud with the device's own Hindi voice, for chapters with no
 * generated rendition yet. No timeline (the Web Speech API exposes no
 * position), so the bar shows paragraph progress instead of a scrub bar.
 */
export interface DeviceTtsSource {
  kind: "device";
  bookCode: string;
  chapterNumber: number;
  chapterTitle: string;
  bookTitle: string;
  paras: SpokenPara[];
}

export interface TrackSource {
  kind: "track";
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  durationMs?: number;
}

export type PlayerSource = TtsSource | DeviceTtsSource | TrackSource;

interface PlayerState {
  source: PlayerSource | null;
  playing: boolean;
  /** current position in ms, ~4Hz resolution. Always 0 for a device source. */
  positionMs: number;
  durationMs: number;
  rate: number;
  sleepRemainingMs: number | null;
  /** device mode only: paragraph being spoken, and how far along we are */
  deviceParaSeq: number | null;
  deviceParaIndex: number;
  /** whether this device can read Hindi aloud at all (async: voices load late) */
  deviceVoiceAvailable: boolean;
  deviceVoiceLabel: string | null;
  playTts: (src: Omit<TtsSource, "kind" | "voiceKey">, opts?: { voiceKey?: string; startMs?: number }) => void;
  playDeviceTts: (src: Omit<DeviceTtsSource, "kind">, opts?: { fromSequence?: number }) => void;
  playTrack: (src: Omit<TrackSource, "kind">) => void;
  /** switch voice, re-resolving position by paragraph (PRD §5) */
  switchVoice: (voiceKey: string) => void;
  toggle: () => void;
  seekMs: (ms: number) => void;
  /**
   * Jump by seconds, signed. In device-voice mode there is no timeline to move
   * along, so the sign is taken as one paragraph back or forward — see
   * `DeviceSpeaker.jumpParas`.
   */
  skipSeconds: (seconds: number) => void;
  setRate: (rate: number) => void;
  setSleepTimer: (minutes: number | null) => void;
  close: () => void;
}

/**
 * The skip step, in seconds. Ten is the podcast convention, and it is the
 * right size for these texts too: a सूत्र runs 15–40 seconds spoken, so ten
 * seconds re-hears a clause without losing the sentence.
 */
export const SKIP_SECONDS = 10;

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
  const [deviceParaSeq, setDeviceParaSeq] = useState<number | null>(null);
  const [deviceParaIndex, setDeviceParaIndex] = useState(0);
  const [deviceVoice, setDeviceVoice] = useState<SpeechSynthesisVoice | null>(null);
  const speaker = useRef<DeviceSpeaker | null>(null);

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

  // Voice list loads asynchronously in Chrome — check now and on every change,
  // or a device that does have Hindi looks like one that doesn't.
  useEffect(() => {
    const refresh = () => setDeviceVoice(hindiVoice());
    refresh();
    return onVoicesChanged(refresh);
  }, []);

  // Device speech has no timeupdate; drive the sleep timer from an interval
  // while it is speaking.
  useEffect(() => {
    if (source?.kind !== "device" || sleepRemainingMs === null) return;
    const id = setInterval(() => {
      if (sleepUntil.current === null) return;
      const left = sleepUntil.current - Date.now();
      setSleepRemaining(left);
      if (left <= 0) {
        speaker.current?.stop();
        setPlaying(false);
        sleepUntil.current = null;
        setSleepRemaining(null);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [source?.kind, sleepRemainingMs]);

  // Stop speaking if the provider unmounts (route teardown, app close).
  useEffect(() => () => speaker.current?.stop(), []);

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
      // Real audio always wins over the device-voice fallback.
      speaker.current?.stop();
      setDeviceParaSeq(null);
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

  const playDeviceTts: PlayerState["playDeviceTts"] = useCallback(
    (src, opts = {}) => {
      if (!src.paras.length) return;
      const el = audio();
      el.pause(); // never let both engines speak at once
      speaker.current?.stop();
      const engine = new DeviceSpeaker({
        onPara: (sequence, index) => {
          setDeviceParaSeq(sequence);
          setDeviceParaIndex(index);
        },
        onEnd: () => {
          setPlaying(false);
          setDeviceParaSeq(null);
          ga("tts_complete");
        },
        onError: () => {
          setPlaying(false);
          setDeviceParaSeq(null);
        },
      });
      speaker.current = engine;
      setSource({ kind: "device", ...src });
      setPositionMs(0);
      setDurationMs(0);
      engine.start(src.paras, opts.fromSequence, rate);
      setPlaying(true);
      ga("tts_play", { voice: "device" });
    },
    [audio, rate]
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
    if (source?.kind === "device") {
      const engine = speaker.current;
      if (!engine) return;
      if (playing) {
        engine.pause();
        setPlaying(false);
      } else {
        engine.resume();
        setPlaying(true);
      }
      return;
    }
    const el = audio();
    if (el.paused) void el.play().catch(() => undefined);
    else el.pause();
  }, [audio, source?.kind, playing]);

  const seekMs = useCallback(
    (ms: number) => {
      const el = audio();
      el.currentTime = Math.max(0, ms / 1000);
      setPositionMs(ms);
    },
    [audio]
  );

  const skipSeconds = useCallback(
    (seconds: number) => {
      if (source?.kind === "device") {
        const seq = speaker.current?.jumpParas(seconds < 0 ? -1 : 1) ?? null;
        if (seq !== null) {
          setDeviceParaSeq(seq);
          setDeviceParaIndex(speaker.current?.paraIndex ?? 0);
          setPlaying(true);
        }
        return;
      }
      const el = audio();
      // Clamped at both ends: skipping past the end of a chapter would fire
      // `ended` and look like the reader finished it.
      const max = el.duration ? el.duration - 0.25 : Infinity;
      el.currentTime = Math.min(Math.max(0, el.currentTime + seconds), max);
      setPositionMs(el.currentTime * 1000);
    },
    [audio, source?.kind]
  );

  const setRate = useCallback(
    (r: number) => {
      setRateState(r);
      audio().playbackRate = r;
      setPrefs({ playbackRate: r });
      // A queued utterance cannot be retuned — restart the current paragraph.
      if (source?.kind === "device" && playing) speaker.current?.restartCurrentPara(r);
    },
    [audio, source?.kind, playing]
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

  /**
   * Remember the playhead, so the next tap on 🎧 continues instead of starting
   * the chapter again. Written from the audio element rather than `positionMs`
   * state: that is a 4Hz render signal, and this wants the truth at the moment
   * of asking.
   *
   * A finished chapter clears its entry — resuming 3 seconds before the end is
   * the one place "continue" is worse than "start again".
   */
  const remember = useCallback(() => {
    const src = source;
    // Tracks are their own content with their own position; this playhead is
    // about a chapter of a book, which is the thing a reader returns to.
    if (!src || src.kind === "track") return;
    const el = audio();
    if (src.kind !== "device" && el.duration && el.currentTime >= el.duration - 1) {
      clearListeningPosition(src.bookCode);
      return;
    }
    const positionMs = src.kind === "device" ? 0 : el.currentTime * 1000;
    const rendition = activeRendition(src);
    const paraSeq =
      src.kind === "device"
        ? deviceParaSeq
        : rendition
          ? paraAtPosition(rendition.para_timings, positionMs)
          : null;
    setListeningPosition({
      book_code: src.bookCode,
      chapter_number: src.chapterNumber,
      position_ms: Math.round(positionMs),
      para_seq: paraSeq,
      voice_key: src.kind === "tts" ? src.voiceKey : undefined,
    });
  }, [source, audio, deviceParaSeq]);

  // While playing, every few seconds; and whenever playback stops, the tab
  // hides, or this effect tears down — a killed tab is the commonest way a
  // listening session ends, and it fires no pause.
  useEffect(() => {
    if (!playing) {
      remember();
      return;
    }
    const id = setInterval(remember, 5000);
    window.addEventListener("pagehide", remember);
    return () => {
      clearInterval(id);
      window.removeEventListener("pagehide", remember);
      remember();
    };
  }, [playing, remember]);

  const close = useCallback(() => {
    speaker.current?.stop();
    speaker.current = null;
    setDeviceParaSeq(null);
    setDeviceParaIndex(0);
    const el = audio();
    el.pause();
    el.removeAttribute("src");
    setSource(null);
    setPlaying(false);
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
    // Device speech doesn't run through the audio element, so the OS has no
    // media session to attach to — no lock-screen controls in that mode.
    if (!source || source.kind === "device") {
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
    // Same 10s the bar's own buttons use, and the same clamping — the lock
    // screen should not be able to do something the app cannot.
    ms.setActionHandler("seekbackward", (d) => skipSeconds(-(d.seekOffset ?? SKIP_SECONDS)));
    ms.setActionHandler("seekforward", (d) => skipSeconds(d.seekOffset ?? SKIP_SECONDS));
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
  }, [source, audio, skipSeconds]);

  const value = useMemo<PlayerState>(
    () => ({
      source,
      playing,
      positionMs,
      durationMs,
      rate,
      sleepRemainingMs: sleepRemainingMs,
      deviceParaSeq,
      deviceParaIndex,
      deviceVoiceAvailable: deviceVoice !== null,
      deviceVoiceLabel: deviceVoice?.name ?? null,
      playTts,
      playDeviceTts,
      playTrack,
      switchVoice,
      toggle,
      seekMs,
      skipSeconds,
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
      deviceParaSeq,
      deviceParaIndex,
      deviceVoice,
      playTts,
      playDeviceTts,
      playTrack,
      switchVoice,
      toggle,
      seekMs,
      skipSeconds,
      setRate,
      setSleepTimer,
      close,
    ]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
