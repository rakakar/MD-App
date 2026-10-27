"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { CodeEntry } from "@/components/auth/CodeEntry";
import { AppAccent } from "@/components/shell/WorkspaceProvider";
import { confirmVerify, requestVerify, verifyErrorOf } from "@/lib/me";
import { safeReturnPath, signInHref } from "@/lib/routes";

/**
 * **Verify your email** — the step an email sign-up passes before anything
 * else, as a mobile sign-up passes its WhatsApp code. A six-digit code goes
 * to the address on arrival; entering it proves the address is theirs.
 *
 * `ProfileGate` sends a signed-in reader here from any screen while their
 * sign-in email is unproved, and the profile step follows. The only way out
 * is Sign out: reading stays open to them signed out.
 */
export function VerifyEmailStep() {
  const router = useRouter();
  const search = useSearchParams();
  // The profile step is the usual next stop, carrying the reader's own `next`
  // inside it — kept, where safeReturnPath would send them home instead.
  const raw = search.get("next");
  const next = raw && /^\/welcome(?:$|\?)/.test(raw) ? raw : safeReturnPath(raw);
  const { user, loading, refresh, logout } = useAuth();
  const [sendError, setSendError] = useState<string | null>(null);
  const asked = useRef(false);

  const done = async () => {
    await refresh();
    router.replace(next);
  };

  const send = async (): Promise<string | null> => {
    try {
      await requestVerify("email");
      return null;
    } catch (e) {
      const err = verifyErrorOf(e);
      if (err.code === "verified") {
        void done();
        return null;
      }
      // just sent one — the reader is already holding a good code
      if (err.code === "too_soon") return null;
      return err.message;
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(signInHref(next));
      return;
    }
    if (user.email_verified || !user.email) {
      router.replace(next);
      return;
    }
    if (asked.current) return;
    asked.current = true;
    void send().then(setSendError);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on arrival
  }, [loading, user]);

  if (!user || !user.email || user.email_verified) return null;

  const confirm = async (code: string): Promise<string | null> => {
    try {
      await confirmVerify("email", code);
      await done();
      return null;
    } catch (e) {
      return verifyErrorOf(e).message;
    }
  };

  const signOut = async () => {
    await logout();
    router.replace("/");
  };

  return (
    <AppAccent>
      <div className="min-h-dvh bg-surface lg:flex lg:items-center lg:justify-center lg:px-8 lg:py-10">
        <div className="mx-auto w-full max-w-md px-6 pb-10 pt-[calc(max(env(safe-area-inset-top),1rem)+2.5rem)] lg:rounded-hero lg:border lg:border-rule lg:bg-card lg:px-12 lg:py-14 lg:shadow-card">
          <h1 className="mt-4 font-display text-[2rem] leading-tight text-ink">Verify your email</h1>
          <p className="mt-2 mb-6 text-sm leading-relaxed text-ink-soft">
            One quick step, so shivir updates and password resets reach you and nobody else.
          </p>
          {sendError && (
            <p role="alert" className="mb-5 rounded-tile border border-danger/30 bg-danger/8 px-4 py-3 text-sm text-danger">
              {sendError}
            </p>
          )}
          <CodeEntry
            sentTo={user.email}
            via="email"
            onSubmit={confirm}
            onResend={send}
            footer={
              <button
                type="button"
                onClick={() => void signOut()}
                className="inline-flex min-h-11 items-center font-semibold text-ink-soft"
              >
                Not now? Sign out
              </button>
            }
          />
        </div>
      </div>
    </AppAccent>
  );
}
