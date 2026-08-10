"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import {
  onForegroundMessage,
  refreshPushRegistration,
  type ForegroundMessage,
} from "@/lib/push";
import { onNativePushReceived, onNativePushTapped } from "@/lib/push-native";

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

  /**
   * Follow a notification's link.
   *
   * An absolute URL pointing at this very app is treated as the app path it
   * is. That case is not hypothetical — it is what the panel produces when
   * someone pastes the address out of their browser, and handing it to
   * `location.href` would reload the whole app to reach a page the router
   * could have shown. Inside the shell it is worse than slow: a full document
   * load throws away the WebView's history and the back gesture with it.
   */
  const go = useCallback(
    (raw: string) => {
      const url = raw || "/";
      track("push_notification_click");
      let path = url.startsWith("/") ? url : "";
      if (!path) {
        try {
          const parsed = new URL(url);
          if (parsed.origin === window.location.origin) {
            path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
          }
        } catch {
          // Not a URL at all. Fall through and let the browser refuse it
          // visibly rather than swallowing a bad link silently.
        }
      }
      // Genuinely elsewhere: leave, which is the only correct thing to do.
      if (path) router.push(path);
      else window.location.href = url;
    },
    [router]
  );

  const open = useCallback(() => {
    if (!message) return;
    const url = message.clickUrl || "/";
    setMessage(null);
    go(url);
  }, [message, go]);

  // The same two things again, for the shells. A separate effect because they
  // come from a native plugin rather than a service worker, and because the
  // second of them has no web counterpart at all: on the web a tray tap is
  // handled inside `sw.js`, which owns the notification, while in the app the
  // tap surfaces here as an event and this is the only code that can act on
  // it. Declared below `go` because it needs it — the other effects sit above
  // because they do not.
  useEffect(() => {
    const stopReceived = onNativePushReceived(setMessage);
    const stopTapped = onNativePushTapped((push) => go(push.clickUrl));
    return () => {
      stopReceived();
      stopTapped();
    };
  }, [go]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      // Above the player bar and the bottom nav, clear of the home indicator —
      // the same band the service-worker update prompt uses.
      className="fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 lg:bottom-6"
    >
      <div className="flex w-full max-w-sm items-start gap-3 rounded-2xl border border-rule bg-card p-3 shadow-lg">
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
