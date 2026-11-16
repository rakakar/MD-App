"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { CloseIcon } from "@/components/shell/icons";
import { SESSION_ENDED_KEY } from "@/lib/me";
import { signInHref } from "@/lib/routes";
import { useRoutePath } from "./useRoutePath";

/**
 * "You were signed out" — once, at the head of the next screen (15 Nov 2026,
 * UX audit FR10).
 *
 * When the server stops accepting a device's session, the app drops it and
 * the reader is a guest from then on. Nothing said so: the avatar turned into
 * a Sign in button and My Journey into its guest gate, which reads as the
 * notes being gone. They are not — they are on the account — and saying so is
 * the whole message. In the page's flow rather than floating, so it covers
 * nothing; gone for good when dismissed or when the reader signs in again.
 */
export function SessionEndedNotice() {
  const { user, loading } = useAuth();
  const path = useRoutePath();
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    if (loading) return;
    try {
      if (user) {
        localStorage.removeItem(SESSION_ENDED_KEY);
        setEnded(false);
      } else {
        setEnded(localStorage.getItem(SESSION_ENDED_KEY) === "1");
      }
    } catch {
      setEnded(false);
    }
  }, [user, loading]);

  if (!ended || user) return null;

  const dismiss = () => {
    try {
      localStorage.removeItem(SESSION_ENDED_KEY);
    } catch {
      // nothing to forget
    }
    setEnded(false);
  };

  return (
    <div role="status" className="mx-auto w-full max-w-3xl px-4 pt-3 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 rounded-card border border-rule bg-card py-2 ps-4 pe-1 shadow-card">
        <p className="min-w-0 flex-1 text-sm text-ink">
          You were signed out. Your notes and progress are safe on your account.
        </p>
        <Link
          href={signInHref(path)}
          className="flex min-h-11 shrink-0 items-center rounded-control px-3 text-sm font-semibold"
          style={{ color: "var(--ws-ink)" }}
        >
          Sign in
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-soft hover:bg-ink/5"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
