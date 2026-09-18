// Words that lead on from a word — read out of the dictionary itself.
//
// The glossary has no "related" field. What it has is better: definitions
// written in the same vocabulary they define, so the headwords that appear
// inside विश्वास's definition — सह-अस्तित्व, निश्चयता — are exactly the words a
// reader has to understand to understand it. The reader's own word-marking
// (`buildMatcher`) already finds them in a book's text; here it reads a
// definition instead.

import { buildMatcher, type Matcher } from "@/lib/paribhasha";
import type { ParibhashaWord } from "@/lib/types";

let cached: { words: ParibhashaWord[]; matcher: Matcher; byHindi: Map<string, ParibhashaWord> } | null =
  null;

function prepared(words: ParibhashaWord[]) {
  if (cached?.words !== words) {
    cached = {
      words,
      matcher: buildMatcher(words),
      byHindi: new Map(words.map((w) => [w.hindi.normalize("NFC").trim(), w])),
    };
  }
  return cached;
}

/** Headwords named inside `text`, in the order they appear, each once. */
export function glossaryWordsIn(
  words: ParibhashaWord[],
  texts: string[],
  exclude: string[] = [],
  limit = 4
): ParibhashaWord[] {
  const { matcher, byHindi } = prepared(words);
  const skip = new Set(exclude.map((w) => w.normalize("NFC").trim()));
  const out: ParibhashaWord[] = [];
  for (const segs of matcher.segment(texts)) {
    for (const s of segs ?? []) {
      if (!s.word || skip.has(s.word)) continue;
      const hit = byHindi.get(s.word);
      if (hit) {
        out.push(hit);
        skip.add(s.word);
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

export function relatedWords(words: ParibhashaWord[], word: ParibhashaWord, limit = 4) {
  return glossaryWordsIn(words, word.definitions, [word.hindi], limit);
}
