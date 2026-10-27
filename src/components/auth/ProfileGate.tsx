"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRoutePath } from "@/components/shell/useRoutePath";
import { welcomeHref } from "@/lib/routes";

/** Screens a reader may be on before either step is done. */
const AUTH = ["/login", "/signup", "/forgot-password"];

/**
 * **The two steps after signing up are not optional**, in this order:
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
  const owesProfile = reader && user?.profile?.complete === false;

  useEffect(() => {
    if (AUTH.includes(path)) return;
    const here = `${path}${window.location.search}`;
    if (owesEmail && path !== "/verify-email") {
      router.replace(`/verify-email?next=${encodeURIComponent(here)}`);
    } else if (!owesEmail && owesProfile && path !== "/welcome") {
      router.replace(welcomeHref(here));
    }
  }, [owesEmail, owesProfile, path, router]);

  return null;
}
