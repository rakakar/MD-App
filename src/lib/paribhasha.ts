// Paribhasha matching — entirely client-side (contract §14.3).
//
// The FE holds every headword (one ~25 KB download, cached in IndexedDB), so
// deciding which words on a page have a definition costs no request at all.
// Only the tap costs one.
//
// **Why this file is mostly restraint.** Measured against a real chapter
// (MAND ch.3, 1889 words), a plain whole-word match marks **41.8% of the
// text** — this glossary was compiled against these very books, so its
// headwords are the corpus's own vocabulary (क्रिया, मन, दर्शन, अनुभव…).
// Phrases always come first and the longest match wins — अनुभव दर्शन is one
// term, not two. Beyond that, how much gets marked is the caller's choice
// (`SegmentOptions`):
//
//   - **The reader marks everything** — every headword, short ones included,
//     every time it appears (~35% of words). A reader tapping मानव or धर्म
//     on page 40 expects its meaning, and a rule that hid it ("it was
//     underlined on page 3", "it is only four letters") reads as the glossary
//     not having the word. Decided by Raka, 2026-10-29.
//   - **The defaults are restrained** — once per call, and no single word
//     shorter than 5 code points (~16%). The definition cards and the
//     assistant's related words use them: a definition dotted end to end is
//     unreadable, and "related" filled with एक and रूप says nothing.

/**
 * Devanagari letters and matras (U+0900–U+097F), plus ZWNJ/ZWJ which sit
 * inside a word and must not split it. Written as escapes because both
 * joiners are invisible in an editor.
 *
 * The two dandas (।, U+0964 and ॥, U+0965) are cut out of the middle of the
 * range: they are the script's full stop, and inside the class they glue
 * themselves to the last word of every sentence — "प्रमाण।" is not the
 * headword प्रमाण, so the final word of a sentence could never be marked.
 */
const WORD_CHARS = /[ऀ-ॣ०-ॿ‌‍]+/g;

/**
 * What may sit between the words of a phrase: whitespace or a hyphen, nothing
 * else. So "अक्षय बल" and "अन्तरंग-व्यवहार" both match, while "अक्षय। बल" —
 * two sentences — does not.
 */
const PHRASE_GAP = /^[\s-‐-―]*$/;

/**
 * Only headwords made of word characters, spaces and hyphens can occur in
 * running prose. Tested after `printedForm` has taken off any editorial gloss,
 * so "कर्म (मानव के संदर्भ में)" never matches the bare words "कर्म मानव के
 * संदर्भ में"; what is left, like "स्वनारी/पुरुष", is skipped.
 */
const MATCHABLE_HEADWORD = /^[ऀ-ॿ‌‍\s-‐-―]+$/;

/**
 * A colon typed where the visarga belongs. The glossary writes दु:ख, अन्त:करण,
 * मन:स्थिति with an ASCII colon; the books use the real visarga (दुःख), so
 * without this those entries could never match a word on the page.
 */
const COLON_AS_VISARGA = /(?<=[ऀ-ॿ]):/g;

/**
 * An editorial gloss after the term — "तन (शरीर)", "शासन (मानव में)". The
 * term before it is what a book actually prints.
 */
const TRAILING_GLOSS = /\s*\([^)]*\)\s*$/;

/**
 * The restrained default: below this, a single word is not marked. Counts
 * code points, so matras count — अनुभव is 5, गति is 3. Phrases are exempt.
 */
const MIN_SINGLE_LENGTH = 5;

export interface SegmentOptions {
  /** mark a term every time it appears, not only the first time per call */
  everyOccurrence?: boolean;
  /** single words shorter than this are left plain; phrases are exempt */
  minSingleLength?: number;
}

/** what a book would print for this headword, or null if it never could */
function printedForm(headword: string): string | null {
  const form = headword.replace(COLON_AS_VISARGA, "ः").replace(TRAILING_GLOSS, "").trim();
  return form && MATCHABLE_HEADWORD.test(form) ? form : null;
}

export interface Segment {
  /** the text exactly as it appears in the book */
  text: string;
  /** the headword to look up, when this run is a glossary term */
  word?: string;
}

export interface Matcher {
  /** how many headwords are loaded — 0 means "not ready", never "none exist" */
  size: number;
  /**
   * The headword to look up for a selected text, or null. Takes the headword
   * itself or the form a book prints (दुःख for दु:ख). Used by the selection
   * action, where density rules do not apply.
   */
  headwordFor(text: string): string | null;
  /**
   * Split each text into marked and unmarked runs. By default a term is marked
   * once per call — the caller passes a page, or an entry — and short single
   * words are left plain; `options` relaxes either. Pass `null` for a
   * paragraph that must not be marked (headings, captions) and get `null`
   * back — it is skipped entirely, so it cannot silently consume a word's
   * one appearance.
   */
  segment(texts: (string | null)[], options?: SegmentOptions): (Segment[] | null)[];
}

interface Phrase {
  /** the headword, as the lookup endpoint expects it */
  headword: string;
  /** its words, to match against a run of tokens */
  tokens: string[];
}

/**
 * Build the matcher once per index download. Everything expensive — the
 * token split, the phrase bucketing — happens here rather than per paragraph.
 */
export function buildMatcher(words: { hindi: string }[]): Matcher {
  // printed form → the headword to look up. A headword printed as itself
  // always wins, so कर्म opens कर्म and never "कर्म (मानव के संदर्भ में)";
  // a glossed or colon-spelled entry only claims a form nobody else has.
  const byForm = new Map<string, string>();
  const headwords = words.map((w) => w.hindi.normalize("NFC").trim()).filter(Boolean);
  for (const headword of headwords) {
    if (printedForm(headword) === headword) byForm.set(headword, headword);
  }
  for (const headword of headwords) {
    const form = printedForm(headword);
    if (form && !byForm.has(form)) byForm.set(form, headword);
  }

  // single word → headword
  const singles = new Map<string, string>();
  // first word → phrases starting with it, longest first, so the longest
  // term at a position always wins over the shorter one inside it
  const phrases = new Map<string, Phrase[]>();

  for (const [form, headword] of byForm) {
    const tokens: string[] = form.match(WORD_CHARS) ?? [];
    const first = tokens[0];
    if (!first) continue;
    if (tokens.length === 1) {
      singles.set(first, headword);
    } else {
      const bucket = phrases.get(first);
      if (bucket) bucket.push({ headword, tokens });
      else phrases.set(first, [{ headword, tokens }]);
    }
  }
  for (const bucket of phrases.values()) {
    bucket.sort((a, b) => b.tokens.length - a.tokens.length);
  }

  const lookupSet = new Set(headwords);

  function segmentOne(
    text: string,
    seen: Set<string>,
    everyOccurrence: boolean,
    minSingleLength: number
  ): Segment[] {
    const source = text.normalize("NFC");
    const tokens = [...source.matchAll(WORD_CHARS)];
    const out: Segment[] = [];
    let cursor = 0; // how much of `source` has been emitted

    const push = (from: number, to: number, word?: string) => {
      if (to <= from) return;
      out.push(word ? { text: source.slice(from, to), word } : { text: source.slice(from, to) });
    };

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const start = token.index;
      if (start < cursor) continue; // swallowed by a phrase already emitted

      let matched: { end: number; headword: string; single: boolean } | null = null;

      // 1. the longest phrase starting here, if any
      for (const phrase of phrases.get(token[0]) ?? []) {
        if (i + phrase.tokens.length > tokens.length) continue;
        let ok = true;
        for (let k = 1; k < phrase.tokens.length && ok; k++) {
          const prev = tokens[i + k - 1];
          const next = tokens[i + k];
          const gap = source.slice(prev.index + prev[0].length, next.index);
          ok = next[0] === phrase.tokens[k] && PHRASE_GAP.test(gap);
        }
        if (ok) {
          const last = tokens[i + phrase.tokens.length - 1];
          matched = {
            end: last.index + last[0].length,
            headword: phrase.headword,
            single: false,
          };
          break;
        }
      }

      // 2. otherwise the word on its own
      const single = matched ? undefined : singles.get(token[0]);
      if (single) {
        matched = { end: start + token[0].length, headword: single, single: true };
      }
      if (!matched) continue;

      // A recognised term is always consumed, even when it is not marked —
      // otherwise the second "अनुभव दर्शन" on a page would come apart and get
      // underlined as two separate words.
      const skip =
        (!everyOccurrence && seen.has(matched.headword)) ||
        (matched.single && token[0].length < minSingleLength);
      push(cursor, start);
      push(start, matched.end, skip ? undefined : matched.headword);
      if (!skip) seen.add(matched.headword);
      cursor = matched.end;
    }

    push(cursor, source.length);
    return out;
  }

  return {
    size: singles.size + phrases.size,
    headwordFor(text) {
      const key = text.normalize("NFC").trim().replace(/\s+/g, " ");
      if (lookupSet.has(key)) return key;
      return byForm.get(key) ?? null;
    },
    segment(texts, options = {}) {
      const everyOccurrence = options.everyOccurrence ?? false;
      const minSingleLength = options.minSingleLength ?? MIN_SINGLE_LENGTH;
      // One set for the whole call: the caller passes a page, so "once per
      // page" falls out of the call boundary. Created here and never escaping,
      // which keeps this pure — the same input always gives the same output,
      // even when React renders twice.
      const seen = new Set<string>();
      return texts.map((t) =>
        t === null ? null : segmentOne(t, seen, everyOccurrence, minSingleLength)
      );
    },
  };
}
