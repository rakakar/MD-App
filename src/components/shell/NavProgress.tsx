"use client";

import { useEffect, useRef, useState } from "react";

/** Mirrors `NAV_START` in `instrumentation-client.ts`. */
const NAV_START = "md:nav-start";
/** Navigations that finish sooner than this never show the bar. */
const SHOW_AFTER = 150;
/** Give up waiting and hide, so a stalled request never leaves a bar forever. */
const GIVE_UP_AFTER = 30_000;

/**
 * **The answer to "did my tap work?" on a slow connection.**
 *
 * A Next navigation keeps the old screen up until the new one can be drawn. On
 * a good connection that is instant (the page was prefetched); on a weak one
 * it can be ten seconds or more of a screen that looks like it ignored the
 * tap — the complaint that started this (31 Oct 2026). Two signals, both
 * starting on the tap itself:
 *
 * - a thin bar across the top of the screen, in the workspace colour, that
 *   creeps forward while the page is on its way;
 * - the link that was tapped dims (`a[data-nav-pending]` in globals.css), so
 *   the feedback is where the finger is, not only at the top of the screen.
 *
 * Both wait `SHOW_AFTER` before appearing, so a prefetched page — nearly every
 * tap on wifi — opens with no flicker of either.
 *
 * Start: `onRouterTransitionStart` (instrumentation-client.ts), which fires for
 * real router navigations only — not for a link whose click handler opens a
 * sheet instead, and not for the reader's chapter-to-chapter `pushState`.
 * End: the address bar reaching the target. Next updates history when the new
 * page commits, so watching `location` catches every kind of navigation,
 * query-only ones included, without subscribing to search params (which
 * would push every static page into client rendering).
 */
export function NavProgress() {
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const lastTap = useRef<{ a: HTMLAnchorElement; at: number } | null>(null);

  useEffect(() => {
    let showTimer: number | undefined;
    let watch: number | undefined;
    let giveUp: number | undefined;
    let doneTimer: number | undefined;
    let pendingLink: HTMLAnchorElement | null = null;

    const clear = () => {
      window.clearTimeout(showTimer);
      window.clearInterval(watch);
      window.clearTimeout(giveUp);
      pendingLink?.removeAttribute("data-nav-pending");
      pendingLink = null;
    };

    const finish = (shown: boolean) => {
      clear();
      if (!shown) return setState("idle");
      setState("done");
      window.clearTimeout(doneTimer);
      doneTimer = window.setTimeout(() => setState("idle"), 400);
    };

    const where = (href: string) => {
      const u = new URL(href, location.href);
      return u.pathname + u.search;
    };

    // Remember the link under the finger, so the start event (which only
    // knows a URL) can find the element to dim.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (a instanceof HTMLAnchorElement) lastTap.current = { a, at: Date.now() };
    };

    const onStart = (e: Event) => {
      const { url } = (e as CustomEvent<{ url: string }>).detail;
      const target = where(url);
      clear();
      window.clearTimeout(doneTimer);
      // Same page (a hash link, a tap on the tab you are on): nothing to wait for.
      if (target === location.pathname + location.search) return;

      const tap = lastTap.current;
      if (tap && Date.now() - tap.at < 1000 && where(tap.a.href) === target) {
        pendingLink = tap.a;
        pendingLink.setAttribute("data-nav-pending", "");
      }

      let shown = false;
      showTimer = window.setTimeout(() => {
        shown = true;
        setState("running");
      }, SHOW_AFTER);
      watch = window.setInterval(() => {
        if (location.pathname + location.search === target) finish(shown);
      }, 80);
      giveUp = window.setTimeout(() => finish(shown), GIVE_UP_AFTER);
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener(NAV_START, onStart);
    return () => {
      clear();
      window.clearTimeout(doneTimer);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(NAV_START, onStart);
    };
  }, []);

  if (state === "idle") return null;
  return (
    <div aria-hidden className="nav-progress" data-state={state}>
      <div className="nav-progress-bar" />
    </div>
  );
}
