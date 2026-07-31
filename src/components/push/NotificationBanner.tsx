"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { usePush } from "./usePush";

const DISMISSED_KEY = "md.push.banner_dismissed";

/**
 * The home-screen nudge. Never a permission prompt on load — that is a prompt
 * people deny, and a denial is permanent in a way an ignored banner is not.
 * This is an offer the reader can walk past, and dismissing it is remembered
 * for good; Settings keeps the control afterwards.
 *
 * Shown only in the one state where it is useful: push is possible here and
 * nobody has decided yet. Someone who already granted, already refused, or is
 * reading on an iPhone in a tab gets nothing — for the last, the install hint
 * belongs in Settings where it can be explained, not in a banner they cannot
 * act on from here.
 */
export function NotificationBanner() {
  const { status, busy, enable } = usePush();
  const [dismissed, setDismissed] = useState(true); // assume hidden until read

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISSED_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed || status !== "default") return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // best effort — it reappears next visit, which is not harmful
    }
    setDismissed(true);
    track("push_banner_dismiss");
  };

  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-rule bg-white p-4">
      <span aria-hidden className="text-lg leading-none">
        🔔
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Get notified about new chapters</p>
        <p className="mt-0.5 text-xs text-ink-soft">
          New books and chapters, upcoming <span lang="hi" className="hi">शिविर</span>, and
          announcements. Nothing else.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => void enable()}
            disabled={busy}
            className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--ws-color)" }}
          >
            {busy ? "Enabling…" : "Enable notifications"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-full border border-rule px-3.5 py-1.5 text-xs font-semibold text-ink"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
