"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/shell/icons";
import { AccentScope } from "@/components/shell/WorkspaceProvider";
import { APP_ACCENT } from "@/lib/workspaceConfig";
import type { InputLang } from "./Composer";
import { getVoiceInfo, transcribe } from "@/lib/voice";
import type { VoiceInfo } from "@/lib/types";
import { unlockAnswerAudio } from "./answerVoice";
import { KeyboardIcon, MicIcon } from "./icons";

// The browser's own speech recogniser. Not in TypeScript's DOM lib, and
// prefixed in Chrome and Safari, so it is looked up rather than imported.
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function recogniser(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Whether a recording can be made and sent to the server instead. */
function canRecord(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

/**
 * Whether this device can take a spoken question at all — the mic button is
 * hidden if not. The browser's own recogniser, or failing that a recording
 * sent to `voice/transcribe/` (the Android app's WebView has no recogniser).
 */
export function canListen(): boolean {
  return recogniser() !== null || canRecord();
}

/** One look per page at what voice mode may do today; null when signed out or on error. */
let infoJob: Promise<VoiceInfo | null> | null = null;
function voiceInfo(): Promise<VoiceInfo | null> {
  infoJob ??= getVoiceInfo().catch(() => {
    infoJob = null;
    return null;
  });
  return infoJob;
}

/** How long a pause ends a question when hands-free, and how long nothing at all closes the sheet. */
const END_OF_QUESTION_MS = 1600;
const NOTHING_SAID_MS = 8000;

/**
 * 9 · Voice input.
 *
 * What is heard appears as it is heard, and nothing is asked until the reader
 * stops — the big button sends, the keyboard button hands the words to the box
 * to fix first, and × throws them away.
 *
 * **The comp's caption promised "Transcribed on device".** That is not ours to
 * promise: Chrome sends the audio to Google's recogniser, and which engine
 * Safari uses depends on the phone. The caption here says only what this app
 * controls — that nothing is *asked* until you stop.
 *
 * **Two ways to listen** (docs/product/Voice_Assistant.md D9): the browser's
 * recogniser where it exists, otherwise a recording sent to our server, which
 * transcribes it and keeps no audio. The BE can also say "always the server"
 * (`stt_mode`), for when its transcription proves better than the phone's.
 *
 * **Hands-free** ("Keep talking"): a pause ends the question and asks it, and
 * after the answer has been read aloud the sheet opens again by itself. Eight
 * seconds of nothing closes it.
 */
export function VoiceSheet({
  open,
  initialLang,
  onClose,
  onDone,
  handsFree = false,
  onHandsFree,
}: {
  open: boolean;
  initialLang: InputLang;
  onClose: () => void;
  /** `send` false means "put it in the box", true means "ask it" */
  onDone: (text: string, send: boolean) => void;
  handsFree?: boolean;
  onHandsFree?: (on: boolean) => void;
}) {
  const [lang, setLang] = useState<InputLang>(initialLang);
  const [heard, setHeard] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [how, setHow] = useState<"recognise" | "record" | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const heardRef = useRef("");
  const finishRef = useRef<(send: boolean) => void>(() => {});
  const handsFreeRef = useRef(handsFree);
  useEffect(() => {
    handsFreeRef.current = handsFree;
  }, [handsFree]);

  // Which way to listen: the recogniser unless the BE says server, or there is none.
  useEffect(() => {
    if (!open) {
      setHow(null);
      return;
    }
    const fallback = recogniser() ? "recognise" : canRecord() ? "record" : null;
    setHow(fallback);
    if (fallback === "recognise" && canRecord()) {
      void voiceInfo().then((info) => {
        if (info?.stt_mode === "server") setHow("record");
      });
    }
    if (!fallback) setError("This device cannot take a spoken question.");
  }, [open]);

  // Silence timers for hands-free: a pause after words asks; nothing at all closes.
  const quiet = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimers = () => {
    if (quiet.current) clearTimeout(quiet.current);
    if (idle.current) clearTimeout(idle.current);
    quiet.current = idle.current = null;
  };
  const heardSomething = () => {
    if (idle.current) clearTimeout(idle.current);
    idle.current = null;
    if (!handsFreeRef.current) return;
    if (quiet.current) clearTimeout(quiet.current);
    quiet.current = setTimeout(() => finishRef.current(true), END_OF_QUESTION_MS);
  };

  // ---- the browser's recogniser ----
  useEffect(() => {
    if (!open || how !== "recognise") return;
    const Ctor = recogniser();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = lang === "hi" ? "hi-IN" : "en-IN";
    r.interimResults = true;
    r.continuous = true;
    r.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      heardRef.current = text;
      setHeard(text);
      if (text.trim()) heardSomething();
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed")
        setError("The microphone is blocked for this site. Allow it in the browser’s settings.");
      else if (e.error !== "aborted" && e.error !== "no-speech") setError("Listening stopped.");
    };
    rec.current = r;
    setError(null);
    if (handsFreeRef.current) idle.current = setTimeout(onClose, NOTHING_SAID_MS);
    try {
      r.start();
    } catch {
      setError("Listening could not start.");
    }
    return () => {
      clearTimers();
      r.onresult = null;
      r.onerror = null;
      r.abort();
      rec.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lang, how]);

  // ---- a recording, transcribed by the server ----
  useEffect(() => {
    if (!open || how !== "record") return;
    let alive = true;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let raf = 0;
    let limit: ReturnType<typeof setTimeout> | null = null;
    setError(null);
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
      } catch {
        if (alive) setError("The microphone is blocked for this app. Allow it in settings.");
        return;
      }
      if (!alive) {
        stream.getTracks().forEach((tr) => tr.stop());
        return;
      }
      const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) =>
        MediaRecorder.isTypeSupported?.(m)
      );
      const r = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      (r as MediaRecorder & { chunks?: Blob[] }).chunks = chunks;
      r.start(250);
      recorder.current = r;

      // A level meter decides "speaking" vs "quiet", for hands-free.
      ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += ((v - 128) / 128) ** 2;
        if (Math.sqrt(sum / buf.length) > 0.04) heardSomething();
        raf = requestAnimationFrame(tick);
      };
      tick();
      if (handsFreeRef.current) idle.current = setTimeout(onClose, NOTHING_SAID_MS);
      const info = await voiceInfo();
      limit = setTimeout(() => finishRef.current(true), (info?.max_record_seconds ?? 60) * 1000);
    })();
    return () => {
      alive = false;
      clearTimers();
      if (limit) clearTimeout(limit);
      cancelAnimationFrame(raf);
      void ctx?.close().catch(() => {});
      if (recorder.current && recorder.current.state !== "inactive") {
        recorder.current.ondataavailable = null;
        recorder.current.onstop = null;
        recorder.current.stop();
      }
      recorder.current = null;
      stream?.getTracks().forEach((tr) => tr.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, how]);

  useEffect(() => {
    if (open) {
      setHeard("");
      heardRef.current = "";
      setTranscribing(false);
      setLang(initialLang);
    }
  }, [open, initialLang]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const finish = (send: boolean) => {
    clearTimers();
    // Sending means an answer will be read aloud; the tap that sends is the
    // only moment iOS lets us make that possible.
    if (send) unlockAnswerAudio();
    if (how === "record") {
      const r = recorder.current as (MediaRecorder & { chunks?: Blob[] }) | null;
      if (!r || transcribing) return;
      setTranscribing(true);
      r.onstop = () => {
        const blob = new Blob(r.chunks ?? [], { type: r.mimeType || "audio/webm" });
        if (blob.size < 1000) {
          onClose();
          return;
        }
        transcribe(blob, lang)
          .then((text) => (text.trim() ? onDone(text.trim(), send) : onClose()))
          .catch((e: { status?: number; data?: { detail?: string } }) => {
            setTranscribing(false);
            setError(
              e.status === 401 || e.status === 403
                ? "Sign in to ask by voice."
                : (e.data?.detail ?? "Could not hear that. Try again, or type.")
            );
          });
      };
      r.stop();
      recorder.current = null;
      return;
    }
    rec.current?.stop();
    const text = heardRef.current.trim();
    if (text) onDone(text, send);
    else onClose();
  };
  // Timers and the recording limit call the latest finish, not the first one.
  useEffect(() => {
    finishRef.current = finish;
  });

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <AccentScope color={APP_ACCENT}>
      <div className="fixed inset-0 z-60" role="dialog" aria-modal="true" aria-label="Voice input">
        <button type="button" aria-label="Cancel" onClick={onClose} className="ws-sheet-backdrop absolute inset-0 bg-black/50" />
        <div className="ws-sheet absolute inset-x-0 bottom-0 rounded-t-sheet bg-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 text-ink shadow-sheet lg:left-64">
          <div className="mx-auto max-w-xl">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold uppercase tracking-[0.09em]" style={{ color: "var(--ws-ink)" }} role="status">
                {error ? "Not listening" : transcribing ? "Hearing it back" : "Listening"}
              </p>
              <div className="flex gap-2" role="radiogroup" aria-label="Language you are speaking">
                {(["hi", "en"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    role="radio"
                    aria-checked={lang === l}
                    onClick={() => setLang(l)}
                    className={`min-h-11 rounded-full border px-4 text-sm ${
                      lang === l ? "border-transparent bg-ink font-semibold text-surface" : "border-rule bg-card"
                    }`}
                  >
                    {l === "hi" ? (
                      <span lang="hi" className="hi-note">
                        हिंदी
                      </span>
                    ) : (
                      "English"
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex h-16 items-end justify-center gap-1.5" aria-hidden>
              {!error &&
                [0.5, 0.8, 1, 0.6, 0.9, 0.45, 0.75, 0.55, 1, 0.4].map((h, i) => (
                  <span
                    key={i}
                    className="assistant-level"
                    style={{
                      height: `${h * 100}%`,
                      opacity: i % 2 ? 0.5 : 1,
                      animationDelay: `${(i % 5) * 0.12}s`,
                    }}
                  />
                ))}
            </div>

            <p
              lang={lang}
              className={`${lang === "hi" ? "hi" : ""} mt-4 min-h-16 text-center text-2xl leading-snug`}
              aria-live="polite"
            >
              {error ??
                (transcribing ? (
                  <span className="text-ink-soft">…</span>
                ) : heard ? (
                  heard
                ) : (
                  <span className="text-ink-soft">
                    {how === "record" ? "Speak now, then tap the mic…" : "Speak now…"}
                  </span>
                ))}
            </p>

            <div className="mt-6 flex items-center justify-center gap-6">
              <button
                type="button"
                onClick={onClose}
                aria-label="Cancel"
                className="flex h-16 w-16 items-center justify-center rounded-full border border-rule bg-card"
              >
                <CloseIcon className="h-6 w-6 text-ink-soft" />
              </button>
              <button
                type="button"
                onClick={() => finish(true)}
                aria-label="Stop and ask"
                className="flex h-20 w-20 items-center justify-center rounded-full text-white shadow-raised"
                style={{ background: "var(--ws-color)" }}
              >
                <MicIcon className="h-7 w-7" />
              </button>
              <button
                type="button"
                onClick={() => finish(false)}
                aria-label="Stop and edit in the box"
                className="flex h-16 w-16 items-center justify-center rounded-full border border-rule bg-card"
              >
                <KeyboardIcon className="h-6 w-6 text-ink-soft" />
              </button>
            </div>

            <div className="mt-5 flex flex-col items-center gap-3">
              {onHandsFree && (
                <label className="flex min-h-11 items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={handsFree}
                    onChange={(e) => onHandsFree(e.target.checked)}
                    className="h-5 w-5"
                  />
                  Keep talking — a pause asks, and I listen again after the answer
                </label>
              )}
              <p className="text-center text-sm text-ink-soft">
                {handsFree ? "A pause asks the question" : "Nothing is asked until you stop"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </AccentScope>,
    document.body
  );
}
