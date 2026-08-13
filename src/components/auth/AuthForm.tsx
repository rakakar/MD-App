"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { track } from "@/lib/analytics";
import { googleLoginUrl, login, primeSession, signup } from "@/lib/me";
import { ctaPrimary } from "@/components/ui";

const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH === "true";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const search = useSearchParams();
  const { onAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const next = search.get("next") ?? "/me";

  // prime the CSRF cookie so the first POST isn't rejected
  useEffect(() => {
    void primeSession().catch(() => undefined);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res =
        mode === "login" ? await login(email, password) : await signup(email, password);
      if (res.status === 200) {
        track(mode === "login" ? "login" : "signup", { method: "email" });
        await onAuthenticated();
        router.replace(next);
      } else {
        setError(
          res.errors?.[0]?.message ??
            (mode === "login"
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
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-10">
      <Link href="/" className="mb-8 text-sm text-ink-soft">
        ← Back to reading
      </Link>
      <h1 className="text-2xl font-bold">
        {mode === "login" ? "Sign in" : "Create account"}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        {mode === "login"
          ? "Your bookmarks, notes and reading progress — on every device."
          : "Free account to sync bookmarks, notes and progress."}
      </p>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
        <label className="text-sm font-medium">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-rule bg-card p-2.5 text-sm outline-none focus:border-(--ws-color)"
          />
        </label>
        <label className="text-sm font-medium">
          Password
          <input
            type="password"
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-rule bg-card p-2.5 text-sm outline-none focus:border-(--ws-color)"
          />
        </label>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className={`mt-2 ${ctaPrimary}`}
          style={{ background: "var(--ws-color)" }}
        >
          {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>

        {/* No self-service reset during the alpha: nothing can send mail yet,
            and a "forgot password" link that silently goes nowhere is worse
            than saying so. A known password can be changed in Settings. */}
        <p className="text-xs text-ink-soft">
          {mode === "login"
            ? "Forgot your password? Write to us — self-service reset isn't available yet in this alpha."
            : "Use at least 8 characters. You can change it later in Settings."}
        </p>
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
            className="rounded-full border border-rule bg-card px-4 py-2.5 text-sm font-semibold"
          >
            Continue with Google
          </button>
        </>
      )}

      <p className="mt-6 text-center text-sm text-ink-soft">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold underline">
              Create account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
