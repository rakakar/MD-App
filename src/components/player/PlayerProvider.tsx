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
import {
  clearListeningPosition,
  clearPlayhead,
  getPrefs,
  setListeningPosition,
  setPlayhead,
  setPrefs,
} from "@/lib/storage";
import type { AudioRendition, ParaTimings } from "@/lib/types";
import { DeviceSpeaker, hindiVoice, onVoicesChanged, type SpokenPara } from "./deviceSpeech";

export interface TtsSource {
  kind: "tts";
  bookCode: string;
  chapterNumber: number;
  chapterTitle: string;
  bookTitle: string;
  /** the book's cover, for the lock screen and for Audio Mode */
  coverImage?: string | null;
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
  coverImage?: string | null;
  paras: SpokenPara[];
}

export interface TrackSource {
  kind: "track";
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  durationMs?: number;
  coverImage?: string | null;
  /**
   * Where to remember this playhead, if it is worth remembering — set by the
   * surface that knows the track has an identity to return to (a Resources
   * collection's items do; an ad-hoc URL does not). Absent means "play it, but
   * do not keep a place for it", which is the old behaviour of every track.
   */
  resumeKey?: string;
}

export type PlayerSource = TtsSource | DeviceTtsSource | TrackSource;

/**
 * What "previous" and "next" mean for whatever is playing — supplied by the
 * surface that knows (the reader knows its chapter neighbours; a track list
 * would know its queue). Used in three places at once: the lock screen's
 * ⏮/⏭, Audio Mode's chapter buttons, and the auto-advance at the end of a
 * chapter, which is what makes listening hands-free.
 */
export interface ChapterNav {
  prev: (() => void) | null;
  next: (() => void) | null;
}

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
  playTrack: (src: Omit<TrackSource, "kind">, opts?: { startMs?: number }) => void;
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
  /** whether the full-screen Audio Mode surface is showing */
  audioModeOpen: boolean;
  openAudioMode: () => void;
  closeAudioMode: () => void;
  chapterNav: ChapterNav | null;
  /** memoize the object, or this re-registers the OS handlers every render */
  setChapterNav: (nav: ChapterNav | null) => void;
}

/**
 * The skip step, in seconds. Ten is the podcast convention, and it is the
 * right size for these texts too: a sutra runs 15–40 seconds spoken, so ten
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
  const [audioModeOpen, setAudioModeOpen] = useState(false);
  const [chapterNav, setChapterNav] = useState<ChapterNav | null>(null);
  // Read by the element's `ended` handler and by the OS handlers, both of
  // which are registered once and would otherwise close over a stale nav.
  const navRef = useRef<ChapterNav | null>(null);
  useEffect(() => {
    navRef.current = chapterNav;
  }, [chapterNav]);

  // one <audio> element for the whole app — survives route changes
  const audio = useCallback((): HTMLAudioElement => {
    if (!audioRef.current) {
      const el = new Audio();
      el.preload = "metadata";
      // Safari only treats an element as the page's media — the thing it hands
      // to Now Playing and the lock screen — when it is in the document and
      // allowed to play inline. A detached `new Audio()` plays sound and the
      // OS never learns who is making it.
      el.setAttribute("playsinline", "");
      el.setAttribute("aria-hidden", "true");
      if (typeof document !== "undefined") document.body.appendChild(el);
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
      // Hands-free is the whole point of listening: a finished chapter rolls
      // into the next one when the surface has told us what "next" is.
      navRef.current?.next?.();
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
          navRef.current?.next?.();
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
    (src, opts = {}) => {
      setSource({ kind: "track", ...src });
      if (src.durationMs) setDurationMs(src.durationMs);
      load(src.url, opts.startMs ?? 0);
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

  // The OS's ⏪/⏩ call through this ref, so registering those handlers does not
  // have to depend on `skipSeconds` — re-registering them is what loses the
  // Android notification.
  const skipRef = useRef(skipSeconds);
  useEffect(() => {
    skipRef.current = skipSeconds;
  }, [skipSeconds]);

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
    if (!src) return;
    // A track keeps its place only when the surface that started it gave it a
    // key to keep it under — a Resources collection's items do, so a 90-minute
    // shivir recording resumes instead of restarting.
    if (src.kind === "track") {
      if (!src.resumeKey) return;
      const el = audio();
      if (el.duration && el.currentTime >= el.duration - 1) clearPlayhead(src.resumeKey);
      else setPlayhead(src.resumeKey, el.currentTime * 1000);
      return;
    }
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
    setAudioModeOpen(false);
  }, [audio]);

  const openAudioMode = useCallback(() => setAudioModeOpen(true), []);
  const closeAudioMode = useCallback(() => setAudioModeOpen(false), []);

  // ---- Media Session: the lock screen and the notification shade ----
  //
  // Four things have to be true before an OS draws a player there, and missing
  // any one of them looks identical from inside the app — sound plays and no
  // controls appear: an in-document media element, metadata with artwork, a
  // live position state, and a playbackState the OS can trust.
  //
  // They are set in *four separate effects* on purpose. Android's notification
  // is torn down and rebuilt when the transport handlers are unregistered, and
  // Chrome does not always rebuild it — so a single effect that also depended
  // on the chapter neighbours (which arrive a beat after playback starts, and
  // again on every chapter change) produced exactly what a Moto reader
  // reported: controls the first time, then nothing. Metadata churn, handler
  // churn, position churn and state churn are now independent, and only the
  // one that actually changed re-runs.

  // 1. Who is playing. Depends on the *values*, not on the source object: that
  //    object is replaced whenever the voice or the playhead moves.
  const msTitle = !source ? null : source.kind === "track" ? source.title : source.chapterTitle;
  const msArtist = !source
    ? null
    : source.kind === "track"
      ? (source.subtitle ?? "")
      : source.bookTitle;
  const msCover = source?.kind === "device" ? null : (source?.coverImage ?? null);
  const msSilent = !source || source.kind === "device";
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    // Device speech doesn't run through the audio element, so the OS has no
    // media session to attach to — no lock-screen controls in that mode.
    if (msSilent || msTitle === null) {
      ms.metadata = null;
      return;
    }
    const artwork: MediaImage[] = [];
    if (msCover) artwork.push({ src: msCover, sizes: "512x512" });
    // Always keep a local fallback last: a cover that 404s or is slow leaves
    // an OS widget with an empty square, which reads as a broken app.
    artwork.push(
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" }
    );
    ms.metadata = new MediaMetadata({
      title: msTitle,
      artist: msArtist ?? "",
      album: "Madhyasth Darshan",
      artwork,
    });
  }, [msSilent, msTitle, msArtist, msCover]);

  // 2. The transport. Registered once for as long as something is playing and
  //    never re-registered — see the note above.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (msSilent) return;
    const ms = navigator.mediaSession;
    const el = audio();
    ms.setActionHandler("play", () => void el.play().catch(() => undefined));
    ms.setActionHandler("pause", () => el.pause());
    // Same 10s the bar's own buttons use, and the same clamping — the lock
    // screen should not be able to do something the app cannot.
    ms.setActionHandler("seekbackward", (d) => skipRef.current(-(d.seekOffset ?? SKIP_SECONDS)));
    ms.setActionHandler("seekforward", (d) => skipRef.current(d.seekOffset ?? SKIP_SECONDS));
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
  }, [msSilent, audio]);

  // 3. ⏮/⏭, which come and go with the chapter's neighbours. Kept apart from
  //    the transport so that gaining a "next chapter" cannot cost us play/pause.
  const hasPrev = Boolean(chapterNav?.prev);
  const hasNext = Boolean(chapterNav?.next);
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (msSilent) return;
    const ms = navigator.mediaSession;
    // Registered only when they lead somewhere: an inert ⏭ on the lock screen
    // is worse than no ⏭.
    ms.setActionHandler("previoustrack", hasPrev ? () => navRef.current?.prev?.() : null);
    ms.setActionHandler("nexttrack", hasNext ? () => navRef.current?.next?.() : null);
    return () => {
      ms.setActionHandler("previoustrack", null);
      ms.setActionHandler("nexttrack", null);
    };
  }, [msSilent, hasPrev, hasNext]);

  // Play/pause icon on the lock screen. Without this the OS keeps showing
  // whatever it last inferred, so pausing from inside the app leaves a ▶ that
  // is already playing — or the reverse.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = !source
      ? "none"
      : playing
        ? "playing"
        : "paused";
  }, [source, playing]);

  // 4. The lock screen's own scrub bar and its counting clock. It does not read
  //    our element; it reads this. Told in whole seconds, which is the finest
  //    thing the OS displays — the element ticks four times as often, and every
  //    one of those was a call the notification did not need.
  const positionSec = Math.floor(positionMs / 1000);
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    if (!ms.setPositionState) return;
    if (msSilent || durationMs <= 0) return;
    const duration = durationMs / 1000;
    try {
      ms.setPositionState({
        duration,
        position: Math.min(Math.max(0, positionSec), duration),
        playbackRate: rate > 0 ? rate : 1,
      });
    } catch {
      // some engines reject a state that disagrees with their own reading
    }
  }, [msSilent, positionSec, durationMs, rate]);

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
      audioModeOpen,
      openAudioMode,
      closeAudioMode,
      chapterNav,
      setChapterNav,
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
      audioModeOpen,
      openAudioMode,
      closeAudioMode,
      chapterNav,
    ]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
