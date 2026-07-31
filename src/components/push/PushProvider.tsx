"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import {
  onForegroundMessage,
  refreshPushRegistration,
  type ForegroundMessage,
} from "@/lib/push";

const TOAST_MS = 8000;

/**
 * Two jobs, both invisible until they aren't.
 *
 * 1. Re-register this device's token on every app start where permission is
 *    already granted. FCM rotates tokens, and this is the only moment we would
 *    ever find out — a reader whose token changed would otherwise just stop
 *    receiving things, with nothing anywhere saying so. It also refreshes
 *    `last_seen_at`, which is what makes the panel's audience count mean
 *    something.
 *
 * 2. Show a message that arrives while the app is open. The service worker
 *    hands those over instead of raising a system notification (an OS banner
 *    sliding over the screen the reader is already looking at helps nobody),
 *    so this is where they surface.
 */
export function PushProvider() {
  const router = useRouter();
  const [message, setMessage] = useState<ForegroundMessage | null>(null);

  useEffect(() => {
    void refreshPushRegistration();
  }, []);

  useEffect(() => {
    return onForegroundMessage(setMessage);
  }, []);

  // Auto-dismiss. Restarted whenever a newer message replaces this one.
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [message]);

  const open = useCallback(() => {
    if (!message) return;
    const url = message.clickUrl || "/";
    setMessage(null);
    track("push_notification_click");
    // Same-origin app paths stay in the SPA; anything absolute and external
    // leaves, which is the only correct thing to do with a link to elsewhere.
    if (url.startsWith("/")) router.push(url);
    else window.location.href = url;
  }, [message, router]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      // Above the player bar and the bottom nav, clear of the home indicator —
      // the same band the service-worker update prompt uses.
      className="fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 lg:bottom-6"
    >
      <div className="flex w-full max-w-sm items-start gap-3 rounded-2xl border border-rule bg-white p-3 shadow-lg">
        <span aria-hidden className="text-lg leading-none">
          🔔
        </span>
        <button type="button" onClick={open} className="min-w-0 flex-1 text-left">
          <span lang="hi" className="hi block truncate text-sm font-semibold text-ink">
            {message.title}
          </span>
          <span lang="hi" className="hi mt-0.5 block line-clamp-2 text-xs text-ink-soft">
            {message.body}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMessage(null)}
          aria-label="Dismiss notification"
          className="shrink-0 rounded-full px-2 py-0.5 text-ink-soft"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
