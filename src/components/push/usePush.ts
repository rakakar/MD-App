"use client";

import { useCallback, useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import {
  disablePush,
  enablePush,
  firebaseConfig,
  hasOptedOut,
  iosNeedsInstall,
  isPushSupported,
  permissionState,
  storedToken,
} from "@/lib/push";

/**
 * What the notification controls need to know, in one place — because there
 * are two of them (the settings row and the home banner) and they must never
 * disagree about whether this device can be notified.
 *
 * `null` state means "not decided yet": every check here touches `navigator`
 * or `Notification`, neither of which exists during SSR, so the controls
 * render nothing at all until the effect has run. That is deliberate — a
 * button that appears and then vanishes on hydration is worse than one that
 * appears a frame late.
 */
export type PushStatus =
  | "loading"
  | "unconfigured" // Firebase env vars not set — no button at all
  | "unsupported" // this browser cannot do push
  | "ios-install" // iPhone in a tab: install to the home screen first
  | "default" // can ask
  | "granted"
  | "denied"; // asked and refused — only the OS settings can undo this

export function usePush() {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const read = useCallback(() => {
    if (!firebaseConfig()) return setStatus("unconfigured");
    if (iosNeedsInstall()) return setStatus("ios-install");
    if (!isPushSupported()) return setStatus("unsupported");
    const permission = permissionState();
    if (permission === "denied") return setStatus("denied");
    // "On" means a token actually reached the server, not merely that the
    // browser said yes. Reading the permission alone was a lie the first
    // version told: a failed registration left the OS permission granted, so
    // the row came back after a reload claiming to be on while the server had
    // never heard of the device — and the reader had no way to retry.
    const on = permission === "granted" && !hasOptedOut() && storedToken() !== null;
    setStatus(on ? "granted" : "default");
  }, []);

  useEffect(read, [read]);

  /** MUST be wired straight to onClick — see the note in lib/push.ts. */
  const enable = useCallback(async () => {
    setBusy(true);
    setError(null);
    const result = await enablePush();
    setBusy(false);
    if (result.ok) {
      setStatus("granted");
      track("push_enable");
      return;
    }
    if (result.reason === "denied") {
      setStatus("denied");
      return;
    }
    if (result.reason === "unsupported") {
      setError("This browser can't show notifications.");
    } else {
      // The raw reason, not a shrug. "Please try again" on a failure that will
      // fail again every time is the least useful sentence in software, and
      // the person reading it is usually the one who can fix the cause.
      const detail = result.error instanceof Error ? result.error.message : String(result.error);
      setError(`Couldn't turn notifications on — ${detail}`);
    }
    read();
  }, [read]);

  const disable = useCallback(async () => {
    setBusy(true);
    await disablePush();
    setBusy(false);
    // The OS permission survives — only delivery to this device stops — so the
    // control goes back to offering to turn it on, not to "blocked".
    setStatus("default");
    track("push_disable");
  }, []);

  return { status, busy, error, enable, disable };
}
