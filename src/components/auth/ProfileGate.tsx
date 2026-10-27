"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRoutePath } from "@/components/shell/useRoutePath";
import { welcomeHref } from "@/lib/routes";

/** Where a reader may be while their details are unfinished. */
const OPEN = new Set(["/welcome", "/login", "/signup", "/forgot-password"]);

/**
 * **"A little about you" is not optional.** A signed-in reader whose card the
 * server says is incomplete (`profile.complete`) is sent to it from whatever
 * screen they open — after signing up, after signing in again having closed
 * the app half-way, after Google sign-in one day. Not "the screen after
 * signup": the server's flag, so no route into the app can skip it.
 *
 * Only signed-in readers: reading needs no account, and someone signed out is
 * never asked. Staff accounts have no card to finish. A server older than the
 * card (no `profile`) asks nothing, as before.
 *
 * Renders nothing; it only redirects.
 */
export function ProfileGate() {
  const router = useRouter();
  const path = useRoutePath();
  const { user, loading } = useAuth();
  const owed = !loading && !!user && user.user_type === "public" && user.profile?.complete === false;

  useEffect(() => {
    if (!owed || OPEN.has(path)) return;
    router.replace(welcomeHref(`${path}${window.location.search}`));
  }, [owed, path, router]);

  return null;
}
