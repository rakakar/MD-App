"use client";

import { useId, useState } from "react";
import { InfoIcon } from "@/components/shell/icons";

/**
 * A page title with its one-line description — and the count of what the page
 * holds, under it — tucked behind an `i`.
 *
 * **The description is still there, just not in the way.** It says what the
 * page is — "Discourses, satsangs and shivir sessions of Shri A. Nagraj" — and
 * a reader needs that exactly once. Printed every visit it was a full line of
 * text between the title and the search box, pushing the first collection down
 * on the one screen where how soon it appears matters most. Behind the `i` it
 * costs nothing until asked for.
 *
 * It opens in place, under the title, rather than as a popover: it is a
 * sentence to read, not a menu to pick from, and a popover over the controls
 * would hide the very search box a reader who just learnt what the page holds
 * is about to use.
 *
 * **Phone only.** Both savings were for a phone's height; a desktop has the
 * room, so there the description is simply printed under the title, with no
 * `i` to press, and the count under that (designer's call, 1 Oct 2026).
 *
 * Born on Media and now every top-level page's title (designer's call, 7 Oct
 * 2026), so a phone reader meets one title step and one way of asking what a
 * page is, wherever they are. Only the *description* goes behind the `i`:
 * anything a page says about what its contents are worth — Translations'
 * "Important note" — stays printed by the page itself, below this.
 */
export function PageTitle({
  title,
  description,
  meta,
  shelf = false,
  className,
}: {
  title: React.ReactNode;
  /** what the page is, in a sentence */
  description?: React.ReactNode;
  /** "73 recordings · 7 collections" — under the description, hidden with it on a phone */
  meta?: React.ReactNode;
  /**
   * The shelves' larger desktop step (`lg:text-4xl`). On a phone every title
   * is the same `text-2xl`; on a desktop the shelves — Media, Library, Books —
   * keep the step that heads a page of covers, and the text pages keep theirs.
   */
  shelf?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const label = typeof title === "string" ? title : "this page";
  const hasMore = Boolean(description || meta);

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <h1
          className={`font-display text-2xl font-medium leading-tight tracking-[-0.015em] ${shelf ? "lg:text-4xl" : ""}`}
        >
          {title}
        </h1>
        {/* 20px of glyph in a 44px target: at that size the ring stands
            exactly as tall as the title's capitals (16px at text-2xl), so it
            reads as part of the title rather than a badge beside it, and the
            target is still a thumb's. The negative margin gives the extra back
            so the title's line is not pushed taller. Centring leaves the ring's
            foot 2px below the baseline (Newsreader sits high in its line box),
            so the glyph is lifted to stand on the letters' line. */}
        {hasMore && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={id}
            aria-label={open ? `Hide what ${label} holds` : `What ${label} holds`}
            className="-m-3 inline-flex items-center justify-center p-3 text-ink-soft transition-colors hover:text-ink lg:hidden"
          >
            <InfoIcon className="h-5 w-5 -translate-y-0.5" />
          </button>
        )}
      </div>

      {hasMore && (
        <>
          {/* The app's own disclosure — the same grid-rows ease the centre and
              link cards open with — so it arrives rather than appears, and is
              `inert` while shut so a screen reader does not read a sentence
              that is not on screen. */}
          <div className="disclosure lg:hidden" data-open={open} inert={!open}>
            <div>
              <div id={id} className="pt-1.5 text-sm text-ink-soft">
                {description && <p>{description}</p>}
                {/* The count goes with the description rather than beside the
                    title: both answer "what is this page", and a reader who
                    has not asked needs neither (designer's call, 7 Oct 2026). */}
                {meta && <p className={`${description ? "mt-1" : ""} tabular-nums`}>{meta}</p>}
              </div>
            </div>
          </div>
          {/* Desktop: the description, and the count on its own line under it —
              what the page holds, then how much of it. */}
          <div className="hidden lg:block">
            {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
            {meta && <p className="mt-1 text-sm tabular-nums text-ink-soft">{meta}</p>}
          </div>
        </>
      )}
    </div>
  );
}
