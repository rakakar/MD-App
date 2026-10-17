"use client";

import { useEffect, useState } from "react";

/**
 * **For a surface whose code is loaded on demand: mount it from its first
 * opening, and keep it.**
 *
 * The sheets and panels this is used with draw nothing while closed, so
 * mounting one only once it has been opened changes nothing on screen — but it
 * means its module (imported with `next/dynamic`) is not parsed and run while
 * the page is starting, which on a phone is CPU the first paint is waiting on.
 * Kept mounted after that, so whatever it holds between openings survives a
 * close, exactly as when it was always there.
 *
 * `warm`, when given, is the same `import()` the dynamic component uses. It is
 * called once the browser is idle, so the code is already here by the time
 * anyone taps — the first opening does not wait on the network. Pass a
 * module-level function: it is an effect dependency.
 */
export function useEverOpen(open: boolean, warm?: () => unknown): boolean {
  const [ever, setEver] = useState(open);
  if (open && !ever) setEver(true);

  useEffect(() => {
    if (!warm) return;
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(() => void warm(), { timeout: 5000 });
      return () => cancelIdleCallback(id);
    }
    const t = setTimeout(() => void warm(), 2500);
    return () => clearTimeout(t);
  }, [warm]);

  return ever || open;
}
