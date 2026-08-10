"use client";

import { SectionHeading } from "@/components/ui";
import { usePush } from "./usePush";

/**
 * The notifications row in Settings — the permanent home of this control,
 * where someone who dismissed the banner (or wants to turn it back off) can
 * always find it.
 *
 * The one hard rule: `enable` hangs off onClick with nothing awaited in
 * between. Safari grants `Notification.requestPermission()` only inside a user
 * gesture, and an `await` before it drops the gesture — the request is then
 * refused without the reader ever seeing a prompt, on the exact platform where
 * this feature is most fragile.
 */
export function NotificationSetting() {
  const { status, native, busy, error, enable, disable } = usePush();

  // Nothing to offer, and nothing worth explaining: no Firebase project
  // configured, or a browser with no push at all.
  if (status === "loading" || status === "unconfigured" || status === "unsupported") return null;

  return (
    <>
      <SectionHeading>Notifications</SectionHeading>
      <div className="rounded-2xl border border-rule bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Notifications</p>
          <p className="text-xs text-ink-soft">
            {status === "granted"
              ? "You'll hear about new chapters, shivirs and announcements."
              : status === "denied"
                ? native
                  ? "Turned off in your phone's settings."
                  : "Blocked in your browser settings."
                : status === "ios-install"
                  ? "Available once the app is on your home screen."
                  : "New chapters, shivirs and announcements."}
          </p>
        </div>

        {status === "granted" ? (
          <button
            type="button"
            onClick={() => void disable()}
            disabled={busy}
            className="shrink-0 inline-flex min-h-11 items-center rounded-full border border-rule px-4 text-sm disabled:opacity-50"
          >
            Turn off
          </button>
        ) : status === "default" ? (
          <button
            type="button"
            onClick={() => void enable()}
            disabled={busy}
            className="shrink-0 inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--ws-color)" }}
          >
            {busy ? "Enabling…" : "🔔 Enable notifications"}
          </button>
        ) : null}
      </div>

      {status === "ios-install" && (
        <p className="mt-3 rounded-xl bg-canvas p-3 text-xs text-ink-soft">
          On iPhone and iPad, notifications work only when the app is installed. Tap{" "}
          <strong>Share</strong> in Safari, then <strong>Add to Home Screen</strong>, and open MD
          Study from that icon.
        </p>
      )}
      {status === "denied" &&
        (native ? (
          <p className="mt-3 rounded-xl bg-canvas p-3 text-xs text-ink-soft">
            Notifications are switched off for MD Study. Only you can turn them back on — open your
            phone&apos;s <strong>Settings</strong>, then <strong>Apps</strong> → <strong>MD
            Study</strong> → <strong>Notifications</strong>.
          </p>
        ) : (
          <p className="mt-3 rounded-xl bg-canvas p-3 text-xs text-ink-soft">
            Your browser is blocking notifications for this site. Only you can undo that — look for
            the lock or ⓘ icon beside the address, or this site&apos;s entry in your browser&apos;s
            notification settings.
          </p>
        ))}
      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
      </div>
    </>
  );
}
