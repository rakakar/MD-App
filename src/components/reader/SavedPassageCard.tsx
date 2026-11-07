"use client";

import { SavedCardFooter, savedDate } from "@/components/me/SavedCard";
import { parseRef, shareCitation } from "@/lib/refs";
import type { HighlightColour } from "@/lib/storage";

/**
 * **My Journey's highlight and note cards, inside the reader.**
 *
 * The reader's Highlights and Notes lists (the desktop panel and the phone
 * sheet) were their own design — a thin colour rule beside the words and a
 * "Go to ↗" — while My Journey showed the same rows as cards with the words in
 * their colour and Share and Delete underneath. The designer's call (7 Nov
 * 2026): one card, wherever the list is. Same structure as
 * `app/me/bookmarks` and `app/me/notes`, on the reader's paper (`--reader-*`)
 * so it follows Original, Sepia and Quiet rather than the app theme.
 *
 * Two differences from My Journey, both because the book is already open:
 * the footer names the chapter rather than the book, and tapping the card
 * moves the page under the panel instead of navigating.
 */

/** Tailwind cannot build a class name at runtime; the three are written out. */
const FILL: Record<HighlightColour, string> = {
  amber: "bg-hl-amber",
  sage: "bg-hl-sage",
  sky: "bg-hl-sky",
};

const CARD =
  "relative rounded-card border border-(--reader-rule) bg-(--reader-bg) p-4 shadow-sm transition-colors hover:border-(--reader-ink-soft)";

/**
 * The whole card is the tap target, drawn as a button stretched behind the
 * content so the words stay plain text the clamp can cut cleanly. The footer's
 * Share and Delete sit above it (`relative z-10` in the footer).
 */
function GoButton({ label, onGo }: { label: string; onGo: () => void }) {
  return (
    <button
      type="button"
      onClick={onGo}
      aria-label={label}
      className="absolute inset-0 rounded-card focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ outlineColor: "var(--ws-ink)" }}
    />
  );
}

export function HighlightCard({
  canonicalRef,
  text,
  colour,
  createdAt,
  chapterLabel,
  bookTitle,
  note,
  onGo,
  onDelete,
}: {
  canonicalRef: string;
  text?: string;
  /** for the shared message — the footer shows the chapter instead */
  bookTitle: string;
  /** the paragraph's note, carried along when the highlight is shared */
  note?: string;
  colour?: HighlightColour;
  createdAt: string;
  /** the chapter's name, where My Journey's card names the book */
  chapterLabel: string;
  onGo: () => void;
  onDelete: () => void;
}) {
  const page = parseRef(canonicalRef)?.page ?? "";
  const words = text || canonicalRef;
  return (
    <article className={CARD}>
      <GoButton label={`Go to highlight on page ${page}`} onGo={onGo} />
      <p lang="hi" className="hi line-clamp-4 text-title leading-relaxed">
        <span className={colour ? `box-decoration-clone rounded-md px-1 ${FILL[colour]}` : ""}>
          {words}
        </span>
      </p>
      <SavedCardFooter
        tone="reader"
        bookTitle={chapterLabel}
        page={page}
        date={savedDate(createdAt)}
        shareText={shareCitation({
          passage: text,
          note,
          bookTitle,
          ref: canonicalRef,
          origin: window.location.origin,
        })}
        onDelete={onDelete}
        deleteLabel={`Remove highlight on page ${page}`}
      />
    </article>
  );
}

export function NoteCard({
  canonicalRef,
  note,
  passage,
  createdAt,
  chapterLabel,
  bookTitle,
  onGo,
  onDelete,
}: {
  canonicalRef: string;
  bookTitle: string;
  note: string;
  /** the words the note is about */
  passage?: string;
  createdAt: string;
  chapterLabel: string;
  onGo: () => void;
  onDelete: () => void;
}) {
  const page = parseRef(canonicalRef)?.page ?? "";
  return (
    <article className={CARD}>
      <GoButton label={`Go to note on page ${page}`} onGo={onGo} />
      {/* The passage first, then what was said about it — the order and the
          rule that marks it as quoted are My Journey's note card's. */}
      {passage && (
        <p
          lang="hi"
          className="hi line-clamp-2 border-s-2 ps-3 text-sm leading-relaxed text-(--reader-ink-soft)"
          style={{ borderColor: "var(--ws-color)" }}
        >
          {passage}
        </p>
      )}
      <p className={`whitespace-pre-wrap text-title leading-relaxed ${passage ? "mt-3" : ""}`}>{note}</p>
      <SavedCardFooter
        tone="reader"
        bookTitle={chapterLabel}
        page={page}
        date={savedDate(createdAt)}
        shareText={shareCitation({
          passage,
          note,
          bookTitle,
          ref: canonicalRef,
          origin: window.location.origin,
        })}
        onDelete={onDelete}
        deleteLabel={`Delete note on page ${page}`}
      />
    </article>
  );
}
