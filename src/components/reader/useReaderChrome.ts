"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { ReadingMode } from "@/lib/storage";

/**
 * Visibility of the reader's own top/bottom bars.
 *
 * The rules, in the order a reader discovers them:
 *  - chrome is visible when a chapter opens, then withdraws on its own, so
 *    you see what exists and then get the page to yourself;
 *  - in Scroll mode it follows scroll direction — reading (down) hides it,
 *    reaching for it (up) brings it back;
 *  - a tap in the middle of the page toggles it, in either mode;
 *  - on a desktop, the pointer at the top of the window brings it in, and
 *    moving back down into the page takes it away again — unless a click
 *    brought it, which pins it as before (designer, 14 Oct 2026);
 *  - anything modal (a sheet, the note dialog) pins it visible, because the
 *    controls that opened it must not vanish underneath.
 *
 * Shared by both readers. The book scrolls the window; the PDF scrolls a box
 * inside itself and passes `scroller` — which is the only difference between
 * them, and a poor reason for two copies of these rules that would drift.
 */
export function useReaderChrome(
  mode: ReadingMode,
  locked: boolean,
  /** the element that scrolls, when it is not the window */
  scroller?: RefObject<HTMLElement | null>
) {
  const [visible, setVisible] = useState(true);

  /** shown by hovering at the top, so leaving the top may take it away */
  const peeking = useRef(false);
  const show = useCallback(() => {
    peeking.current = false;
    setVisible(true);
  }, []);
  const hide = useCallback(() => {
    peeking.current = false;
    setVisible(false);
  }, []);
  const toggle = useCallback(() => {
    // a click is a decision: whatever hovering did, this one stays
    peeking.current = false;
    setVisible((v) => !v);
  }, []);

  // settle into the text shortly after arriving — once, not on every change.
  // Read `locked` through a ref so opening a sheet inside the first couple of
  // seconds doesn't get the chrome yanked out from under it.
  const lockedRef = useRef(locked);
  useEffect(() => {
    const t = setTimeout(() => {
      if (!lockedRef.current) setVisible(false);
    }, 2200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    lockedRef.current = locked;
    if (locked) {
      // a sheet opened from a bar that was only peeking: it is pinned now
      peeking.current = false;
      setVisible(true);
    }
  }, [locked]);

  // ---- desktop: hover at the top to peek ----
  // A mouse only (hover + a fine pointer); a finger has no hover, and a touch
  // laptop's taps already toggle. The bar is 64px; it comes in within that and
  // goes once the pointer is past 112px, so the edge between does not flicker.
  const visibleRef = useRef(visible);
  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const onMove = (e: MouseEvent) => {
      if (e.clientY <= 64) {
        if (!visibleRef.current) {
          peeking.current = true;
          setVisible(true);
        }
      } else if (e.clientY > 112 && peeking.current && !lockedRef.current) {
        peeking.current = false;
        setVisible(false);
      }
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    if (mode !== "scroll" || locked) return;
    const box = scroller?.current ?? null;
    const target: HTMLElement | Window = box ?? window;
    const readY = () => (box ? box.scrollTop : window.scrollY);

    let last = readY();
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = readY();
        const dy = y - last;
        // ignore the jitter of a finger resting on the glass
        if (Math.abs(dy) > 10) {
          setVisible(dy < 0 || y < 48);
          last = y;
        } else if (y < 48) {
          setVisible(true);
          last = y;
        }
        ticking = false;
      });
    };
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
  }, [mode, locked, scroller]);

  return { visible, show, hide, toggle };
}
