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
// A line under every second word is unreadable, which the contract says in
// so many words. Three rules bring it to ~20%:
//
//   1. phrases first, longest match wins — अनुभव दर्शन is one term, not two
//   2. a word is marked once per page, not on every repeat
//   3. single words shorter than MIN_SINGLE_LENGTH are left alone
//
// Rule 3 is a proxy for "a reader probably knows this one" (एक, गति, कला)
// and nothing more principled — the BE sends no difficulty or frequency
// signal. It is one constant, deliberately, so it can be retuned in one edit.

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
 * running prose. This drops the handful of entries carrying an editorial
 * gloss — "कर्म (मानव के संदर्भ में)" — which would otherwise match the bare
 * words "कर्म मानव के संदर्भ में" and promise a definition of something else.
 */
const MATCHABLE_HEADWORD = /^[ऀ-ॿ‌‍\s-‐-―]+$/;

/**
 * Below this, a single word is never underlined. Counts code points, so
 * matras count — अनुभव is 5, गति is 3. Phrases are exempt: a two-word match
 * is precise enough to earn its mark however short the words are.
 */
const MIN_SINGLE_LENGTH = 5;

export interface Segment {
  /** the text exactly as it appears in the book */
  text: string;
  /** the headword to look up, when this run is a glossary term */
  word?: string;
}

export interface Matcher {
  /** how many headwords are loaded — 0 means "not ready", never "none exist" */
  size: number;
  /** exact headword? Used by the selection action, where density rules do not apply. */
  has(text: string): boolean;
  /**
   * Split each text into marked and unmarked runs, sharing one "already
   * marked on this page" set across the whole call. Pass `null` for a
   * paragraph that must not be marked (headings, captions) and get `null`
   * back — it is skipped entirely, so it cannot silently consume a word's
   * one appearance.
   */
  segment(texts: (string | null)[]): (Segment[] | null)[];
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
  const singles = new Set<string>();
  // first word → phrases starting with it, longest first, so the longest
  // term at a position always wins over the shorter one inside it
  const phrases = new Map<string, Phrase[]>();

  for (const { hindi } of words) {
    const headword = hindi.normalize("NFC").trim();
    if (!headword || !MATCHABLE_HEADWORD.test(headword)) continue;
    const tokens: string[] = headword.match(WORD_CHARS) ?? [];
    const first = tokens[0];
    if (!first) continue;
    if (tokens.length === 1) {
      singles.add(first);
    } else {
      const bucket = phrases.get(first);
      if (bucket) bucket.push({ headword, tokens });
      else phrases.set(first, [{ headword, tokens }]);
    }
  }
  for (const bucket of phrases.values()) {
    bucket.sort((a, b) => b.tokens.length - a.tokens.length);
  }

  const lookupSet = new Set(words.map((w) => w.hindi.normalize("NFC").trim()));

  function segmentOne(text: string, seen: Set<string>): Segment[] {
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
      if (!matched && singles.has(token[0])) {
        matched = { end: start + token[0].length, headword: token[0], single: true };
      }
      if (!matched) continue;

      // A recognised term is always consumed, even when it is not marked —
      // otherwise the second "अनुभव दर्शन" on a page would come apart and get
      // underlined as two separate words.
      const skip =
        seen.has(matched.headword) ||
        (matched.single && matched.headword.length < MIN_SINGLE_LENGTH);
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
    has: (text) => lookupSet.has(text.normalize("NFC").trim().replace(/\s+/g, " ")),
    segment(texts) {
      // One set for the whole call: the caller passes a page, so "once per
      // page" falls out of the call boundary. Created here and never escaping,
      // which keeps this pure — the same input always gives the same output,
      // even when React renders twice.
      const seen = new Set<string>();
      return texts.map((t) => (t === null ? null : segmentOne(t, seen)));
    },
  };
}
