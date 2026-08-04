import Link from "next/link";
import { CoverTile } from "@/components/shelf/CoverTile";
import { EmptyState, FilterChips } from "@/components/ui";
import { getBookGenres, getBooks } from "@/lib/api";
import { genreLabel } from "@/lib/labels";
import type { BookGenre, BookSummary } from "@/lib/types";

/**
 * The books shelf for Originals and Translations.
 *
 * One component, two axes — on purpose. The workspaces hold different kinds of
 * thing, so each is filtered by the axis its content is actually organized by:
 * Originals by **genre** (what kind of writing it is), Translations by
 * **language**. They share the chip presentation and nothing else; a genre
 * chip never appears on Translations, and Resources — a file library — has no
 * business on this page at all.
 */
export type ShelfAxis = "genre" | "language";

interface ShelfProps {
  /** the workspace this shelf browses; its code is the ?workspace= value (§10) */
  workspace: "originals" | "translations";
  axis: ShelfAxis;
  /** route the chips link back to, e.g. "/books" or "/translations" */
  basePath: string;
  /** query params to carry through every chip link (e.g. ws=translations) */
  carry?: Record<string, string>;
  /** the selected chip value, from the URL */
  selected?: string;
}

function href(basePath: string, carry: Record<string, string>, extra?: [string, string]) {
  const p = new URLSearchParams(carry);
  if (extra) p.set(extra[0], extra[1]);
  const s = p.toString();
  return s ? `${basePath}?${s}` : basePath;
}

export async function BookShelf({
  workspace,
  axis,
  basePath,
  carry = {},
  selected,
}: ShelfProps) {
  const [options, books] = await (axis === "genre"
    ? genreShelf(selected)
    : languageShelf(selected));

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
    <Link
      href={`/books/${encodeURIComponent(book.code)}`}
      className="group flex h-full flex-col gap-2.5 rounded-[18px] border border-rule bg-white p-3 transition-shadow hover:shadow-md"
    >
      <CoverTile book={book} size="grid" />
      <span
        lang="hi"
        className="hi line-clamp-2 text-[13.5px] font-semibold leading-snug group-hover:underline"
      >
        {book.title_hi}
      </span>
      {/* Said on the shelf, not only on the book's own page: a reader who taps
          a cover expecting the reader and gets a scanned PDF has been misled
          by the card, and the fact is one word long. */}
      {book.is_pdf_only && (
        <span className="-mt-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
          PDF
        </span>
      )}
      <span className="mt-auto block text-[11px] font-medium text-ink-soft">
        {book.translation_of && book.language_label ? (
          <span lang="hi" className="hi">{book.language_label} · </span>
        ) : null}
        {book.page_count ? `${book.page_count} pages` : book.author}
      </span>
      {book.translation_of && book.translator && (
        <span className="-mt-1.5 block truncate text-[11px] text-ink-soft">
          Translator: {book.translator}
        </span>
      )}
    </Link>
  );
}

type Chip = { value: string; label: string };

async function genreShelf(selected?: string): Promise<[Chip[], BookSummary[]]> {
  const [genres, books] = await Promise.all([
    getBookGenres().catch(() => [] as BookGenre[]),
    getBooks({ workspace: "originals", genre: selected }).catch(() => [] as BookSummary[]),
  ]);
  return [
    genres
      // An empty chip is a dead filter — a reader who taps it learns nothing
      // and has to come back. `book_count` already counts published books
      // only, and counts a translation through its original.
      .filter((g) => g.book_count > 0)
      .sort((a, b) => a.ordering - b.ordering)
      // The API's `name` is English now (§11.1); the Hindi lives in the FE.
      // Every row still renders — a genre added after we shipped keeps its
      // English name rather than dropping off the shelf.
      .map((g) => ({ value: g.code, label: genreLabel(g.code, g.name) })),
    books,
  ];
}

async function languageShelf(selected?: string): Promise<[Chip[], BookSummary[]]> {
  // Languages are not a table of their own — the chips are whichever languages
  // the published translations are actually in, so a first Tamil translation
  // brings its own chip with it.
  const [all, filtered] = await Promise.all([
    getBooks({ workspace: "translations" }).catch(() => [] as BookSummary[]),
    selected
      ? getBooks({ workspace: "translations", language: selected }).catch(
          () => [] as BookSummary[]
        )
      : null,
  ]);

  const byCode = new Map<string, string>();
  for (const b of all) {
    if (b.language) byCode.set(b.language, b.language_label || b.language);
  }

  return [
    [...byCode].map(([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label)
    ),
    filtered ?? all,
  ];
}
