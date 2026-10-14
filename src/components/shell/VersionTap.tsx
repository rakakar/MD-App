"use client";

import { useRef, useState } from "react";
import { CHROME_DEBUG_KEY } from "./ChromeDebug";

/**
 * The version line, which also switches the app-bar diagnostic on and off:
 * five taps within two seconds. Nobody taps a version number five times by
 * accident, and it needs no settings row that a reader would wonder about.
 */
export function VersionTap({ version }: { version: string }) {
  const taps = useRef<number[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const tap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 2000), now];
    if (taps.current.length < 5) return;
    taps.current = [];
    let on = false;
    try {
      on = localStorage.getItem(CHROME_DEBUG_KEY) !== "1";
      if (on) localStorage.setItem(CHROME_DEBUG_KEY, "1");
      else localStorage.removeItem(CHROME_DEBUG_KEY);
    } catch {
      return;
    }
    window.dispatchEvent(new Event("md:chrome-debug"));
    setNote(on ? "Diagnostics on" : "Diagnostics off");
  };
  return (
    <p className="tabular-nums text-ink-soft" onClick={tap}>
      v{version}
      {note && <span className="ms-2 text-xs">· {note}</span>}
    </p>
  );
}
