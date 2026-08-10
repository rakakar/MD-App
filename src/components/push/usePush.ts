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
  pushPermission,
  storedToken,
} from "@/lib/push";
import { isNativePush } from "@/lib/push-native";

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
  // Kept in state rather than read during render: it is a client-only fact,
  // and the controls' wording depends on it ("browser settings" is wrong
  // advice to give someone holding the installed app).
  const [native, setNative] = useState(false);

  // Async because the shells answer the permission question across the native
  // bridge. On the web every await here settles in the same microtask, so the
  // "loading" state is no more visible than it was when this was synchronous.
  const read = useCallback(async () => {
    setNative(isNativePush());
    // The native shell identifies itself to Firebase through the
    // google-services.json compiled into the app, not through the web env
    // vars — so it must skip the config check rather than fail it.
    if (!isNativePush() && !firebaseConfig()) return setStatus("unconfigured");
    if (iosNeedsInstall()) return setStatus("ios-install");
    if (!isPushSupported()) return setStatus("unsupported");
    const permission = await pushPermission();
    if (permission === "unsupported") return setStatus("unsupported");
    if (permission === "denied") return setStatus("denied");
    // "On" means a token actually reached the server, not merely that the
    // browser said yes. Reading the permission alone was a lie the first
    // version told: a failed registration left the OS permission granted, so
    // the row came back after a reload claiming to be on while the server had
    // never heard of the device — and the reader had no way to retry.
    const on = permission === "granted" && !hasOptedOut() && storedToken() !== null;
    setStatus(on ? "granted" : "default");
  }, []);

  useEffect(() => {
    void read();
  }, [read]);

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
      setError(
        native
          ? "This version of the app can't show notifications — please update it."
          : "This browser can't show notifications."
      );
    } else {
      // The raw reason, not a shrug. "Please try again" on a failure that will
      // fail again every time is the least useful sentence in software, and
      // the person reading it is usually the one who can fix the cause.
      const detail = result.error instanceof Error ? result.error.message : String(result.error);
      setError(`Couldn't turn notifications on — ${detail}`);
    }
    void read();
  }, [read, native]);

  const disable = useCallback(async () => {
    setBusy(true);
    await disablePush();
    setBusy(false);
    // The OS permission survives — only delivery to this device stops — so the
    // control goes back to offering to turn it on, not to "blocked".
    setStatus("default");
    track("push_disable");
  }, []);

  return { status, native, busy, error, enable, disable };
}
