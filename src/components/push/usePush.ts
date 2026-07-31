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
    // Granted-but-opted-out reads as "off, and you can turn it back on": the
    // browser permission is still there, so re-enabling costs no second prompt.
    setStatus(permission === "granted" && !hasOptedOut() ? "granted" : "default");
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
    setError(
      result.reason === "unsupported"
        ? "This browser can't show notifications."
        : "Couldn't turn notifications on. Please try again."
    );
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
