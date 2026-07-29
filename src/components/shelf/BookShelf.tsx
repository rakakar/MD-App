import { BookCard, EmptyState, FilterChips } from "@/components/ui";
import { getBookGenres, getBooks } from "@/lib/api";
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
  /** the BE section this shelf browses; its code is the workspace id (§10) */
  section: "originals" | "translations";
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
  section,
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
        label={axis === "genre" ? "विधा · Filter by genre" : "भाषा · Filter by language"}
        allHref={href(basePath, carry)}
        active={selected}
        options={options.map((o) => ({
          ...o,
          href: href(basePath, carry, [axis, o.value]),
        }))}
      />

      {books.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {books.map((b) => (
            <BookCard key={b.code} book={b} />
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState
            title={section === "translations" ? "अनुवाद अभी नहीं" : "यहाँ अभी कुछ नहीं"}
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

type Chip = { value: string; label: string };

async function genreShelf(selected?: string): Promise<[Chip[], BookSummary[]]> {
  const [genres, books] = await Promise.all([
    getBookGenres().catch(() => [] as BookGenre[]),
    getBooks({ section: "originals", genre: selected }).catch(() => [] as BookSummary[]),
  ]);
  return [
    genres
      // An empty chip is a dead filter — a reader who taps it learns nothing
      // and has to come back. `book_count` already counts published books
      // only, and counts a translation through its original.
      .filter((g) => g.book_count > 0)
      .sort((a, b) => a.ordering - b.ordering)
      .map((g) => ({ value: g.code, label: g.name_hi || g.name_en || g.code })),
    books,
  ];
}

async function languageShelf(selected?: string): Promise<[Chip[], BookSummary[]]> {
  // Languages are not a table of their own — the chips are whichever languages
  // the published translations are actually in, so a first Tamil translation
  // brings its own chip with it.
  const [all, filtered] = await Promise.all([
    getBooks({ section: "translations" }).catch(() => [] as BookSummary[]),
    selected
      ? getBooks({ section: "translations", language: selected }).catch(
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
