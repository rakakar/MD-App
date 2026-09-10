"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BrandMark, ChevronRight } from "@/components/shell/icons";
import { AccentScope, useWorkspace } from "@/components/shell/WorkspaceProvider";
import { ctaPrimary } from "@/components/ui";
import { advanceLabel, ONBOARDING_CARDS } from "@/lib/onboarding";
import { Fragment } from "./Fragments";

/**
 * **The first-run deck — six cards, once.**
 *
 * Each card is one feature: a working fragment of the real interface above the
 * line, one plain sentence below it. Not a tour of controls and not a feature
 * list — the reader is being told what the *app* is divided into before they
 * are dropped into one part of it.
 *
 * **Three ways through, and they are not alternatives to each other.** Drag
 * the card, press the arrows, tap a dot. A first-run deck is the one screen in
 * an app where nobody has learnt the gesture yet, so the gesture cannot be the
 * only way: the arrows are what a reader who has never swiped a card will
 * reach for, and the dots are how someone who skimmed past card two gets back
 * to it without pressing back four times. Skip is on every card.
 *
 * **Over everything, like `journey/Onboarding`.** Same reasoning: chrome
 * around a first-run flow reads as a page you are stuck on, and invites a
 * reader to go looking for the way past it. This one differs in having a way
 * past it on every card, which is why it is a deck and that one is a question.
 *
 * It is shown once and the flag is local. A reader who clears their storage
 * sees it again, which is the correct behaviour for something explaining an
 * interface they are, as far as this device knows, meeting for the first time.
 */
export function FirstRun({ onDone }: { onDone: () => void }) {
  const { workspace } = useWorkspace();
  const [i, setI] = useState(0);
  /** live finger offset in px while a drag is in progress, else 0 */
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const last = ONBOARDING_CARDS.length - 1;

  const go = useCallback(
    (n: number) => setI(Math.max(0, Math.min(last, n))),
    [last]
  );

  const advance = useCallback(() => {
    if (i === last) onDone();
    else go(i + 1);
  }, [i, last, go, onDone]);

  // The deck owns the whole screen, so it owns the arrow keys too. Escape
  // skips: it is the gesture for "I am done with this layer", and this layer
  // has an explicit Skip, so the two should not disagree.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { e.preventDefault(); go(i + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(i - 1); }
      else if (e.key === "Escape") { e.preventDefault(); onDone(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, go, onDone]);

  // Focus lands on Skip rather than on the deck: it is the one control a
  // reader who did not ask for this needs to find first, and reading order
  // from there is the card, then the arrows.
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // The page behind must not scroll under a full-screen layer — on iOS a drag
  // that starts on the card and continues past its edge otherwise scrolls the
  // app underneath.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  /* ---- drag ----------------------------------------------------------
     Pointer events, not touch: one code path covers finger, pen and a mouse
     dragging the card on desktop, and `setPointerCapture` means a drag that
     leaves the card still ends on the card rather than being lost.

     A quarter of the viewport to commit. Less and a card changes under a
     reader who was only testing whether it moves; more and the gesture stops
     feeling connected to the finger. Resistance at the two ends — a third of
     the distance — because a deck that slides freely past its last card
     reads as broken rather than finished. */
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const axis = useRef<"undecided" | "x" | "y">("undecided");
  /**
   * The same number as `drag`, kept in a ref.
   *
   * `drag` is state because the track has to move as the finger does; the ref
   * is what the *decision* reads, because state is not there yet when it is
   * needed. A flick puts its last `pointermove` and its `pointerup` in one
   * frame, and the `pointerup` handler is the one bound at the previous
   * render, where `drag` is still whatever it was before the gesture — zero.
   * Measured: a 220px swipe back committed nothing, every time, while the
   * identical swipe forward worked, because the forward one happened to
   * straddle a render.
   */
  const offset = useRef(0);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY, t: e.timeStamp };
    axis.current = "undecided";
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    // Which way is this drag going? Decided once, on the first movement that
    // is unambiguous, so a vertical scroll inside a tall card is never stolen
    // by the deck and a horizontal swipe is never fought by the page.
    if (axis.current === "undecided") {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      axis.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (axis.current === "x") {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
      }
    }
    if (axis.current !== "x") return;
    const atEnd = (dx > 0 && i === 0) || (dx < 0 && i === last);
    offset.current = atEnd ? dx / 3 : dx;
    setDrag(offset.current);
  };

  const endDrag = (e: React.PointerEvent) => {
    const from = start.current;
    const wasHorizontal = axis.current === "x";
    const moved = offset.current;
    start.current = null;
    axis.current = "undecided";
    offset.current = 0;
    setDragging(false);
    setDrag(0);
    // A vertical drag inside the card is not this deck's gesture; it ends
    // here having moved nothing, rather than being counted as a tiny swipe.
    if (!from || !wasHorizontal) return;

    const width = viewport.current?.offsetWidth ?? 320;
    // Two ways to commit, because there are two gestures here. A *drag* is
    // judged on distance — a quarter of the width, so a card never changes
    // under someone who was only testing whether it moves. A *flick* is
    // judged on speed: it is over in under a fifth of a second and never
    // travels a quarter of anything, and refusing it is how a carousel comes
    // to feel stuck.
    const flick = e.timeStamp - from.t < 200 && Math.abs(moved) > 40;
    if (Math.abs(moved) > width / 4 || flick) go(moved < 0 ? i + 1 : i - 1);
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="What this app holds"
      /* Light, whatever the app is set to — at the designer's decision, and
         the reason is that this is seen once. A theme-correct dark version of
         six cards is a second design to draw, review and keep for a screen
         nobody meets twice. The app's own default is light now, so the reader
         this could surprise is one who chose dark deliberately and then
         cleared their storage. See the block in globals.css. */
      data-theme="light"
      /* Opaque. What is behind is the app this deck exists to explain, and
         showing it half-lit through a scrim invites a reader to try to use
         it. */
      className="fixed inset-0 z-60 overflow-y-auto bg-surface"
    >
      {/* A portal renders outside the provider's `[data-ws]`, so without this
          every `var(--ws-color)` below falls back to the app default. Same
          fix, same reason, as `journey/Onboarding`. */}
      <AccentScope color={workspace.color}>
        <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
          <div className="flex items-center justify-between">
            <span aria-hidden style={{ color: "var(--ws-color)" }}>
              <BrandMark className="h-7 w-7" />
            </span>
            <button
              ref={closeRef}
              type="button"
              onClick={onDone}
              className="-me-2 inline-flex min-h-11 items-center rounded-control px-2 text-sm font-semibold text-ink-soft transition-colors active:bg-ink/[.04]"
            >
              Skip
            </button>
          </div>

          {/* The viewport clips; the track inside it is six cards wide and
              slides. Rendering all six rather than one keeps the drag honest —
              the next card is genuinely arriving from the edge — and six
              fragments of static markup is nothing to hold. */}
          <div
            ref={viewport}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            /* `pan-y`: the browser keeps vertical scrolling, we take
               horizontal. Without it a swipe on iOS is a page gesture before
               it is ours. */
            className="mt-4 flex-1 touch-pan-y overflow-hidden"
          >
            <div
              className={`flex h-full ${
                dragging ? "" : "transition-transform duration-300 ease-out motion-reduce:transition-none"
              }`}
              style={{
                width: `${ONBOARDING_CARDS.length * 100}%`,
                transform: `translateX(calc(${(-i * 100) / ONBOARDING_CARDS.length}% + ${drag}px))`,
              }}
            >
              {ONBOARDING_CARDS.map((c, n) => (
                <section
                  key={c.id}
                  aria-label={`${c.title}. ${c.fragmentLabel}`}
                  aria-hidden={n !== i}
                  /* Top-aligned, and that is the fix rather than an
                     oversight. Centring the block put the title wherever the
                     card's own height happened to leave it, so the heading and
                     the sentence stepped up and down under the reader's thumb
                     as they swiped — which reads as the page settling rather
                     than as a deck advancing. With `Stage` a fixed height and
                     the block pinned to the top, the title lands in the same
                     place on all six. The slack falls at the bottom, above the
                     controls, where nothing moves. */
                  className="flex w-full shrink-0 flex-col select-none px-0.5"
                  style={{ width: `${100 / ONBOARDING_CARDS.length}%` }}
                >
                  <Fragment id={c.id} />
                  {/* The app's page-title step — `font-display text-2xl
                      font-medium`, as Centres and Connect set theirs. Not the
                      taller shelf step: a card's headline sits above a
                      paragraph rather than over a whole screen. */}
                  <h2 className="mt-6 font-display text-2xl font-medium leading-tight tracking-[-0.015em]">
                    {c.title}
                  </h2>
                  <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{c.body}</p>
                </section>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            {/* Dots as a real control, not a readout. The active one is a
                pill rather than a bigger circle, so which card you are on
                survives a reader who cannot separate two similar greys — and
                each has the 44px target the rest of the app keeps, spent as
                padding around a 6px mark. */}
            <div className="flex items-center" role="tablist" aria-label="Cards">
              {ONBOARDING_CARDS.map((c, n) => (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={n === i}
                  aria-label={`Card ${n + 1} of ${ONBOARDING_CARDS.length}: ${c.title}`}
                  onClick={() => go(n)}
                  className="group inline-flex min-h-11 items-center px-1"
                >
                  <span
                    className={`block h-1.5 rounded-full transition-all duration-200 motion-reduce:transition-none ${
                      n === i ? "w-6" : "w-1.5 bg-inset"
                    }`}
                    style={n === i ? { background: "var(--ws-color)" } : undefined}
                  />
                </button>
              ))}
            </div>

            <div className="ms-auto flex items-center gap-2.5">
              {/* Drawn on every card including the first, where it is
                  disabled rather than absent: a control that appears between
                  card one and card two moves the button beside it, and the
                  button beside it is the one being pressed six times. */}
              <button
                type="button"
                onClick={() => go(i - 1)}
                disabled={i === 0}
                aria-label="Previous card"
                className="inline-flex h-11 w-11 items-center justify-center rounded-control border border-rule transition-opacity disabled:opacity-40"
                style={{ color: "var(--ws-ink)" }}
              >
                <span aria-hidden className="rotate-180">
                  <ChevronRight className="h-5 w-5" />
                </span>
              </button>
              <button
                type="button"
                onClick={advance}
                className={ctaPrimary}
                style={{ background: "var(--ws-color)" }}
              >
                {advanceLabel(i)}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </AccentScope>
    </div>,
    document.body
  );
}
