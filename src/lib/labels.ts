// The few chrome words that are terms of art rather than plain English.
//
// The app's interface is English — every label, action, heading, count and
// empty state the FE authors itself. Content is untouched: a title, a folder
// name, a topic, a sutra, a chapter heading and a file name are rendered
// exactly as they arrive from the API.
//
// A handful of words sit on the line between the two. They are chrome — the FE
// writes them, they are not data — but they have no faithful English twin, and
// translating them would leave a reader unable to connect the app to the books,
// the discourses and the shivirs where the same words are spoken. Those keep
// their own name in Roman script, and live here so there is one spelling of
// each.
//
// Everything that *does* have a plain English word uses it and is not here:
// ग्रंथ→Books, सामग्री→Library, संसाधन→Resources, अध्याय→Chapter,
// विषय→Topic, प्रकार→Type, वर्ष→Year, विधा→Genre, and the three provenance
// badges in ProvenanceBadge.tsx.
//
// `Topic.name` arrives in Hindi and is rendered exactly as a manager typed it
// (§13.4). Nothing about topics belongs here.

/** the daily verse (PRD §3) — "Aphorism" is unrecognisable to this audience */
export const SUTRA = "Sutra";

/** a residential study camp — the word this audience uses in English too */
export const SHIVIR = "Shivir";
export const SHIVIRS = "Shivirs";

/**
 * The glossary, compiled from the परिभाषा संहिता and named for it.
 *
 * Kept as a name because it is one. The screens that introduce it say
 * "Glossary" alongside, once, so a reader meeting the word for the first time
 * is not guessing; after that the name stands on its own.
 */
export const PARIBHASHA = "Paribhasha";

/**
 * What a genre chip says (contract §11.1).
 *
 * The API's own English `name`, with the code as a last resort. There used to
 * be a Hindi translation table here; it was a second place to fix a typo, and
 * a genre a manager added after a deploy kept the English name anyway.
 */
export function genreLabel(code: string, apiName?: string): string {
  return apiName ?? code;
}

/**
 * The order a shelf of books reads in: Parichay, Darshan, Vaad, Shastra, then
 * whatever else.
 *
 * A reading order rather than the API's. The BE's own `ordering` puts Darshan
 * first because that is where the material begins — but a shelf is not a
 * syllabus, and the first cover a newcomer meets should be the one written to
 * be met first. Parichay is literally the introductory set; Darshan is the core
 * work it introduces.
 *
 * Unlisted genres — `diary`, `other`, anything a manager adds after a deploy —
 * fall to the end together rather than disappearing, and keep whatever order
 * the API gave them.
 */
const GENRE_ORDER = ["parichay", "darshan", "vaad", "shastra"];

/** Where a genre sits in that order; unknown and unfiled both sort last. */
export function genreRank(genre: string | null | undefined): number {
  const at = genre ? GENRE_ORDER.indexOf(genre) : -1;
  return at === -1 ? GENRE_ORDER.length : at;
}

/**
 * A shelf's books in reading order. Stable: two books of one genre keep the
 * order the API sent them in, which is the manager's own.
 */
export function byGenre<T extends { genre: string | null }>(books: T[]): T[] {
  return books
    .map((book, i) => ({ book, i }))
    .sort((a, b) => genreRank(a.book.genre) - genreRank(b.book.genre) || a.i - b.i)
    .map((row) => row.book);
}
