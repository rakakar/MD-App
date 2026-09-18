"use client";

import { useId, useState } from "react";
import { InfoIcon } from "@/components/shell/icons";

/**
 * A page title with its one-line description tucked behind an `i`, and a
 * fact about the page ranged right on the same line.
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
 */
export function ShelfTitle({
  title,
  description,
  meta,
}: {
  title: string;
  description: string;
  /** "73 recordings · 7 collections" — beside the title, ranged right */
  meta?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <div>
      <div className="flex items-center gap-2">
        {/* The app's page-title step rather than the taller one this page had.
            `text-2xl` is what Centres and Connect set theirs at; Media stood a
            size above every other page title in the app for no reason the
            page itself gave. */}
        <h1 className="font-display text-2xl font-medium leading-tight tracking-[-0.015em] lg:text-3xl">
          {title}
        </h1>
        {/* 24px of glyph in a 44px target: the ring is small because it sits
            beside a title and must not compete with it, and the target is not
            because a thumb is not small. The negative margin gives the extra
            back so the title's line is not pushed taller. */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={id}
          aria-label={open ? `Hide what ${title} holds` : `What ${title} holds`}
          className="-m-2.5 inline-flex items-center justify-center p-2.5 text-ink-soft transition-colors hover:text-ink"
        >
          <InfoIcon className="h-6 w-6" />
        </button>
        {meta && (
          <p className="ml-auto whitespace-nowrap text-sm tabular-nums text-ink-soft">
            {meta}
          </p>
        )}
      </div>

      {/* The app's own disclosure — the same grid-rows ease the centre and link
          cards open with — so it arrives rather than appears, and is `inert`
          while shut so a screen reader does not read a sentence that is not
          on screen. */}
      <div className="disclosure" data-open={open} inert={!open}>
        <div>
          <p id={id} className="pt-1.5 text-sm text-ink-soft">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
