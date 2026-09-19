"use client";

import { useEffect, useState } from "react";

/** below this, a change in the visible area is browser chrome, not a keyboard */
const KEYBOARD_MIN = 120;

/**
 * How far the on-screen keyboard reaches up from the bottom of the layout
 * viewport, in CSS pixels — 0 when it is down.
 *
 * **Why the composer needs this.** A phone keyboard no longer shrinks the page:
 * iOS Safari never did, and Chrome on Android stopped in v108. It shrinks only
 * the *visual* viewport, so a `position: fixed; bottom` box stays where it was
 * — behind the keyboard — and the browser scrolls the whole page to bring the
 * focused input into view. The box and the caret then disagree about where the
 * input is: the caret is drawn at the position the input had before the
 * scroll, and floats over the page, outside the box. That was the bug.
 *
 * Standing the box on the keyboard itself — its bottom at the visual
 * viewport's bottom edge, `offsetTop` included for the scroll iOS has already
 * done — puts the input where the caret expects it.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const covered = window.innerHeight - vv.height - vv.offsetTop;
        setInset(covered > KEYBOARD_MIN ? Math.round(covered) : 0);
      });
    };
    measure();
    vv.addEventListener("resize", measure);
    vv.addEventListener("scroll", measure);
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener("resize", measure);
      vv.removeEventListener("scroll", measure);
    };
  }, []);

  return inset;
}
