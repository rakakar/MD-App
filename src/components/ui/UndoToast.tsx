"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/** Long enough to read the line and reach the button with a thumb. */
const UNDO_MS = 7000;

/**
 * "Note deleted · Undo" — what a delete of something the reader made shows.
 *
 * The bin on a saved note or highlight acts at once, with no confirm: a
 * dialog on every delete is a tax on the common case, and the common case is
 * a reader tidying a list. What it lacked was a way back from the uncommon
 * one, a thumb landing on the bin while scrolling — and what that cost was a
 * note somebody had written. So the delete stays immediate and this is the
 * way back.
 *
 * Settings' `useToast` look (the near-black `overlay` tile the comps float
 * over the page), with one button. The region is always mounted and only its
 * contents change, which is what makes a screen reader announce it. Seven
 * seconds rather than the toast's three, and the clock stops while the button
 * has focus or the pointer is over it: a message with an action in it must not
 * vanish from under the hand reaching for it.
 *
 * Returns the node to render once on the page, and `offer(message, undo)`.
 * A second delete replaces the first offer — the first is by then a decision
 * the reader has moved on from.
 */
export function useUndoToast(): [ReactNode, (message: string, undo: () => void) => void] {
  const [offer, setOffer] = useState<{ message: string; undo: () => void } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const start = useCallback(() => {
    stop();
    timer.current = setTimeout(() => setOffer(null), UNDO_MS);
  }, [stop]);
  useEffect(() => stop, [stop]);

  const show = useCallback(
    (message: string, undo: () => void) => {
      setOffer({ message, undo });
      start();
    },
    [start]
  );

  const node = (
    <div
      role="status"
      aria-live="polite"
      // Above the bottom nav on a phone, the same band Settings' toast uses.
      className="pointer-events-none fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-55 flex justify-center px-4 lg:bottom-8"
    >
      {offer && (
        <div
          onPointerEnter={stop}
          onPointerLeave={start}
          className="pointer-events-auto flex items-center gap-1 rounded-tile bg-overlay py-1 pe-1 ps-5 text-sm font-medium text-white shadow-raised"
        >
          {offer.message}
          <button
            type="button"
            onFocus={stop}
            onBlur={start}
            onClick={() => {
              stop();
              offer.undo();
              setOffer(null);
            }}
            /* 44px, and the accent on near-black: `--color-audio-accent` is
               the one accent tuned for this ground (7.09:1 on a near-black),
               where `accent` itself is a fill and measures under 4.5. */
            className="flex min-h-11 items-center rounded-control px-4 font-semibold text-audio-accent underline-offset-2 hover:underline active:bg-white/10"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
  return [node, show];
}
