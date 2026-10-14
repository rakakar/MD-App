"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AccentScope, useWorkspace } from "@/components/shell/WorkspaceProvider";

/**
 * **A one-time mark pointing at one control: a spotlight and a card.**
 *
 * Drawn first for the workspace switcher (`SwitcherHint`) and shared so that
 * every "this is where X lives" in the app looks and behaves the same.
 *
 * **Spotlit, not dimmed from the header down.** A hole cut around the one
 * control says which one, and it says it the same way at every width. One
 * element does it: transparent, laid exactly over the control, with a shadow
 * spread wide enough to cover any screen.
 *
 * The card opens below the control, or above it when the control is in the
 * lower half of the screen — the reader's bottom bar is the case that needed
 * it — with the notch on whichever edge faces the control.
 *
 * Dismissed by Got it, by the scrim, or by Escape — all three, because a mark
 * over a control a reader was already reaching for should not be the thing
 * standing between them and it.
 */

/** Where the mark sits: measured from the control, in viewport coordinates. */
interface Spot {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** The gutter the card keeps from either edge of the screen. */
const EDGE = 12;
/** How far from the control the card and its notch begin. */
const GAP = 12;

export function CoachMark({
  anchor,
  icon,
  title,
  children,
  onDone,
}: {
  /**
   * A selector for the control. Where a control exists twice — a phone copy
   * and a desktop copy, with CSS deciding which is shown — the one with a box
   * is the one pointed at.
   */
  anchor: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  onDone: () => void;
}) {
  const { workspace } = useWorkspace();
  const [spot, setSpot] = useState<Spot | null>(null);
  const button = useRef<HTMLButtonElement>(null);

  const shown = useCallback(
    () =>
      [...document.querySelectorAll<HTMLElement>(anchor)].find(
        (el) => el.getBoundingClientRect().width > 0
      ) ?? null,
    [anchor]
  );

  const measure = useCallback(() => {
    const el = shown();
    if (!el) return setSpot(null);
    const r = el.getBoundingClientRect();
    // Only when it has actually moved. This runs on every scroll event in the
    // app, capture phase included, and a setState per frame of a scroll is a
    // re-render per frame of a scroll.
    setSpot((was) =>
      was &&
      was.top === r.top &&
      was.left === r.left &&
      was.width === r.width &&
      was.height === r.height
        ? was
        : { top: r.top, left: r.left, width: r.width, height: r.height }
    );
  }, [shown]);

  /**
   * Kept measured, by watching the control itself.
   *
   * Watching `document.documentElement` was wrong in a way that only shows up
   * once: the root does not resize when the *control's own* bar settles, so
   * the first measurement — taken before the bar had finished laying out —
   * was the only one ever taken, and the hole came out the wrong size.
   *
   * Observing the element fixes that by construction, and `observe` fires once
   * immediately, which is also the measurement on mount. Re-found on resize
   * because at `lg` a desktop copy can take over from the phone's, and that is
   * a different element rather than a resized one.
   */
  useEffect(() => {
    let ro: ResizeObserver | undefined;
    let watched: HTMLElement | null = null;
    let raf = 0;

    const attach = () => {
      const el = shown();
      if (el === watched) return;
      ro?.disconnect();
      watched = el;
      if (el) {
        ro = new ResizeObserver(measure);
        ro.observe(el);
      } else {
        // Nothing laid out yet — try again next frame rather than settling for
        // "there is no control on this screen".
        raf = requestAnimationFrame(attach);
      }
    };

    raf = requestAnimationFrame(attach);
    const onResize = () => {
      attach();
      measure();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", measure, true);
    // A bar sliding into place moves the control without resizing it, so the
    // observer never hears about it; a transition ending is when it settles.
    window.addEventListener("transitionend", measure, true);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("transitionend", measure, true);
    };
  }, [measure, shown]);

  const anchored = spot !== null;
  useEffect(() => {
    button.current?.focus();
  }, [anchored]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onDone(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  // Nothing to point at — a route without chrome, or a frame too early. The
  // mark says nothing until there is a control under it, rather than floating
  // unanchored in the middle of the screen.
  if (spot === null || typeof document === "undefined") return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(360, vw - EDGE * 2);
  // Left-aligned with the control where there is room, pushed off the edge
  // where there is not. The notch is placed against the control afterwards,
  // so the two cannot come apart.
  const left = Math.min(Math.max(EDGE, spot.left), vw - EDGE - width);
  const notch = Math.min(
    Math.max(16, spot.left + spot.width / 2 - left),
    width - 16
  );
  const above = spot.top + spot.height / 2 > vh / 2;

  return createPortal(
    <AccentScope color={workspace.color}>
      {/* Light, like the first-run deck — see `FirstRun`. The scrim is
          unaffected: it is a fixed black at 40%, not a themed one, so the app
          underneath darkens the same either way. */}
      <div data-theme="light" role="dialog" aria-modal="true" aria-labelledby="coach-title">
        {/* The spotlight. Transparent itself; the shadow is the scrim. Sized
            and cornered to the control so the hole looks cut rather than
            approximate, and a tap anywhere on the dark part dismisses —
            including, deliberately, on the control itself, since the next
            thing that reader wants is that control and one tap should not be
            spent twice. */}
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDone}
          className="coach-spot fixed z-60 rounded-control"
          style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
        />

        <div
          className="coach-card fixed z-60"
          style={
            above
              ? { bottom: vh - spot.top + GAP, left, width }
              : { top: spot.top + spot.height + GAP, left, width }
          }
        >
          {/* The notch, a rotated square tucked under the card's edge so only
              the two sides facing the control show. */}
          <span
            aria-hidden
            className={`absolute block h-3 w-3 rotate-45 bg-card ${
              above ? "-bottom-1.5" : "-top-1.5"
            }`}
            style={{ left: notch - 6 }}
          />
          <div className="relative rounded-card bg-card p-4 shadow-card">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-tile"
                style={{
                  background: "color-mix(in srgb, var(--ws-color) 12%, var(--color-card))",
                  color: "var(--ws-ink)",
                }}
              >
                {icon}
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="coach-title" className="text-title font-semibold">
                  {title}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{children}</p>
              </div>
            </div>
            <button
              ref={button}
              type="button"
              onClick={onDone}
              className="mt-3.5 inline-flex min-h-11 items-center justify-center rounded-control bg-ink px-5 text-sm font-semibold text-surface transition-opacity hover:opacity-90"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </AccentScope>,
    document.body
  );
}
