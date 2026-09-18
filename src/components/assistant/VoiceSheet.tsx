"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/shell/icons";
import { AccentScope } from "@/components/shell/WorkspaceProvider";
import { APP_ACCENT } from "@/lib/workspaceConfig";
import type { InputLang } from "./Composer";
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

/** Whether this browser can listen at all — the mic button is hidden if not. */
export function canListen(): boolean {
  return recogniser() !== null;
}

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
 */
export function VoiceSheet({
  open,
  initialLang,
  onClose,
  onDone,
}: {
  open: boolean;
  initialLang: InputLang;
  onClose: () => void;
  /** `send` false means "put it in the box", true means "ask it" */
  onDone: (text: string, send: boolean) => void;
}) {
  const [lang, setLang] = useState<InputLang>(initialLang);
  const [heard, setHeard] = useState("");
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const heardRef = useRef("");

  useEffect(() => {
    if (!open) return;
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
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed")
        setError("The microphone is blocked for this site. Allow it in the browser’s settings.");
      else if (e.error !== "aborted" && e.error !== "no-speech") setError("Listening stopped.");
    };
    rec.current = r;
    setError(null);
    try {
      r.start();
    } catch {
      setError("Listening could not start.");
    }
    return () => {
      r.onresult = null;
      r.onerror = null;
      r.abort();
      rec.current = null;
    };
  }, [open, lang]);

  useEffect(() => {
    if (open) {
      setHeard("");
      heardRef.current = "";
      setLang(initialLang);
    }
  }, [open, initialLang]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const finish = (send: boolean) => {
    rec.current?.stop();
    const text = heardRef.current.trim();
    if (text) onDone(text, send);
    else onClose();
  };

  return createPortal(
    <AccentScope color={APP_ACCENT}>
      <div className="fixed inset-0 z-60" role="dialog" aria-modal="true" aria-label="Voice input">
        <button type="button" aria-label="Cancel" onClick={onClose} className="ws-sheet-backdrop absolute inset-0 bg-black/50" />
        <div className="ws-sheet absolute inset-x-0 bottom-0 rounded-t-sheet bg-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 text-ink shadow-sheet lg:left-64">
          <div className="mx-auto max-w-xl">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold uppercase tracking-[0.09em]" style={{ color: "var(--ws-ink)" }} role="status">
                {error ? "Not listening" : "Listening"}
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
              {error ?? (heard || <span className="text-ink-soft">Speak now…</span>)}
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

            <p className="mt-5 text-center text-sm text-ink-soft">
              Nothing is asked until you stop
            </p>
          </div>
        </div>
      </div>
    </AccentScope>,
    document.body
  );
}
