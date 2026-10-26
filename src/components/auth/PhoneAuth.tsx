"use client";

// Sign in — or sign up — with a mobile number, the code arriving on WhatsApp.
//
// For readers with no email, or none they remember: email stays the front
// door and this is the way round it. Written for someone who may be slow with
// a phone: +91 is already there, the code fills itself in when pasted and
// submits itself at the sixth digit, and "Paste code" saves the long-press.
//
// One path whichever page it starts on: ask for a sign-in code first; if the
// number has no account the BE says so (`unknown_phone`) and the reader is
// offered — or, on Create account, simply given — a new one. A reader who
// lands on the wrong page is never told "already registered" or "not found"
// and left there.

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { FIELD, LABEL } from "@/components/auth/fields";
import { track } from "@/lib/analytics";
import {
  confirmPhoneCode,
  displayPhone,
  requestPhoneCode,
  resendNewPhoneCode,
  resendPhoneCode,
  signupWithPhone,
  verifyNewPhone,
  type AllauthResponse,
} from "@/lib/me";
import { welcomeHref } from "@/lib/routes";

const CODE_LENGTH = 6;
/** The BE allows one resend per 30s for a new number; the same for both keeps it simple. */
const RESEND_AFTER = 30;

type Step =
  | { kind: "number" }
  /** `flow`: a returning reader's sign-in, or a new account's first code */
  | { kind: "code"; flow: "login" | "signup"; token: string };

function errorOf(res: AllauthResponse, fallback: string): string {
  const err = res.errors?.[0];
  if (err?.code === "too_many_login_attempts" || res.status === 429) {
    return "Too many codes asked for this number. Please wait a few minutes and try again.";
  }
  return err?.message ?? fallback;
}

/** A pending code flow answers 401 and hands back the flow's token. */
const pendingToken = (res: AllauthResponse) =>
  res.status === 401 ? (res.meta?.session_token ?? null) : null;

export function PhoneAuth({
  mode,
  next,
  onUseEmail,
}: {
  mode: "login" | "signup";
  /** where to go once signed in */
  next: string;
  onUseEmail: () => void;
}) {
  const router = useRouter();
  const { onAuthenticated } = useAuth();
  const [digits, setDigits] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>({ kind: "number" });
  const [unknown, setUnknown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const codeInput = useRef<HTMLInputElement>(null);

  const phone = `+91${digits}`;
  const validNumber = /^[6-9]\d{9}$/.test(digits);

  // the resend countdown
  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  const toCode = (flow: "login" | "signup", token: string) => {
    setStep({ kind: "code", flow, token });
    setCode("");
    setWait(RESEND_AFTER);
    setNotice(null);
    window.setTimeout(() => codeInput.current?.focus(), 50);
  };

  const create = async () => {
    const res = await signupWithPhone(phone);
    const token = pendingToken(res);
    if (token) toCode("signup", token);
    else setError(errorOf(res, "Couldn't create the account. Please try again."));
  };

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validNumber || busy) return;
    setBusy(true);
    setError(null);
    setUnknown(false);
    try {
      const res = await requestPhoneCode(phone);
      const token = pendingToken(res);
      if (token) toCode("login", token);
      else if (res.errors?.[0]?.code === "unknown_phone") {
        // On Create account that is the whole point; on Sign in, ask first —
        // a mistyped digit should not quietly make a second account.
        if (mode === "signup") await create();
        else setUnknown(true);
      } else setError(errorOf(res, "Couldn't send the code. Please try again."));
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const createAccount = async () => {
    setBusy(true);
    setError(null);
    setUnknown(false);
    try {
      await create();
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value: string) => {
    if (step.kind !== "code" || value.length !== CODE_LENGTH || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res =
        step.flow === "login"
          ? await confirmPhoneCode(value, step.token)
          : await verifyNewPhone(value, step.token);
      if (res.status === 200) {
        track(step.flow, { method: "whatsapp" });
        await onAuthenticated();
        router.replace(welcomeHref(next));
        return;
      }
      if (res.errors?.[0]?.code === "incorrect_code") {
        setError("That code doesn't match. Check WhatsApp and try again.");
        setCode("");
        codeInput.current?.focus();
      } else {
        // the flow is gone — expired, or too many wrong tries
        setStep({ kind: "number" });
        setError(errorOf(res, "That code has expired. Please ask for a new one."));
      }
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (step.kind !== "code" || wait > 0 || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res =
        step.flow === "login" ? await resendPhoneCode(step.token) : await resendNewPhoneCode(step.token);
      if (res.status === 200) {
        setNotice("A new code is on its way.");
        setWait(RESEND_AFTER);
      } else if (res.status === 409) {
        setStep({ kind: "number" });
        setError("Please ask for a new code.");
      } else setError(errorOf(res, "Couldn't send the code. Please try again."));
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const onCode = (raw: string) => {
    const value = raw.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(value);
    if (value.length === CODE_LENGTH) void verify(value);
  };

  const canPaste = typeof navigator !== "undefined" && !!navigator.clipboard?.readText;
  const paste = async () => {
    try {
      onCode(await navigator.clipboard.readText());
    } catch {
      codeInput.current?.focus(); // permission refused: the field takes a normal paste
    }
  };

  const messages = (
    <>
      {error && (
        <p role="alert" className="rounded-tile border border-danger/30 bg-danger/8 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-tile border border-rule bg-inset px-4 py-3 text-sm text-ink">
          {notice}
        </p>
      )}
    </>
  );

  const primary = (enabled: boolean) =>
    `mt-2 min-h-14 w-full rounded-tile text-base font-bold transition-colors ${
      enabled ? "text-on-accent hover:opacity-90 disabled:opacity-80" : "bg-canvas text-ink-soft"
    }`;

  const textLink = "inline-flex min-h-11 items-center font-bold";

  if (step.kind === "code") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void verify(code);
        }}
        className="mt-6 flex flex-col gap-5"
        noValidate
      >
        <p className="text-sm leading-relaxed text-ink">
          We sent a {CODE_LENGTH}-digit code on WhatsApp to{" "}
          <span className="font-semibold whitespace-nowrap">{displayPhone(phone)}</span>. Open WhatsApp,
          tap <span className="font-semibold">Copy code</span>, then come back here.
        </p>

        <div>
          <label htmlFor="auth-code" className={LABEL}>
            Code
          </label>
          <div className="relative">
            <input
              id="auth-code"
              ref={codeInput}
              inputMode="numeric"
              autoComplete="one-time-code"
              enterKeyHint="go"
              maxLength={CODE_LENGTH + 4}
              placeholder="••••••"
              value={code}
              onChange={(e) => onCode(e.target.value)}
              className={`${FIELD} ${canPaste ? "pe-24" : ""} text-center text-2xl font-semibold tracking-[0.4em]`}
            />
            {canPaste && (
              <button
                type="button"
                onClick={paste}
                className="absolute end-1.5 top-[calc(50%+0.25rem)] inline-flex min-h-11 -translate-y-1/2 items-center px-3.5 text-sm font-bold"
                style={{ color: "var(--ws-ink)" }}
              >
                Paste
              </button>
            )}
          </div>
        </div>

        {messages}

        <button
          type="submit"
          disabled={code.length !== CODE_LENGTH || busy}
          className={primary(code.length === CODE_LENGTH)}
          style={code.length === CODE_LENGTH ? { background: "var(--ws-color)" } : undefined}
        >
          {busy ? "Please wait…" : "Continue"}
        </button>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <button
            type="button"
            onClick={() => {
              setStep({ kind: "number" });
              setError(null);
              setNotice(null);
            }}
            className={`${textLink} text-ink-soft`}
          >
            Change number
          </button>
          <button
            type="button"
            onClick={resend}
            disabled={wait > 0 || busy}
            className={`${textLink} disabled:font-medium disabled:text-ink-soft`}
            style={wait > 0 ? undefined : { color: "var(--ws-ink)" }}
          >
            {wait > 0 ? `Send again in ${wait}s` : "Send code again"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="mt-6 flex flex-col gap-5" noValidate>
      <div>
        <label htmlFor="auth-phone" className={LABEL}>
          Mobile number
        </label>
        <div className="relative">
          <span
            aria-hidden
            className="pointer-events-none absolute start-5 top-[calc(50%+0.25rem)] -translate-y-1/2 text-base text-ink-soft"
          >
            +91
          </span>
          <input
            id="auth-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            enterKeyHint="go"
            aria-describedby="auth-phone-help"
            placeholder="98765 43210"
            value={digits}
            onChange={(e) => {
              // a pasted "+91 98765-43210" or "098765…" still lands as ten digits
              let d = e.target.value.replace(/\D/g, "");
              if (d.length > 10 && d.startsWith("91")) d = d.slice(2);
              if (d.length > 10 && d.startsWith("0")) d = d.slice(1);
              setDigits(d.slice(0, 10));
              setUnknown(false);
            }}
            className={`${FIELD} ps-16 tracking-wide`}
          />
        </div>
        <p id="auth-phone-help" className="mt-2 text-xs text-ink-soft">
          Indian mobile numbers only. The code comes on WhatsApp.
        </p>
      </div>

      {messages}

      {unknown ? (
        <div className="rounded-tile border border-rule bg-inset px-4 py-4 text-sm text-ink">
          <p>
            There is no account with <span className="font-semibold">{displayPhone(phone)}</span> yet.
          </p>
          <button
            type="button"
            onClick={createAccount}
            disabled={busy}
            className={primary(true)}
            style={{ background: "var(--ws-color)" }}
          >
            {busy ? "Please wait…" : "Create account with this number"}
          </button>
        </div>
      ) : (
        <button
          type="submit"
          disabled={!validNumber || busy}
          className={primary(validNumber)}
          style={validNumber ? { background: "var(--ws-color)" } : undefined}
        >
          {busy ? "Please wait…" : "Send code on WhatsApp"}
        </button>
      )}

      <p className="text-center text-sm text-ink-soft">
        Have an email?{" "}
        <button type="button" onClick={onUseEmail} className={`${textLink} ps-1`} style={{ color: "var(--ws-ink)" }}>
          {mode === "login" ? "Sign in with email" : "Sign up with email"}
        </button>
      </p>
    </form>
  );
}
