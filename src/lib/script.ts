/**
 * Which language a piece of content is actually in, so the markup can say so.
 *
 * The panel used to tell managers that content fields were Hindi-only, and the
 * app took that at its word: every title rendered as `lang="hi"` with the
 * Devanagari face. That rule is gone — an English research paper keeps its
 * English title — and hard-coding `hi` now means an English title set in a
 * Devanagari font, announced to a screen reader in the wrong language.
 *
 * Detection is by script rather than by any stored field, because the script is
 * what the two consequences — the font and the pronunciation — actually turn
 * on, and because no such field exists to consult.
 */

const DEVANAGARI = /[ऀ-ॿ]/;

export type ContentLang = "hi" | "en";

/**
 * `hi` if the text contains any Devanagari, `en` otherwise.
 *
 * A mixed title — "1997 जीवन विद्या एक परिचय", or a Hindi title with a Latin
 * acronym in it — counts as Hindi: the Devanagari is the part that would be
 * mis-set in a Latin face, and Latin inside a Devanagari font is unharmed.
 */
export function scriptOf(text: string | null | undefined): ContentLang {
  return text && DEVANAGARI.test(text) ? "hi" : "en";
}

/**
 * Spread onto the element that holds a piece of content:
 *
 *     <span {...contentLang(track.title_hi)}>{track.title_hi}</span>
 *
 * The `hi` class is what carries the Devanagari face in globals.css, so it has
 * to travel with the `lang` attribute rather than being applied separately —
 * the two disagreeing is the bug this replaces.
 */
export function contentLang(text: string | null | undefined): {
  lang: ContentLang;
  className: string;
} {
  const lang = scriptOf(text);
  return { lang, className: lang === "hi" ? "hi" : "" };
}
