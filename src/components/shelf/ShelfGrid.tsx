"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CoverTile } from "@/components/shelf/CoverTile";
import { EmptyState, FilterChips } from "@/components/ui";
import { contentLang } from "@/lib/script";
import type { BookSummary } from "@/lib/types";

export type ShelfAxis = "genre" | "language";

export interface ShelfChip {
  value: string;
  label: string;
}

interface ShelfGridProps {
  workspace: "originals" | "translations";
  axis: ShelfAxis;
  basePath: string;
  carry: Record<string, string>;
  options: ShelfChip[];
  /** the whole shelf, unfiltered — the chips narrow it here */
  books: BookSummary[];
}

function href(basePath: string, carry: Record<string, string>, extra?: [string, string]) {
  const p = new URLSearchParams(carry);
  if (extra) p.set(extra[0], extra[1]);
  const s = p.toString();
  return s ? `${basePath}?${s}` : basePath;
}

/**
 * The shelf's chips and covers, **filtered in the browser.**
 *
 * The chip is a real URL (`?genre=darshan`), so it survives reload and
 * sharing, but it is read here rather than by the page. A page that awaits
 * `searchParams` is rendered on the server for every request — `/books` and
 * `/translations` were a cache MISS on every visit (0.3–1s), although the
 * shelf is the same dozen books for everyone. Now the page is prerendered
 * with the whole shelf, and a chip is a filter over a list already in hand:
 * no round trip at all.
 *
 * The local filter is the BE's own: `genre` and `language` on each book are
 * what `?genre=` and `?language=` match within one workspace (checked against
 * the API for every chip, 17 Oct 2026). If the BE ever filters on something a
 * book does not carry, this is the place that has to learn it.
 *
 * The Suspense fallback is the unfiltered shelf — what the prerendered HTML
 * shows, so a crawler and a slow phone both get every cover at once.
 */
export function ShelfGrid(props: ShelfGridProps) {
  return (
    <Suspense fallback={<ShelfView {...props} selected={undefined} />}>
      <ShelfFromUrl {...props} />
    </Suspense>
  );
}

function ShelfFromUrl(props: ShelfGridProps) {
  const selected = useSearchParams().get(props.axis) || undefined;
  return <ShelfView {...props} selected={selected} />;
}

function ShelfView({
  workspace,
  axis,
  basePath,
  carry,
  options,
  books: all,
  selected,
}: ShelfGridProps & { selected: string | undefined }) {
  const books = selected
    ? all.filter((b) => (axis === "genre" ? b.genre : b.language) === selected)
    : all;

  return (
    <>
      <FilterChips
        label={axis === "genre" ? "Filter by genre" : "Filter by language"}
        allHref={href(basePath, carry)}
        active={selected}
        options={options.map((o) => ({
          ...o,
          href: href(basePath, carry, [axis, o.value]),
        }))}
      />

      {books.length > 0 ? (
        // 2-up covers (design 1B), not full-width rows. On a shelf, the cover
        // is how a book is recognised and the fastest thing to scan; the rows
        // this replaced spent most of their width on an author repeated
        // identically down the page.
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {books.map((b) => (
            <li key={b.code}>
              <ShelfCard book={b} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5">
          <EmptyState
            title={workspace === "translations" ? "No translations yet" : "Nothing here yet"}
            hint={
              selected
                ? "Nothing published under this filter yet."
                : "Books appear here as they are published."
            }
          />
        </div>
      )}
    </>
  );
}

/**
 * One cover card on the shelf (design 1B).
 *
 * A translation keeps its translator on the card. `author` stays A. Nagraj on
 * a translation — the words are his, the rendering is not — so a card showing
 * only the author would credit him with a student's English.
 *
 * Exported because a book filed on another shelf is the same object: a
 * workspace is a shelf, not a treatment (PRD v2 §5.0.1), so a book under
 * Resources is still a book and must not look like a second kind of card.
 */
export function ShelfCard({ book }: { book: BookSummary }) {
  return (
    // No card around the cover, as the finished comps draw it. A cover is
    // already a rectangle with a border and a printed title on it; framing it
    // in a second bordered rectangle boxed a box, and cost the cover itself the
    // width — which on a two-up phone grid is the only thing being scanned.
    <Link
      href={`/books/${encodeURIComponent(book.code)}`}
      // gap-1 with the title carrying its own mt-1.5: the cover still gets its
      // 10px of air, and the title and its page count close from 8px to 4px.
      // They are one caption — a title and the size of the thing it names —
      // and at 8px apart under a 2-line Devanagari title they read as two.
      className="group flex h-full flex-col gap-1 rounded-card"
    >
      <CoverTile book={book} size="grid" />
      <span
        lang="hi"
        className="hi hi-tight mt-1.5 line-clamp-2 text-title font-semibold group-hover:underline"
      >
        {book.title_hi}
      </span>
      {/* Said on the shelf, not only on the book's own page: a reader who taps
          a cover expecting the reader and gets a scanned PDF has been misled
          by the card, and the fact is one word long. */}
      {book.is_pdf_only && (
        <span className="-mt-0.5 block text-xs font-bold uppercase tracking-wide text-ink-soft">
          PDF
        </span>
      )}
      {/* The language was hardcoded `lang="hi"` with the Devanagari class on
          it, which set the word "English" in Tiro Devanagari Hindi — a book
          face with no business rendering Latin — and carried that face's 1.85
          leading with it. On a 13px line whose own leading is 18px, one inline
          span at 24px pushes the whole line box out by six, which is where the
          gap under this row came from: not the flex gap, but a Devanagari
          measure applied to an English word.

          Script-detected now, like every other content string in the app. The
          Kannada labels resolve the same way — `scriptOf` tests for Devanagari
          specifically, and Tiro has no Kannada glyphs to offer them anyway.
          `hi-tight` rides along for the day a label really is Devanagari, so
          that one cannot reinflate the row either. */}
      <span className="mt-auto block text-xs font-medium text-ink-soft">
        {book.translation_of && book.language_label ? (
          <span
            {...contentLang(book.language_label)}
            className={`${contentLang(book.language_label).className} hi-tight`}
          >
            {book.language_label} ·{" "}
          </span>
        ) : null}
        {book.page_count ? `${book.page_count} pages` : book.author}
      </span>
      {book.translation_of && book.translator && (
        <span className="-mt-0.5 block truncate text-xs text-ink-soft">
          Translator: {book.translator}
        </span>
      )}
    </Link>
  );
}
