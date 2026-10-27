"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { FIELD, LABEL } from "@/components/auth/fields";

const CODE_LENGTH = 6;
/** Seconds before "Send a new code" wakes up — the BE refuses sooner. */
const RESEND_AFTER = 30;

/**
 * Six digits, typed or pasted — every code the app sends has this shape, by
 * email or WhatsApp, to sign in, to verify, to reset. Submits itself at the
 * sixth digit.
 *
 * `onSubmit` and `onResend` answer with an error to show, or null. `footer`
 * is the screen's own way out (sign out, use a different email, cancel).
 */
export function CodeEntry({
  sentTo,
  via,
  onSubmit,
  onResend,
  footer,
  idPrefix = "code",
}: {
  /** the address or number the code went to, as the reader knows it */
  sentTo: string;
  via: "email" | "whatsapp";
  onSubmit: (code: string) => Promise<string | null>;
  onResend: () => Promise<string | null>;
  footer?: ReactNode;
  idPrefix?: string;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(RESEND_AFTER);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
  }, []);

  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  const submit = async (value: string) => {
    if (value.length !== CODE_LENGTH || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const err = await onSubmit(value);
    if (err) {
      setError(err);
      setCode("");
      input.current?.focus();
    }
    setBusy(false);
  };

  const resend = async () => {
    if (wait > 0 || busy) return;
    setBusy(true);
    setError(null);
    const err = await onResend();
    if (err) setError(err);
    else {
      setNotice("A new code is on its way.");
      setWait(RESEND_AFTER);
    }
    setBusy(false);
  };

  const ready = code.length === CODE_LENGTH;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit(code);
      }}
      className="flex flex-col gap-5"
    >
      <p className="text-sm leading-relaxed text-ink-soft">
        {via === "email" ? "We’ve emailed a 6-digit code to " : "We’ve sent a 6-digit code on WhatsApp to "}
        <strong className="font-bold text-ink">{sentTo}</strong>.
        {via === "email" && " It can take a minute — check Spam if it doesn’t arrive."}
      </p>

      <label htmlFor={`${idPrefix}-input`} className={LABEL}>
        Code
        <input
          id={`${idPrefix}-input`}
          ref={input}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          enterKeyHint="done"
          placeholder="6-digit code"
          value={code}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH);
            setCode(value);
            if (value.length === CODE_LENGTH) void submit(value);
          }}
          className={`${FIELD} ${code ? "tracking-[0.3em]" : ""}`}
        />
      </label>

      {error && (
        <p role="alert" className="rounded-tile border border-danger/30 bg-danger/8 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-ink-soft">
          {notice}
        </p>
      )}

      <button
        type="submit"
        disabled={!ready || busy}
        className={`min-h-14 w-full rounded-tile text-base font-bold transition-colors ${
          ready ? "text-on-accent hover:opacity-90 disabled:opacity-80" : "bg-canvas text-ink-soft"
        }`}
        style={ready ? { background: "var(--ws-color)" } : undefined}
      >
        {busy ? "Please wait…" : "Continue"}
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        {footer ?? <span />}
        <button
          type="button"
          onClick={() => void resend()}
          disabled={wait > 0 || busy}
          className="inline-flex min-h-11 items-center font-bold disabled:font-semibold disabled:text-ink-soft"
          style={wait > 0 ? undefined : { color: "var(--ws-ink)" }}
        >
          {wait > 0 ? `Send a new code in ${wait}s` : "Send a new code"}
        </button>
      </div>
    </form>
  );
}
