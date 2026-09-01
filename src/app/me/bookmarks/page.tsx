"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { bookTitle, PersonalHeader, usePersonalRows } from "@/components/me/PersonalTabs";
import { SavedCardFooter, savedDate } from "@/components/me/SavedCard";
import { EmptyState, PageContainer } from "@/components/ui";
import { unsaveBookmark } from "@/lib/personal";
import { parseRef, refToHref } from "@/lib/refs";
import type { HighlightColour, LocalBookmark } from "@/lib/storage";

/** Tailwind cannot build a class name at runtime; the three are written out. */
const FILL: Record<HighlightColour, string> = {
  amber: "bg-hl-amber",
  sage: "bg-hl-sage",
  sky: "bg-hl-sky",
};

/**
 * **Highlights — every book, in one place.**
 *
 * This was "Bookmarks", and the rename is the whole change. The designer took
 * the bookmark button off the reader's bottom bar: a position saved with no
 * words attached turned out to be the thing nobody came back for, and
 * selecting a passage now offers the two things they do — paint it, or write
 * against it.
 *
 * Nothing anyone saved is lost, and nothing had to be migrated, because a
 * highlight *is* a bookmark with a colour in the store. Rows saved before the
 * colours existed simply have none and show unpainted, which is exactly what
 * they are: a passage somebody kept.
 *
 * Per-book highlights, with their notes and grouped by chapter, live on the
 * book's own Highlights & Notes tab. This is the cross-book list — the
 * Highlights half of My Journey's own Highlights & Notes, whose other tab is
 * `/me/notes`. See `PersonalTabs` for why the two are one heading now.
 */
/**
 * What one saved row shows: the words the reader painted, and in which colour.
 *
 * A paragraph can hold several highlights (§6.0) while this list draws one row
 * per saved *passage*, so the spans are joined with an ellipsis rather than
 * split into rows — this screen answers "what have I saved", and the book's own
 * Highlights tab is where each one gets its own card. A row with no spans is a
 * whole-paragraph highlight or a plain save, and shows the passage as before.
 */
function saved(b: LocalBookmark): { text?: string; colour?: HighlightColour } {
  const spans = b.ranges ?? [];
  if (spans.length === 0) return { text: b.text_hi, colour: b.colour };
  return { text: spans.map((s) => s.text).join(" … "), colour: spans[0].colour };
}

export default function BookmarksPage() {
  const { user } = useAuth();
  const { rows, reload, titles } = usePersonalRows();
  /** the book the list is narrowed to, or null for all of them */
  const [book, setBook] = useState<string | null>(null);
  const all = rows?.bookmarks ?? null;
  const highlights = all && book ? all.filter((b) => b.book_code === book) : all;

  const remove = (ref: string) => {
    unsaveBookmark(ref, !!user);
    reload();
  };

  return (
    <PageContainer>
      <PersonalHeader
        active="highlights"
        rows={rows}
        titles={titles}
        book={book}
        onBook={setBook}
      />

      <div className="mt-5">
        {highlights === null ? null : highlights.length === 0 ? (
          <EmptyState
            title="Nothing highlighted yet"
            hint="Press and hold any line while reading, then pick a colour."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {highlights.map((b) => {
              const painted = saved(b);
              const ref = parseRef(b.canonical_ref);
              const href = refToHref(b.canonical_ref);
              return (
                <li key={b.canonical_ref}>
                  {/* A card each, not rows in one bordered list. A highlight is
                      a thing somebody kept, and the passage is the whole of it
                      — down a divided list the words were a line of a table.
                      `relative`, because the footer's two controls have to sit
                      above the link the title stretches over it. */}
                  <article className="relative rounded-card border border-rule bg-card p-4 shadow-card">
                    {painted.text ? (
                      /* Clamped, because a highlight is often a whole
                         paragraph: unbounded, one card came out 681px and a
                         list of them is a list of one. Four lines rather than
                         the two this had as a row — the card can afford them
                         and a passage cut at two is a fragment — and the whole
                         of it is one tap away in the reader. */
                      <p lang="hi" className="hi line-clamp-4 text-title leading-relaxed">
                        {/* Painted in the colour it was saved in, so this list
                            reads the way the page did. A row from before the
                            colours existed gets none and reads as a quotation. */}
                        <span
                          className={
                            painted.colour
                              ? `box-decoration-clone rounded-md px-1 ${FILL[painted.colour]}`
                              : ""
                          }
                        >
                          <Link href={href} className="after:absolute after:inset-0">
                            {painted.text}
                          </Link>
                        </span>
                      </p>
                    ) : (
                      <p className="text-title font-medium">
                        <Link href={href} className="after:absolute after:inset-0">
                          {b.canonical_ref}
                        </Link>
                      </p>
                    )}

                    <SavedCardFooter
                      bookTitle={bookTitle(b.book_code, titles)}
                      page={ref?.page ?? ""}
                      date={savedDate(b.created_at)}
                      shareTitle={painted.text ?? b.canonical_ref}
                      href={href}
                      onDelete={() => remove(b.canonical_ref)}
                      deleteLabel={`Remove highlight ${b.canonical_ref}`}
                    />
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageContainer>
  );
}
