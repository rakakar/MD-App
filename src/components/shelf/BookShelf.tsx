import { getBookGenres, getBooks } from "@/lib/api";
import { genreLabel, genreRank } from "@/lib/labels";
import type { BookGenre, BookSummary } from "@/lib/types";
import { ShelfGrid, type ShelfAxis, type ShelfChip } from "./ShelfGrid";

export { ShelfCard } from "./ShelfGrid";
export type { ShelfAxis } from "./ShelfGrid";

/**
 * The books shelf for Originals and Translations.
 *
 * One component, two axes — on purpose. The workspaces hold different kinds of
 * thing, so each is filtered by the axis its content is actually organized by:
 * Originals by **genre** (what kind of writing it is), Translations by
 * **language**. They share the chip presentation and nothing else; a genre
 * chip never appears on Translations, and Resources — a file library — has no
 * business on this page at all.
 *
 * This half fetches — the chips and the whole shelf, never a filtered one —
 * and `ShelfGrid` applies the chip from the URL in the browser. That split is
 * what lets the pages using it be prerendered; see `ShelfGrid`.
 */
interface ShelfProps {
  /** the workspace this shelf browses; its code is the ?workspace= value (§10) */
  workspace: "originals" | "translations";
  axis: ShelfAxis;
  /** route the chips link back to, e.g. "/books" or "/translations" */
  basePath: string;
  /** query params to carry through every chip link */
  carry?: Record<string, string>;
}

export async function BookShelf({ workspace, axis, basePath, carry = {} }: ShelfProps) {
  const [options, books] = await (axis === "genre" ? genreShelf() : languageShelf());
  return (
    <ShelfGrid
      workspace={workspace}
      axis={axis}
      basePath={basePath}
      carry={carry}
      options={options}
      books={books}
    />
  );
}

async function genreShelf(): Promise<[ShelfChip[], BookSummary[]]> {
  const [genres, books] = await Promise.all([
    getBookGenres().catch(() => [] as BookGenre[]),
    getBooks({ workspace: "originals" }).catch(() => [] as BookSummary[]),
  ]);
  return [
    genres
      // An empty chip is a dead filter — a reader who taps it learns nothing
      // and has to come back. `book_count` already counts published books
      // only, and counts a translation through its original.
      .filter((g) => g.book_count > 0)
      // The shelf's reading order — Parichay, Darshan, Vaad, Shastra — so the
      // chips read in the order the covers below them do. The API's own
      // `ordering` puts Darshan first; it only breaks ties among the rest.
      .sort((a, b) => genreRank(a.code) - genreRank(b.code) || a.ordering - b.ordering)
      // The API's `name` is English now (§11.1); the Hindi lives in the FE.
      // Every row still renders — a genre added after we shipped keeps its
      // English name rather than dropping off the shelf.
      .map((g) => ({ value: g.code, label: genreLabel(g.code, g.name) })),
    books,
  ];
}

async function languageShelf(): Promise<[ShelfChip[], BookSummary[]]> {
  // Languages are not a table of their own — the chips are whichever languages
  // the published translations are actually in, so a first Tamil translation
  // brings its own chip with it.
  const all = await getBooks({ workspace: "translations" }).catch(() => [] as BookSummary[]);

  const byCode = new Map<string, string>();
  for (const b of all) {
    if (b.language) byCode.set(b.language, b.language_label || b.language);
  }

  return [
    [...byCode].map(([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label)
    ),
    all,
  ];
}
