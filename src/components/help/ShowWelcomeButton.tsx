"use client";

import { ctaSecondary } from "@/components/ui";

/**
 * Replays the first-run cards. `?firstrun` is the replay FirstRunGate and the
 * pre-paint script already honour: it overrides the stored flags for that one
 * page load and clears nothing, so finishing the cards sets them as usual and
 * the next plain load is back to normal. It needs a full load rather than a
 * client navigation, because the gate reads it once, when the page starts.
 */
export function ShowWelcomeButton() {
  return (
    <button type="button" onClick={() => window.location.assign("/?firstrun")} className={ctaSecondary}>
      Show the welcome
    </button>
  );
}
