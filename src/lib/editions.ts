import { getBook } from "./api";
import type { BookDetail } from "./types";

/**
 * The same work in another language, reachable from inside the reader.
 *
 * A translation is a separate book with its own code, its own chapters and its
 * own printed pages (contract §12) — which is why this is a *navigation*
 * problem and not a rendering one. Nothing about the reader changes when you
 * switch; it is handed a different book.
 *
 * The one thing the FE must not do here is pretend the two texts are aligned.
 * §12.2 is explicit that `MVD-EN 3.42.5` is not `MVD 3.42.5`, and the corpus
 * bears it out — JVEP chapter 1 has 52 paragraphs, JVE-ENG chapter 1 has 108.
 * So this carries the reader across at *chapter* granularity and no finer, and
 * only when the chapter demonstrably exists on the other side.
 */
export interface EditionRef {
  code: string;
  /** the language, short — "हिन्दी", "English". What actually differs. */
  label: string;
  /** ISO 639-1, for `hreflang` and for telling the original apart */
  language: string;
  /** who rendered this one; "" on the original, whose author is the author */
  translator: string;
  /** the work itself rather than somebody's rendering of it */
  isOriginal: boolean;
  /** whether this is the edition being read right now */
  current: boolean;
  /**
   * The chapter numbers this edition actually has.
   *
   * Carried instead of a finished link, and that is the whole reason this is a
   * list rather than a URL: the reader moves between chapters with
   * `history.pushState`, so the server component that resolved these renders
   * once and never again. A link built here would still point at the chapter
   * the reader *arrived* at — walk three chapters on, press "English", and you
   * land back at chapter 1. Handing over the numbers lets the switch be
   * resolved against wherever the reader has actually got to.
   */
  chapters: number[];
}

/**
 * Where this edition's copy of a chapter lives — or its contents, when it has
 * no such chapter.
 *
 * Editions are divided differently (§12.2, and the corpus agrees), so the
 * chapter number is an offer, not a promise. Landing a reader on a table of
 * contents is the honest failure; guessing a nearby chapter would be a wrong
 * answer wearing the same clothes as a right one.
 */
export function editionHref(edition: EditionRef, chapter: number): string {
  const base = `/books/${encodeURIComponent(edition.code)}`;
  return edition.chapters.includes(chapter) ? `${base}/${chapter}` : base;
}

/** "हिन्दी (Hindi)" → "हिन्दी"; the parenthetical is for a shelf, not a pill */
export function shortLanguage(label: string, fallback: string): string {
  return label.replace(/\s*\([^)]*\)\s*$/, "").trim() || fallback;
}

/**
 * Every edition of the work the given book belongs to, the current one
 * included — or `[]` when there is nothing to switch to.
 *
 * **The original is the hub.** `translations[]` is populated only there and is
 * always empty on a translation (§12, "no chains"), so reaching the siblings of
 * the edition you are reading means going through the original. That is one
 * extra fetch on a translation's chapter and none at all on the common case of
 * a book with no translations, which exits on the first branch.
 */
export async function chapterEditions(book: BookDetail): Promise<EditionRef[]> {
  const original = book.translation_of
    ? await getBook(book.translation_of).catch(() => null)
    : book;
  // No translations means no choice to offer. On a translation this can only be
  // the original having gone missing, which is the same answer: show nothing
  // rather than a control that cannot say where it leads.
  if (!original || original.translations.length === 0) return [];

  // The current book's own chapters are already in hand; the rest have to be
  // asked for, because a table of contents is the only way to know whether this
  // chapter number means anything over there. Failures fall back to the
  // edition's front door rather than dropping it from the list — a reader can
  // still get to it, they just arrive at its contents.
  const strangers = original.translations.filter((t) => t.code !== book.code);
  const details = await Promise.all(
    strangers.map((t) => getBook(t.code).catch(() => null))
  );
  const chaptersOf = new Map<string, BookDetail["chapters"] | null>([
    [book.code, book.chapters],
    ...details.map(
      (d, i) => [strangers[i].code, d?.chapters ?? null] as const
    ),
  ]);
  if (original.code !== book.code) chaptersOf.set(original.code, original.chapters);

  const entry = (
    code: string,
    languageLabel: string,
    language: string,
    translator: string,
    isOriginal: boolean
  ): EditionRef => ({
    code,
    label: shortLanguage(languageLabel, language),
    language,
    translator,
    isOriginal,
    current: code === book.code,
    // An edition whose contents could not be fetched keeps an empty list, which
    // sends every chapter to its front door — the same answer as a chapter that
    // genuinely is not there, and the only one that is true either way.
    chapters: (chaptersOf.get(code) ?? []).map((c) => c.number),
  });

  return [
    entry(original.code, original.language_label, original.language, "", true),
    ...original.translations.map((t) =>
      entry(t.code, t.language_label, t.language, t.translator, false)
    ),
  ];
}
