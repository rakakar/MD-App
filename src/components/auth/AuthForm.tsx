"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useKeyboardInset } from "@/components/assistant/useKeyboardInset";
import { useAuth } from "@/components/auth/AuthProvider";
import { ArrowLeftIcon, BrandMark, InfoIcon } from "@/components/shell/icons";
import { track } from "@/lib/analytics";
import { googleLoginUrl, login, primeSession, signup } from "@/lib/me";
import { LAUNCH } from "@/lib/onboarding";
import { safeReturnPath } from "@/lib/routes";

const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH === "true";

/**
 * Where "Write to us" goes. A mail link, not the feedback sheet: the sheet
 * asks a signed-out reader to sign in first, which is the one thing someone
 * who has forgotten their password cannot do. Unset, the words stay but the
 * link does not — a link that goes nowhere is worse than none.
 */
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || null;

/** The field, resting and focused. 16px type so iOS does not zoom on focus. */
const FIELD =
  "mt-2 h-14 w-full rounded-tile border border-rule bg-card px-5 text-base text-ink " +
  "placeholder:text-ink-soft auth-field";

const LABEL = "block text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft";

/**
 * Sign in and Create account — the designer's comps of 22 Sep 2026.
 *
 * The launch artwork, washed back to paper, carries the app's name across the
 * top, so the one screen a reader reaches from inside a book still says whose
 * work this is. **When the keyboard is up the band gives its height back**:
 * on a 390×844 phone the resting layout puts the password field under the
 * keyboard, and a sign-in form whose second field you cannot see is the one
 * this replaced with a better picture. The name goes, the back pill and the
 * mark stay, and the form rises into the space.
 *
 * `useKeyboardInset` rather than `:focus-within`: a desktop has focus and no
 * keyboard, and collapsing the band there would be motion for no reason.
 */
export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const search = useSearchParams();
  const { onAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const keyboard = useKeyboardInset() > 0;

  // Back to what the reader was doing when they were asked to sign in, and
  // Originals when there is nothing to go back to — see SIGNED_IN_HOME. The
  // "Back to reading" pill and the post-sign-in landing are the same place.
  const next = safeReturnPath(search.get("next"));
  const login_ = mode === "login";
  const ready = email.trim() !== "" && password !== "";

  // prime the CSRF cookie so the first POST isn't rejected
  useEffect(() => {
    void primeSession().catch(() => undefined);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const res = login_ ? await login(email, password) : await signup(email, password);
      if (res.status === 200) {
        track(login_ ? "login" : "signup", { method: "email" });
        await onAuthenticated();
        router.replace(next);
      } else {
        setError(
          res.errors?.[0]?.message ??
            (login_
              ? "Sign-in failed — check your email and password."
              : "Sign-up failed — try a different email or a longer password.")
        );
      }
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-surface lg:py-10">
      <div className="mx-auto w-full max-w-md">
        {/* The band. Its height is the one thing the keyboard changes, so it
            is the one thing that transitions. */}
        <header
          className={`relative overflow-hidden border-b border-rule transition-[height] duration-300 ease-out lg:rounded-t-hero lg:border-x ${
            keyboard
              ? "h-[calc(max(env(safe-area-inset-top),1rem)+6rem)]"
              : "h-[calc(max(env(safe-area-inset-top),1rem)+14rem)]"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- the launch
              screen's own fixed asset; already fetched by anyone who has seen
              that screen, and next/image would re-encode it under a new URL. */}
          <img
            src="/brand/launch-mobile.webp"
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover object-[50%_36%]"
          />
          {/* Washed back to paper, and fully paper at the foot, so the band
              ends in the page rather than on an edge of photograph. */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, color-mix(in srgb, var(--color-surface) 62%, transparent) 0%, color-mix(in srgb, var(--color-surface) 66%, transparent) 55%, color-mix(in srgb, var(--color-surface) 92%, transparent) 100%)",
            }}
          />

          <Link
            href={next}
            className="absolute start-4 top-[calc(max(env(safe-area-inset-top),1rem)+0.5rem)] inline-flex min-h-11 items-center gap-2 rounded-full border border-rule bg-card/90 pe-4 ps-3.5 text-sm font-semibold text-ink-soft shadow-card backdrop-blur-sm transition-colors hover:bg-card"
          >
            <ArrowLeftIcon className="h-4 w-4 shrink-0" />
            Back to reading
          </Link>

          {/* The name. Hidden from the accessibility tree along with the
              picture while the keyboard is up, because it is not on screen. */}
          <div
            aria-hidden={keyboard || undefined}
            className={`absolute inset-x-6 bottom-9 flex flex-col items-center gap-1.5 text-center transition-opacity duration-200 ${
              keyboard ? "opacity-0" : "opacity-100"
            }`}
          >
            <p lang="hi" className="auth-name font-devanagari" style={{ color: "var(--ws-ink)" }}>
              {LAUNCH.founderLine}
            </p>
            <p className="launch-eyebrow font-semibold uppercase text-ink-soft">{LAUNCH.eyebrow}</p>
          </div>
        </header>

        <div className="px-6 pb-12 lg:rounded-b-hero lg:border-x lg:border-b lg:border-rule lg:bg-surface lg:px-8">
          {/* The mark sits on the band's edge — half on the picture, half on
              the page — with the launch screen's halo, held still. */}
          <div
            className={`relative shrink-0 transition-[width,height,margin] duration-300 ${
              keyboard ? "-mt-[1.125rem] h-9 w-9" : "-mt-[1.375rem] h-11 w-11"
            }`}
          >
            <span
              aria-hidden
              className="absolute -inset-[45%] rounded-full opacity-40"
              style={{
                background:
                  "radial-gradient(circle, color-mix(in srgb, var(--ws-color) 30%, transparent) 0%, transparent 70%)",
              }}
            />
            <BrandMark className="relative h-full w-full" />
          </div>

          <h1 className={`font-display text-[2rem] leading-tight text-ink transition-[margin] duration-300 ${keyboard ? "mt-3" : "mt-5"}`}>
            {login_ ? "Sign in" : "Create account"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {login_
              ? "Your bookmarks, notes and reading progress — on every device."
              : "Free account to sync bookmarks, notes and progress."}
          </p>

          <form onSubmit={submit} className="mt-6 flex flex-col gap-5" noValidate>
            <label className={LABEL}>
              Email
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                enterKeyHint="next"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${FIELD} normal-case tracking-normal font-normal`}
              />
            </label>

            <div>
              <label htmlFor="auth-password" className={LABEL}>
                Password
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={reveal ? "text" : "password"}
                  autoComplete={login_ ? "current-password" : "new-password"}
                  enterKeyHint="go"
                  placeholder="•••••••••"
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

            {error && (
              <p role="alert" className="rounded-tile border border-danger/30 bg-danger/8 px-4 py-3 text-sm text-danger">
                {error}
              </p>
            )}

            {/* Idle until both fields hold something, as drawn: a live
                button over two empty fields invites a press that can only
                fail. Busy keeps the filled look — the press was valid. */}
            <button
              type="submit"
              disabled={!ready || busy}
              className={`mt-2 min-h-14 w-full rounded-tile text-base font-bold transition-colors ${
                ready ? "text-on-accent hover:opacity-90 disabled:opacity-80" : "bg-canvas text-muted"
              }`}
              style={ready ? { background: "var(--ws-color)" } : undefined}
            >
              {busy ? "Please wait…" : login_ ? "Sign in" : "Create account"}
            </button>
          </form>

          {/* Google sign-in is built but dark for the alpha — there is no Google
              API project behind it yet, so the button would only ever produce an
              error. Set NEXT_PUBLIC_GOOGLE_AUTH=true once it is configured. */}
          {GOOGLE_ENABLED && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-ink-soft">
                <span className="h-px flex-1 bg-rule" /> or <span className="h-px flex-1 bg-rule" />
              </div>
              <button
                type="button"
                onClick={() => {
                  window.location.href = googleLoginUrl(next);
                }}
                className="min-h-14 w-full rounded-tile border border-rule bg-card text-base font-semibold text-ink"
              >
                Continue with Google
              </button>
            </>
          )}

          <p className="mt-5 text-center text-sm text-ink-soft">
            {login_ ? "New here?" : "Already have an account?"}{" "}
            <Link
              href={`${login_ ? "/signup" : "/login"}?next=${encodeURIComponent(next)}`}
              className="inline-flex min-h-11 items-center ps-1 font-bold"
              style={{ color: "var(--ws-ink)" }}
            >
              {login_ ? "Create account" : "Sign in"}
            </Link>
          </p>

          <div className="mt-4 flex gap-3 text-sm leading-relaxed text-ink-soft">
            <InfoIcon className="mt-0.5 h-5 w-5 shrink-0 text-muted" />
            {/* No self-service reset during the alpha: nothing can send mail
                yet, and a "forgot password" link that silently goes nowhere is
                worse than saying so. A known password can be changed in Settings. */}
            {login_ ? (
              <p>
                Forgot your password?{" "}
                {SUPPORT_EMAIL ? (
                  <a
                    href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Password reset — MD Study")}`}
                    className="font-medium underline-offset-2 hover:underline"
                    style={{ color: "var(--ws-ink)" }}
                  >
                    Write to us
                  </a>
                ) : (
                  "Write to us"
                )}{" "}
                — self-service reset isn&rsquo;t available yet in this alpha.
              </p>
            ) : (
              <p>Use at least 8 characters. You can change it later in Settings.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
