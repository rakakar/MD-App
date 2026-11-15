"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRoutePath } from "@/components/shell/useRoutePath";
import { profileDeferred } from "@/lib/profile";
import { welcomeHref } from "@/lib/routes";

/** Screens a reader may be on before either step is done. */
const AUTH = ["/login", "/signup", "/forgot-password"];

/**
 * Screens the profile step never interrupts: a chapter, a shared passage or
 * answer, a document being read, a Short. These are where shared links land,
 * and a form between a reader and the passage a friend sent them is the
 * wrong moment to ask (UX audit FR8). The email check still applies.
 */
const READING = /^\/(books\/[^/]+\/[^/]+|paras\/|a\/|shorts\/|library\/\d+\/read\/|me\/resources\/\d+\/read\/)/;

/**
 * **The two steps after signing up**, in this order — the first compulsory,
 * the second skippable since 15 Nov 2026 ("Not now", and never on a reading
 * screen; see `READING` and `deferProfile`):
 *
 *  1. an email sign-up proves its address (`email_verified`) — the mobile
 *     sign-up's WhatsApp code already proved its number;
 *  2. "A little about you" (`profile.complete`).
 *
 * A signed-in reader who owes either is sent to it from whatever screen they
 * open — after signing up, after signing in again having stopped half-way,
 * after Google sign-in one day. The server's flags decide, not the route they
 * came by, so nothing can skip them.
 *
 * Only signed-in readers: reading needs no account, and someone signed out
 * is never asked. Staff accounts are left alone. A server older than these
 * flags asks nothing, as before.
 *
 * Renders nothing; it only redirects.
 */
export function ProfileGate() {
  const router = useRouter();
  const path = useRoutePath();
  const { user, loading } = useAuth();
  const reader = !loading && !!user && user.user_type === "public";
  const owesEmail = reader && !!user?.email && user.email_verified === false;
  // "Not now" on the step lets it wait — see `deferProfile`.
  const owesProfile = reader && user?.profile?.complete === false && !profileDeferred(user);

  useEffect(() => {
    if (AUTH.includes(path)) return;
    const here = `${path}${window.location.search}`;
    if (owesEmail && path !== "/verify-email") {
      router.replace(`/verify-email?next=${encodeURIComponent(here)}`);
    } else if (!owesEmail && owesProfile && path !== "/welcome" && !READING.test(path)) {
      router.replace(welcomeHref(here));
    }
  }, [owesEmail, owesProfile, path, router]);

  return null;
}
