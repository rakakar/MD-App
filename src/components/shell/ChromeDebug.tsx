"use client";

import { useEffect, useState } from "react";

/**
 * **A readout of where the app bar actually is** — a diagnostic, off unless
 * switched on (five taps on the version line in About; five more turn it off).
 *
 * Why it exists: in the installed iPhone app (iOS 27, Oct 2026) the bar
 * vanishes while scrolling down and returns scrolling up, and the pinned filter
 * rows are left with a gap above them. Nothing in the app hides the bar, Chrome
 * does not reproduce it, and there is no iOS simulator here. This shows, live
 * on the phone, whether the bar moves in the page (its rect changes) or iOS
 * paints over it (its rect stays put) — which decides the fix.
 */
export const CHROME_DEBUG_KEY = "md.debug.chrome";

export function ChromeDebug() {
  const [on, setOn] = useState(false);
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    const read = () => {
      try {
        setOn(localStorage.getItem(CHROME_DEBUG_KEY) === "1");
      } catch {
        setOn(false);
      }
    };
    read();
    window.addEventListener("md:chrome-debug", read);
    return () => window.removeEventListener("md:chrome-debug", read);
  }, []);

  useEffect(() => {
    if (!on) return;
    let raf = 0;
    const r = (el: Element | null | undefined) => {
      if (!el) return "—";
      const b = el.getBoundingClientRect();
      return `${Math.round(b.top)}→${Math.round(b.bottom)}`;
    };
    const tick = () => {
      const header = document.querySelector("header");
      const row = [...document.querySelectorAll<HTMLElement>("div.sticky")].find(
        (d) => d !== header && d.getBoundingClientRect().height < 200
      );
      const vv = window.visualViewport;
      const hs = header ? getComputedStyle(header) : null;
      setLines([
        `scrollY ${Math.round(window.scrollY)}  inner ${window.innerHeight}`,
        `vv top ${vv ? Math.round(vv.offsetTop) : "—"} h ${vv ? Math.round(vv.height) : "—"} pageTop ${vv ? Math.round(vv.pageTop) : "—"}`,
        `bar ${r(header)}  ${hs ? `${hs.position} vis:${hs.visibility} op:${hs.opacity}` : "none"}`,
        `row ${r(row)}  --app-header-h ${getComputedStyle(document.documentElement).getPropertyValue("--app-header-h").trim()}`,
        `elem@(50%,20) ${(() => {
          const e = document.elementFromPoint(window.innerWidth / 2, 20);
          return e ? `${e.tagName.toLowerCase()}${e.closest("header") ? " in bar" : ""}` : "—";
        })()}`,
      ]);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on]);

  if (!on) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-2 z-[100] rounded-control bg-overlay px-2.5 py-1.5 font-mono text-xs leading-snug text-white/90"
      style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
    >
      {lines.map((l) => (
        <div key={l.slice(0, 8)}>{l}</div>
      ))}
    </div>
  );
}
