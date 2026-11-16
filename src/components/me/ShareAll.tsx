"use client";

import { useState } from "react";
import { ShareIcon } from "@/components/shell/icons";
import { parseRef, shareCitation, type SharedSpan } from "@/lib/refs";

/** One saved passage, as it goes into the shared message. */
export interface ShareAllItem {
  ref: string;
  passage?: string;
  note?: string;
  spans?: (SharedSpan | undefined)[];
}

/** book order: front matter first, then chapter, page, paragraph */
function place(ref: string): [number, number, number] {
  const p = parseRef(ref);
  if (!p) return [1e9, 0, 0];
  const page = Number(p.page);
  return [p.chapter === "fm" ? -1 : Number(p.chapter) || 0, Number.isFinite(page) ? page : 0, Number(p.para) || 0];
}

/**
 * **A book's notes or highlights as one message** (16 Nov 2026, UX audit ST6).
 *
 * Sending a chapter's notes to a study group meant sharing them card by card,
 * and the one export there was wrote a Markdown file a phone cannot open. This
 * is plain text instead: the book's name once at the top, then each passage as
 * a single share would send it (`shareCitation` — words, note, page, link) in
 * the book's order, so the group reads them as the chapter runs.
 */
export function shareAllText(bookTitle: string, items: ShareAllItem[], origin: string): string {
  const ordered = [...items].sort((a, b) => {
    const x = place(a.ref);
    const y = place(b.ref);
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
  });
  return [
    bookTitle.trim(),
    ...ordered.map((i) =>
      // No book title per item: it is the heading, and twelve repeats of it
      // were most of the message.
      shareCitation({ passage: i.passage, note: i.note, ref: i.ref, origin, spans: i.spans })
    ),
  ]
    .filter(Boolean)
    .join("\n\n———\n\n");
}

/**
 * "Share these notes": the phone's share sheet where there is one, the
 * clipboard where there is not (every desktop browser), saying so when it
 * copied.
 */
export function ShareAllButton({
  label,
  bookTitle,
  items,
  className,
}: {
  label: string;
  bookTitle: string;
  items: ShareAllItem[];
  className: string;
}) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const text = shareAllText(bookTitle, items, window.location.origin);
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // cancelled, or a browser that refuses both — neither is worth a dialog
    }
  };
  return (
    <button type="button" onClick={() => void share()} className={className} aria-live="polite">
      <ShareIcon className="h-4 w-4" />
      {copied ? "Copied — paste it anywhere" : label}
    </button>
  );
}
