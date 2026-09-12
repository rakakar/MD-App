"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AccentScope, useWorkspace } from "@/components/shell/WorkspaceProvider";
import { FirstRun } from "./FirstRun";
import { LaunchPane } from "./LaunchPane";

/**
 * **The first-run layer: the launch screen, then the deck.**
 *
 * One layer, two panes, and the whole reason they are in one component is the
 * transition between them — which is not the same transition on both shapes of
 * screen, and could not be if the two panes owned their own layers.
 *
 * **On a phone** the launch screen is the screen. Pressing *Start Your
 * Journey* fades the deck up over it: the artwork stays where it is underneath
 * and the deck arrives as an opaque page, so the press reads as going
 * somewhere rather than as the screen rearranging itself.
 *
 * **On a wide window** nothing is replaced. The launch screen keeps its column
 * on the left — mark, name, sentence, founder — and the deck fades in on the
 * right, sliding the last of the way and bringing a scrim with it so that a
 * light card is never floating on a photograph. The button is the only thing
 * that leaves, and the line that takes its place says what the panel beside it
 * is. A desktop window is wide enough to hold both, and taking the identity
 * away to show six cards would spend the whole screen on a phone layout.
 *
 * **The artwork belongs here, not to either pane.** It runs the full window on
 * both shapes, under the deck as well as under the launch column, and a
 * photograph that stops halfway across is a panel rather than a photograph.
 *
 * **Forced light, still.** Same decision as the deck had on its own: this is a
 * screen seen once, and a theme-correct dark version of it is a second design
 * to draw and keep for something nobody meets twice. See the `[data-theme]`
 * block in `globals.css`.
 */
export function FirstRunFlow({ onDone }: { onDone: () => void }) {
  const { workspace } = useWorkspace();
  const [started, setStarted] = useState(false);

  // The page behind must not scroll under a full-screen layer — on iOS a drag
  // that starts on a card and continues past its edge otherwise scrolls the
  // app underneath. Owned here rather than by the deck, because the launch
  // screen is up first and has the same problem.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome"
      data-theme="light"
      /* Opaque, and `overflow-hidden` because the artwork is deliberately
         larger than the window while it settles. */
      className="launch fixed inset-0 z-60 overflow-hidden bg-surface"
    >
      {/* A portal renders outside the provider's `[data-ws]`, so without this
          every `var(--ws-color)` below falls back to the app default. */}
      <AccentScope color={workspace.color} className="h-full">
        {/* The artwork. Two crops of the same picture, chosen by media query
            rather than by class, so only one of them is ever fetched. The
            settle and the drift are on separate elements because both animate
            `transform` and the second has to begin where the first stopped. */}
        <div aria-hidden className="absolute inset-0 overflow-hidden">
          <div className="launch-settle h-full w-full">
            <picture className="block h-full w-full">
              <source media="(min-width: 64rem)" srcSet="/brand/launch-desktop.webp" />
              {/* A plain `<img>` inside `<picture>`: art direction by
                  `<source media>` is not something next/image does, and both
                  crops are fixed local assets already at the size drawn. */}
              <img
                src="/brand/launch-mobile.webp"
                alt=""
                className="launch-drift h-full w-full object-cover object-[50%_42%] lg:object-[58%_50%]"
              />
            </picture>
          </div>
        </div>

        <div aria-hidden className="launch-scrim-y absolute inset-0 lg:hidden" />
        <div aria-hidden className="launch-scrim-x absolute inset-0 hidden lg:block" />
        <div
          aria-hidden
          className={`launch-scrim-panel absolute inset-0 hidden lg:block ${
            started ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Capped and centred, not spread. The two columns are anchored to
            opposite edges, so on a wide monitor every extra pixel went into the
            gap between them and the screen read as two unrelated things at
            either side of a photograph. The study is drawn at 1440; past that
            the pair holds its shape and the window grows around it. */}
        <div className="relative mx-auto flex h-full w-full max-w-[90rem] items-center lg:gap-10 lg:ps-10 lg:pe-8 xl:gap-14 xl:ps-22 xl:pe-18">
          <LaunchPane started={started} onStart={() => setStarted(true)} />

          {/* Mounted on the press rather than hidden until it, so the entrance
              is a CSS *animation* — which plays on mount — instead of a
              transition that needs a frame at the old value first. On a phone
              this covers the launch screen; on a desktop it is the card on the
              right. */}
          {started && (
            <div className="launch-panel absolute inset-0 overflow-y-auto bg-surface lg:relative lg:inset-auto lg:flex lg:min-w-0 lg:flex-1 lg:justify-end lg:bg-transparent">
              <div className="h-full w-full lg:h-[min(92dvh,45.25rem)] lg:max-w-[33.75rem] lg:overflow-y-auto lg:rounded-sheet lg:border lg:border-rule lg:bg-card lg:px-7 lg:pb-[1.375rem] lg:pt-[1.625rem] lg:shadow-raised">
                <FirstRun onDone={onDone} />
              </div>
            </div>
          )}
        </div>
      </AccentScope>
    </div>,
    document.body
  );
}
