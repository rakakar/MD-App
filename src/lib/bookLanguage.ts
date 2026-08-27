import type { Paragraph } from "./types";

/**
 * **Telling the two halves of a bilingual book apart.**
 *
 * Four of the books on the Translations shelf are translations; two of them —
 * `JVE-ENG` and `JVEP-KND-GS` — are *facing-page bilingual print editions*,
 * and the pipeline ingested both sides. Reading either one gives a page of
 * Hindi, then the same page again in English or Kannada, all the way through.
 * The other two (`MAND-ENG-RG`, `MVD-KND-GS`) carry no Hindi at all.
 *
 * The API has no `lang` field on a paragraph, so which language a page is in
 * has to be worked out from the characters. That is a real inference and it is
 * worth being honest about where it is safe:
 *
 * - **By page, not by paragraph, and not by page parity.** Odd-Hindi /
 *   even-English holds for the middle chapters of both books and breaks in the
 *   front matter and in `JVE-ENG`'s Q&A chapter, so parity is out. Classifying
 *   each *page* by the script its letters are actually in was measured against
 *   the whole corpus: 4 pages of 220 in `JVE-ENG` and 2 of 198 in
 *   `JVEP-KND-GS` are internally mixed — about 1.5%.
 * - **Those mixed pages are mixed on purpose.** Every one is either front
 *   matter or a glossary — rows like "अस्तित्व Existence" and a 120-row
 *   bilingual term table. They are not a failure of the classifier; they are
 *   pages that genuinely belong to both languages, and {@link pageScript}
 *   returns `null` for them so they are shown whichever side you are reading.
 *
 * **Dominance, not presence.** `scriptOf` in `lib/script.ts` asks "is there any
 * Devanagari here", which is the right question for picking a font and the
 * wrong one here — it calls a glossary row Hindi. This counts letters and
 * needs a clear majority, so an English sentence quoting a Hindi term stays
 * English and a row that is half of each stays neutral.
 */

/** The scripts this corpus is actually published in. */
export type BookScript = "hi" | "en" | "kn";

/**
 * Which side of a bilingual book the reader wants — stored as the *role*
 * rather than as a language code, so one preference carries across books: a
 * reader who wants the English of `JVE-ENG` wants the Kannada of
 * `JVEP-KND-GS`, and neither is "en".
 */
export type ReadingSide = "original" | "translated";

/** Devanagari, Kannada, Latin. Add a range here when a new script is published. */
const RANGES: Record<Exclude<BookScript, "en">, [number, number]> = {
  hi: [0x0900, 0x097f],
  kn: [0x0c80, 0x0cff],
};

/**
 * How much of a page's lettering must agree before we call it one language.
 *
 * 0.85 rather than a bare majority: the cost of being wrong is hiding a page
 * the reader wanted, and a page that is only 60% one script is exactly the
 * bilingual glossary this is meant to leave alone.
 */
const DOMINANCE = 0.85;

function tally(text: string): Record<BookScript, number> {
  const c: Record<BookScript, number> = { hi: 0, en: 0, kn: 0 };
  for (const ch of text) {
    const o = ch.codePointAt(0) ?? 0;
    if (o >= RANGES.hi[0] && o <= RANGES.hi[1]) c.hi += 1;
    else if (o >= RANGES.kn[0] && o <= RANGES.kn[1]) c.kn += 1;
    // Latin letters only — digits and punctuation are shared by every script
    // here and would otherwise let a page of numbered headings read as English.
    else if (/[A-Za-z]/.test(ch)) c.en += 1;
  }
  return c;
}

/**
 * The script a run of text is in, or `null` when no script has a clear
 * majority — which means "belongs to both sides", not "unknown".
 */
export function dominantScript(text: string): BookScript | null {
  const c = tally(text);
  const total = c.hi + c.en + c.kn;
  if (total === 0) return null;
  const top = (Object.keys(c) as BookScript[]).reduce((a, b) => (c[a] >= c[b] ? a : b));
  return c[top] / total >= DOMINANCE ? top : null;
}

/** The script of a whole printed page, judged on all its paragraphs at once. */
export function pageScript(paragraphs: Paragraph[]): BookScript | null {
  return dominantScript(paragraphs.map((p) => p.text_hi ?? "").join(" "));
}

/**
 * What to call each side in the toggle.
 *
 * Native names, not the API's `language_label`: that field reads "ಕನ್ನಡ
 * (Kannada)", which is right on a book card and twice too long for a control
 * that has to sit in the reader's chrome beside four other buttons.
 */
export const SCRIPT_LABEL: Record<BookScript, string> = {
  hi: "हिन्दी",
  en: "English",
  kn: "ಕನ್ನಡ",
};
