"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { BrandMark } from "@/components/shell/icons";
import { CoverTile } from "@/components/shelf/CoverTile";
import { AccentScope, useWorkspace } from "@/components/shell/WorkspaceProvider";
import { ctaPrimary } from "@/components/ui";
import type { BookSummary } from "@/lib/types";

/**
 * **The launch screen — one screen, before the deck.**
 *
 * The designer's reference (`MD Launch B Animation.mp4`) draws a title card:
 * a wall of book covers behind, the app's own mark and name over it, what the
 * app is for in a sentence, and the man whose literature it holds, before a
 * reader is asked to do anything. This is that card, held rather than played
 * — everything the animation reveals in sequence is simply on screen, because
 * the reveal was choreography for a video and not a thing a reader waits on.
 *
 * **Every asset is a real one.** The covers are `CoverTile`'s own designed
 * fallback over real book codes — see `LAUNCH_SHELF` below for why this is
 * the one caller that never swaps it for the live shelf — and the portrait is
 * Shri A. Nagraj ji's own, `public/brand/anagraj.jpg`. The mark is
 * `BrandMark`, the same file the app bar renders everywhere else. Nothing
 * here is drawn to look like the app; it is the app's own pieces, arranged
 * once, full-screen.
 *
 * **Shown once, and the flag is the deck's own.** `FirstRunGate` renders this
 * before `FirstRun` and only for as long as `onboardingSeen` is false — there
 * is no separate stored flag for having seen the launch screen. A reader who
 * reloads mid-deck sees the launch screen again ahead of it, which is the
 * same behaviour the deck itself already has for the same reason: nothing
 * about *this* screen has been confirmed done until the whole first run has.
 */

/**
 * Eight books, for the wall behind the title.
 *
 * Real codes and real titles, because `CoverTile` derives a book's fallback
 * hue from its code — an invented one would colour the tile differently here
 * than everywhere else in the app.
 *
 * **Never swapped for the live shelf, and that used to be the plan.** This
 * fetched `books/` and replaced the fallback with real cover photographs the
 * moment it answered — which on a warm connection is well under the fade's
 * own 320ms, so what a reader actually saw was the fade still settling while
 * all eight tiles popped from flat colour to full photographs in one frame.
 * Measured: the swap was consistently done before the first screenshot this
 * ever got checked with. A wall that changes its mind while it is still
 * arriving reads as broken, not as loading — and this wall is decoration, not
 * a shelf preview; the real one is the very next thing a reader who finishes
 * the deck sees. Held to the one designed state, it cannot glitch.
 */
const LAUNCH_SHELF: BookSummary[] = (
  [
    ["JVEP", "जीवन विद्या एक परिचय"],
    ["ABVP", "विकल्प एवं अध्ययन बिंदु"],
    ["MKD", "मानव कर्म दर्शन"],
    ["MABD", "मानव अभ्यास दर्शन"],
    ["MAND", "मानव अनुभव दर्शन"],
    ["VJVD", "व्यवहारात्मक जनवाद"],
    ["SBVD", "समाधानात्मक भौतिकवाद"],
    ["ADVD", "अनुभवात्मक अध्यात्मवाद"],
  ] as const
).map(([code, title_hi]) => ({ code, title_hi }) as BookSummary);

export function LaunchScreen({ onDone }: { onDone: () => void }) {
  const { workspace } = useWorkspace();
  const goRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    goRef.current?.focus();
  }, []);

  // Same reason as FirstRun's own: a full-screen layer must not let the page
  // behind it scroll on a drag that starts here and continues past its edge.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // The one keyboard equivalent of the tap, not a second control: the comp
  // draws no way past this screen but the button, so nothing here should look
  // like one either.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Escape") {
        e.preventDefault();
        onDone();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Madhyasth Darshan — Study App"
      // Light regardless of the app's theme, and for the reason FirstRun's
      // own note gives: this is seen once, so a dark twin of it is a second
      // design to draw and keep for a screen nobody meets twice.
      data-theme="light"
      // A held frame, not a played one — see the file note on why the
      // reference's multi-second reveal is not reproduced here. This is the
      // one concession to it: the card arrives rather than simply appearing,
      // without asking a reader who has cleared their storage to sit through
      // a sequence to get to a button they may have already pressed once.
      className="fixed inset-0 z-60 overflow-y-auto bg-surface motion-safe:animate-[fade-in_320ms_ease-out]"
    >
      {/* A portal renders outside the provider's [data-ws], so without this
          every var(--ws-color) below would fall back to the app default
          rather than the workspace a returning reader actually left off in. */}
      <AccentScope color={workspace.color}>
        <div className="relative flex min-h-dvh flex-col pt-[env(safe-area-inset-top)]">
          {/* The wall of covers, sized by its own two rows rather than a
              guessed viewport fraction — a fixed `dvh` band and eight covers
              whose real aspect ratio is `102/139` were never going to agree on
              a height, and the gap between what the grid actually rendered and
              what the band claimed was empty paper with nothing on it. This
              wrapper is exactly as tall as the grid inside it, on any screen,
              so the fade and the content below start where the covers end. */}
          <div className="relative shrink-0">
            {/* `CoverTile` itself, not a redrawing of it — the same designed
                fallback and the same sampled hue a reader meets on the shelf
                one screen later, so the wall behind this title is not a
                second, slightly different idea of what a cover looks like. */}
            <ul aria-hidden className="pointer-events-none grid grid-cols-4 gap-2.5 p-2.5">
              {LAUNCH_SHELF.map((b) => (
                <li key={b.code ?? b.title_hi}>
                  <CoverTile book={b} size="grid" caption="none" />
                </li>
              ))}
            </ul>
            {/* The page's own ground, faded in over the lower half of the
                grid's own height — never a fixed pixel figure, which would
                cover more or less of the last row depending on how wide the
                grid ended up. */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, transparent 35%, var(--color-surface) 88%)",
              }}
            />
          </div>

          <div className="relative z-10 -mt-6 mx-auto flex w-full max-w-sm flex-1 flex-col items-center px-6 text-center">
            <span aria-hidden>
              <BrandMark className="h-16 w-16" />
            </span>

            <h1 className="mt-4 font-display text-3xl font-medium leading-tight tracking-[-0.015em]" style={{ color: "var(--ws-color)" }}>
              Madhyasth Darshan
            </h1>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">Study App</p>

            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              The all-in-one platform to read original literature, explore deep
              study resources, and connect with fellow students on the path of
              coexistence.
            </p>

            {/* The one thing the deck itself never names — whose literature
                this is. A photograph and two lines, not a biography: the deck
                that follows is about the app, and this is the whole reason
                for it. */}
            <div className="mt-6 flex w-full items-center gap-3 rounded-card border border-rule bg-card p-3 text-start shadow-card">
              {/* eslint-disable-next-line @next/next/no-img-element -- a
                  fixed local asset, not a remote or user-supplied one; see
                  BrandMark for the same call. */}
              <img
                src="/brand/anagraj.jpg"
                alt="Shri A. Nagraj"
                className="h-14 w-14 shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0">
                <p lang="hi" className="hi hi-tight text-sm font-semibold" style={{ color: "var(--ws-color)" }}>
                  मध्यस्थ दर्शन सह-अस्तित्ववाद
                </p>
                <p lang="hi" className="hi hi-tight mt-0.5 text-xs text-ink-soft">
                  प्रणेता: श्री ए. नागराज, अमरकंटक, म.प्र.
                </p>
              </div>
            </div>

            <button
              ref={goRef}
              type="button"
              onClick={onDone}
              className={`${ctaPrimary} mt-auto mb-[max(1.5rem,env(safe-area-inset-bottom))] w-full`}
              style={{ background: "var(--ws-color)" }}
            >
              Start Your Journey
            </button>
          </div>
        </div>
      </AccentScope>
    </div>,
    document.body
  );
}

