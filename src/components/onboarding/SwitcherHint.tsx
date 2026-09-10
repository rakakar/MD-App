"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SwitcherIcon } from "@/components/shell/icons";
import { AccentScope, useWorkspace } from "@/components/shell/WorkspaceProvider";
import { WORKSPACES, WORKSPACE_ORDER } from "@/lib/workspaceConfig";

/**
 * **"Switch workspaces here" — the one mark left after the deck.**
 *
 * The deck could say the app has five workspaces; it could not point at the
 * control, because the control was not on screen. This is the half that has to
 * happen over the live chrome, and it is why it is a coach mark and not a
 * seventh card.
 *
 * **Spotlit, not dimmed from the header down.** The comp draws the whole app
 * bar lit and the content below it darkened, which reads as two regions rather
 * than as one thing being pointed at — on a phone the bar also holds Sign in
 * and the display button, so "lit" ends up meaning three controls. A hole cut
 * around the switcher alone says which one, and it says it the same way at
 * every width. One element does it: transparent, laid exactly over the
 * control, with a shadow spread wide enough to cover any screen.
 *
 * Dismissed by Got it, by the scrim, or by Escape — all three, because a mark
 * over a control a reader was already reaching for should not be the thing
 * standing between them and it.
 */

/** Where the mark sits: measured from the switcher, in viewport coordinates. */
interface Spot {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** The gutter the card keeps from either edge of the screen. */
const EDGE = 12;
/** How far under the control the card and its notch begin. */
const GAP = 12;

export function SwitcherHint({ onDone }: { onDone: () => void }) {
  const { workspace } = useWorkspace();
  const [spot, setSpot] = useState<Spot | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  /**
   * Whichever copy of the switcher is on screen.
   *
   * Both are in the DOM at all times — the phone bar's and the rail's — and
   * CSS decides which is shown, so the one with a box is the one to point at.
   */
  const shownSwitcher = useCallback(
    () =>
      [...document.querySelectorAll<HTMLElement>("[data-ws-switcher]")].find(
        (el) => el.getBoundingClientRect().width > 0
      ) ?? null,
    []
  );

  const measure = useCallback(() => {
    const el = shownSwitcher();
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
  }, [shownSwitcher]);

  /**
   * Kept measured, by watching the control itself.
   *
   * This watched `document.documentElement` at first, which is wrong in a way
   * that only shows up once: the root does not resize when the *header's own*
   * layout settles, so the first measurement — taken a frame before Sign in
   * had rendered and while the switcher was still stretched across the bar —
   * was the only one ever taken. Measured, the hole came out 285px wide over a
   * control that ends up 197, cutting a bright rectangle through the middle of
   * the Sign in button.
   *
   * Observing the element fixes that by construction, and `observe` fires once
   * immediately, which is also the measurement on mount. Re-found on resize
   * because at `lg` the rail's copy takes over from the bar's, and that is a
   * different element rather than a resized one.
   */
  useEffect(() => {
    let ro: ResizeObserver | undefined;
    let watched: HTMLElement | null = null;
    let raf = 0;

    const attach = () => {
      const el = shownSwitcher();
      if (el === watched) return;
      ro?.disconnect();
      watched = el;
      if (el) {
        ro = new ResizeObserver(measure);
        ro.observe(el);
      } else {
        // Nothing laid out yet — try again next frame rather than settling for
        // "there is no switcher on this screen".
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
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure, shownSwitcher]);

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
  // mark is still owed; it simply says nothing until there is a control under
  // it, rather than floating unanchored in the middle of the screen.
  if (spot === null || typeof document === "undefined") return null;

  const vw = window.innerWidth;
  const width = Math.min(360, vw - EDGE * 2);
  // Left-aligned with the control where there is room, pushed off the edge
  // where there is not. The notch is placed against the control afterwards,
  // so the two cannot come apart.
  const left = Math.min(Math.max(EDGE, spot.left), vw - EDGE - width);
  const notch = Math.min(
    Math.max(16, spot.left + spot.width / 2 - left),
    width - 16
  );

  /** The five, named the way a reader would recognise them on the rows. */
  const others = WORKSPACE_ORDER.filter((id) => id !== workspace.id)
    .map((id) => WORKSPACES[id].name);

  return createPortal(
    <AccentScope color={workspace.color}>
      {/* Light, like the deck it follows and for the same reason — see
          `FirstRun`. The scrim is unaffected: it is a fixed black at 40%,
          not a themed one, so the app underneath darkens the same either
          way. */}
      <div
        data-theme="light"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ws-hint-title"
      >
        {/* The spotlight. Transparent itself; the shadow is the scrim. Sized
            and cornered to the control so the hole looks cut rather than
            approximate, and `pointer-events-auto` so a tap anywhere on the
            dark part dismisses — including, deliberately, on the control
            itself, since the next thing that reader wants is the switcher
            open and one tap should not be spent twice. */}
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDone}
          className="coach-spot fixed z-60 rounded-control"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
          }}
        />

        <div
          ref={card}
          className="coach-card fixed z-60"
          style={{ top: spot.top + spot.height + GAP, left, width }}
        >
          {/* The notch, drawn as a rotated square tucked under the card's own
              top edge so only its two upper sides show. */}
          <span
            aria-hidden
            className="absolute -top-1.5 block h-3 w-3 rotate-45 bg-card"
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
                <SwitcherIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="ws-hint-title" className="text-title font-semibold">
                  Switch workspaces here
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  You are in {workspace.name}. Tap this to move between{" "}
                  {others.slice(0, -1).join(", ")} and {others[others.length - 1]}{" "}
                  — each one remembers where you left off.
                </p>
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
