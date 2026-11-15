"use client";

import { useId, useState } from "react";

/**
 * A paragraph's footnote: the printed asterisk, and the note it opens.
 *
 * Until 15 Nov 2026 the note lived only in the asterisk's `title`, which a
 * browser shows when a mouse rests on it — so on a phone or a tablet, where
 * most of this book is read, footnotes could not be read at all, and a tap on
 * the asterisk only showed or hid the bars (UX audit RD6).
 *
 * The asterisk stays the size the page prints it at; the button around it has
 * a 44px hit area drawn by `::before`, so the line it sits in does not grow.
 * The note opens in place, under its paragraph's words, in the reader's soft
 * ink with the rule the reader already draws — it is the book's own aside, not
 * an app panel, so it does not get a sheet.
 *
 * Both parts are `data-not-text`: they sit inside the paragraph's element but
 * are not its `text_hi`, and counting them would shift every highlight in the
 * paragraph (see `lib/highlights.ts`). `data-footnote` keeps a tap on the open
 * note from also showing or hiding the reader's bars.
 */
export function Footnote({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <button
        type="button"
        data-not-text
        aria-expanded={open}
        aria-controls={id}
        aria-label={open ? "Hide footnote" : "Show footnote"}
        onClick={() => setOpen((o) => !o)}
        className="relative ms-1 cursor-pointer align-super text-[max(0.7em,0.8125rem)] leading-none text-(--reader-ink-soft) before:absolute before:top-1/2 before:left-1/2 before:size-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] hover:text-(--reader-ink) focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ws-color)"
      >
        *
      </button>
      {open && (
        <span
          id={id}
          role="note"
          data-not-text
          data-footnote
          className="mt-2 mb-1 block border-s-2 border-(--reader-rule) ps-3 text-start text-[max(0.85em,0.8125rem)] text-(--reader-ink-soft)"
        >
          {text}
        </span>
      )}
    </>
  );
}
