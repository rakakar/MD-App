"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { FIELD, LABEL } from "@/components/auth/fields";
import { ArrowLeftIcon } from "@/components/shell/icons";
import { AppAccent } from "@/components/shell/WorkspaceProvider";
import { requestPasswordReset, resetPassword } from "@/lib/me";
import { safeReturnPath } from "@/lib/routes";

type Step = { kind: "email" } | { kind: "code"; token: string } | { kind: "done" };

/**
 * **Forgot password** — a six-digit code to the account's email, then a new
 * password, on one screen. The same code shape as every other code the app
 * sends; nothing to follow out of the app to a link.
 *
 * Mobile-number readers have no password and never come here: each sign-in
 * is a fresh WhatsApp code.
 */
export function ForgotPassword() {
  const router = useRouter();
  const search = useSearchParams();
  const next = safeReturnPath(search.get("next"));
  const { onAuthenticated } = useAuth();
  const [step, setStep] = useState<Step>({ kind: "email" });
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await requestPasswordReset(email.trim());
      if (res.status === 401 && res.meta?.session_token) {
        setStep({ kind: "code", token: res.meta.session_token });
        setCode("");
      } else if (res.status === 429) {
        setError("Too many codes asked for. Please wait a few minutes and try again.");
      } else {
        setError(res.errors?.[0]?.message ?? "Couldn't send the code. Please try again.");
      }
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step.kind !== "code" || code.length !== 6 || password.length < 8 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await resetPassword(code, password, step.token);
      if (res.status === 200) {
        // allauth signed them in with it — straight back to reading
        await onAuthenticated();
        router.replace(next);
      } else if (res.status === 401) {
        setStep({ kind: "done" });
      } else if (res.status === 409) {
        setStep({ kind: "email" });
        setError("That code has expired. Please ask for a new one.");
      } else {
        const err = res.errors?.[0];
        setError(
          err?.param === "key"
            ? "That code doesn't match. Check your email and try again."
            : (err?.message ?? "Couldn't change the password. Please try again.")
        );
      }
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const ready = step.kind === "email" ? email.trim() !== "" : code.length === 6 && password.length >= 8;

  return (
    <AppAccent>
      <div className="min-h-dvh bg-surface lg:flex lg:items-center lg:justify-center lg:px-8 lg:py-10">
        <div className="mx-auto w-full max-w-md px-6 pb-10 pt-[calc(max(env(safe-area-inset-top),1rem)+1.5rem)] lg:rounded-hero lg:border lg:border-rule lg:bg-card lg:px-12 lg:py-14 lg:shadow-card">
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink-soft"
          >
            <ArrowLeftIcon className="h-4 w-4 shrink-0" />
            Back to sign in
          </Link>

          <h1 className="mt-4 font-display text-[2rem] leading-tight text-ink">
            {step.kind === "done" ? "Password changed" : "Reset your password"}
          </h1>

          {step.kind === "done" ? (
            <>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Sign in with your email and the new password.
              </p>
              <Link
                href={`/login?next=${encodeURIComponent(next)}`}
                className="mt-6 flex min-h-14 w-full items-center justify-center rounded-tile text-base font-bold text-on-accent"
                style={{ background: "var(--ws-color)" }}
              >
                Sign in
              </Link>
            </>
          ) : (
            <form onSubmit={step.kind === "email" ? send : reset} noValidate className="mt-6 flex flex-col gap-5">
              {step.kind === "email" ? (
                <>
                  <p className="text-sm leading-relaxed text-ink-soft">
                    Enter the email you sign in with. We&rsquo;ll email you a 6-digit code.
                  </p>
                  <label className={LABEL}>
                    Email
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      enterKeyHint="go"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`${FIELD} normal-case tracking-normal font-normal`}
                    />
                  </label>
                </>
              ) : (
                <>
                  <p className="text-sm leading-relaxed text-ink-soft">
                    We&rsquo;ve emailed a code to <strong className="font-bold text-ink">{email.trim()}</strong>. It can
                    take a minute — check Spam if it doesn&rsquo;t arrive.
                  </p>
                  <label className={LABEL}>
                    Code
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      enterKeyHint="next"
                      placeholder="6-digit code"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className={`${FIELD} ${code ? "tracking-[0.3em]" : ""}`}
                    />
                  </label>
                  <div>
                    <label htmlFor="reset-password" className={LABEL}>
                      New password
                    </label>
                    <div className="relative">
                      <input
                        id="reset-password"
                        type={reveal ? "text" : "password"}
                        autoComplete="new-password"
                        enterKeyHint="go"
                        placeholder="At least 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${FIELD} pe-20`}
                      />
                      <button
                        type="button"
                        onClick={() => setReveal((r) => !r)}
                        aria-pressed={reveal}
                        aria-label={reveal ? "Hide password" : "Show password"}
                        className="absolute end-1.5 top-[calc(50%+0.25rem)] inline-flex min-h-11 -translate-y-1/2 items-center px-3.5 text-sm font-bold"
                        style={{ color: "var(--ws-ink)" }}
                      >
                        {reveal ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {error && (
                <p role="alert" className="rounded-tile border border-danger/30 bg-danger/8 px-4 py-3 text-sm text-danger">
                  {error}
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
                {busy ? "Please wait…" : step.kind === "email" ? "Send code" : "Change password"}
              </button>

              {step.kind === "code" && (
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={busy}
                  className="inline-flex min-h-11 items-center self-center text-sm font-bold"
                  style={{ color: "var(--ws-ink)" }}
                >
                  Send a new code
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </AppAccent>
  );
}
