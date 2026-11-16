"use client";

import { useEffect, useState } from "react";
import { isIos, isStandalone } from "@/lib/push";
import { isNativePush } from "@/lib/push-native";

/**
 * How to put MD Study on the home screen (15 Nov 2026, UX audit IN5).
 *
 * The only install steps in the app were inside the Notifications switch, and
 * only for iPhone — on Android, the phone most readers here have, nothing
 * said how. One card, in Settings and on About, with the steps for the phone
 * it is on. Nothing at all once the app is already running from the home
 * screen or as the store app: the card would only be telling them what they
 * have done. Rendered after mount, since which steps apply is the browser's
 * to say.
 */
/** Which steps apply here, or null when the app is already installed. */
export function useInstallSteps(): "ios" | "other" | null {
  const [phone, setPhone] = useState<"ios" | "other" | null>(null);
  useEffect(() => {
    if (isStandalone() || isNativePush()) return;
    setPhone(isIos() ? "ios" : "other");
  }, []);
  return phone;
}

export function InstallCard({ className = "" }: { className?: string }) {
  const phone = useInstallSteps();
  if (!phone) return null;

  const steps =
    phone === "ios"
      ? ["Open this page in Safari.", "Tap Share (the square with an arrow).", "Choose Add to Home Screen."]
      : [
          "Open this page in Chrome.",
          "Tap the ⋮ menu at the top right.",
          "Choose Install app (on some phones, Add to Home screen).",
        ];

  return (
    <div className={className}>
      <p className="text-sm text-ink-soft">
        Put MD Study on your home screen to open it like any other app, full screen and with
        notifications.
      </p>
      <ol className="mt-2 flex list-decimal flex-col gap-1 ps-5 text-sm text-ink marker:text-ink-soft">
        {steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
    </div>
  );
}
