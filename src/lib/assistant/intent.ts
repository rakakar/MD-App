// What the reader wants from one line of text — the Assistant's router.
//
// Four answers, and only one of them costs real money: Research spends an LLM
// call against a daily cap, where the other three are a dictionary on the
// device, a search the BE already runs for free, and a list of places. So the
// rules lean away from Research. A line has to *look* like a question before
// it is sent there, and anything ambiguous falls to Book search, which is the
// cheap answer that is never wrong — it just may not be the best one.
//
// Rules rather than a model, on purpose: they are instant, they work offline,
// and a reader who is surprised by the choice can see why and pick another
// chip. The empty state says as much.

import { searchKeyFor } from "@/lib/glossary";
import type { ParibhashaWord } from "@/lib/types";
import { isCommand, matchDestinations, tokens } from "./destinations";

export type Intent = "paribhasha" | "books" | "research" | "navigate";

export const INTENTS: Intent[] = ["paribhasha", "books", "research", "navigate"];

/** A phrase in quotes is asking for those exact words. */
const QUOTED = /^\s*["“”'‘’](.+?)["“”'‘’]\s*$/;

export function quotedPhrase(query: string): string | null {
  return query.match(QUOTED)?.[1]?.trim() || null;
}

const QUESTION_WORDS = new Set([
  "what", "why", "how", "when", "which", "who", "explain", "difference",
  "compare", "define", "meaning", "mean", "does", "is", "can", "should",
  "क्या", "क्यों", "कैसे", "कब", "कौन", "किस", "किसे", "कितना", "अंतर", "फर्क",
  "समझाइए", "समझाओ", "बताइए", "बताओ", "तुलना",
  "kya", "kyon", "kyun", "kaise", "kab", "kaun", "kis", "antar", "samjhao", "batao",
]);

/**
 * Where-questions about *the reader's own things* are navigation — "where are
 * my notes" — but "where does the book define vyavastha" is research. The
 * difference is whether the sentence names a place in the app.
 */
function looksLikeQuestion(query: string, words: string[]): boolean {
  if (/[?？]\s*$/.test(query)) return true;
  if (words.some((w) => QUESTION_WORDS.has(w))) return true;
  return words.length >= 6;
}

/** The glossary's own idea of "this is that word" — exact, not "close to". */
export function exactGlossaryWord(
  dictionary: ParibhashaWord[] | null,
  query: string
): ParibhashaWord | null {
  if (!dictionary) return null;
  const q = query.normalize("NFC").trim();
  const lower = q.toLowerCase();
  const key = searchKeyFor(q);
  return (
    dictionary.find(
      (w) =>
        w.hindi.normalize("NFC") === q ||
        (w.hinglish && w.hinglish.toLowerCase() === lower) ||
        (key.length >= 3 && searchKeyFor(w.hinglish ?? "") === key)
    ) ?? null
  );
}

export function detectIntent(
  query: string,
  dictionary: ParibhashaWord[] | null
): Intent {
  const q = query.trim();
  if (quotedPhrase(q)) return "books";

  const words = tokens(q);
  const nav = matchDestinations(q);
  const namesAPlace = (nav.matches[0]?.score ?? 0) >= 3;
  const personal = words.some((w) =>
    ["my", "mere", "mera", "meri", "मेरे", "मेरा", "मेरी"].includes(w)
  );
  if (isCommand(q) && nav.matches.length > 0) return "navigate";
  if (namesAPlace && (personal || words.length <= 2)) return "navigate";

  if (looksLikeQuestion(q, words)) return "research";

  if (words.length <= 3 && exactGlossaryWord(dictionary, q)) return "paribhasha";
  // A single Devanagari word the glossary does not know exactly is still most
  // likely a word someone wants defined; the Paribhasha answer offers the
  // nearest entries and a way into the books from there.
  if (words.length === 1 && /\p{Script=Devanagari}/u.test(q) && dictionary) return "paribhasha";

  return "books";
}

export const INTENT_LABEL: Record<Intent, string> = {
  paribhasha: "Paribhasha",
  books: "Book search",
  research: "Research",
  navigate: "Navigate",
};

export const INTENT_PLACEHOLDER: Record<Intent | "auto", string> = {
  auto: "Ask anything from the books",
  paribhasha: "Look up a word",
  books: "Search an exact phrase",
  research: "Ask a question",
  navigate: "Where do you want to go?",
};

/**
 * The help line that takes the chip row's place once one is chosen (designer's
 * "chips at the thumb", 19 Sep). Each says what happens next, and nothing the
 * app cannot do: Paribhasha has no book or page per entry to show, and Book
 * search is ranked retrieval narrowed to the phrase, set out book by book.
 */
export const INTENT_HINT: Record<Intent, string> = {
  paribhasha: "Type a word — matching entries appear as you type.",
  books: "Type a phrase — every passage that uses it, book by book in reading order.",
  research: "Ask a question — the answer is built only from passages in the books, each one cited.",
  navigate: "Name a place in the app — the Assistant opens it instead of answering.",
};
