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
import type { BookSummary, ParibhashaWord } from "@/lib/types";
import {
  bookDestinations,
  isCommand,
  matchDestinations,
  resumeDestination,
  tokens,
} from "./destinations";

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

/**
 * Asking to *find* something rather than to know about it — "find me shivir
 * in surat", "where is the next shivir", "सूरत में शिविर ढूंढो".
 */
const FIND_VERBS =
  /^(find|search|look(ing)? for|locate|where|any|list|upcoming|next|dhundho|dhoondho|ढूंढो|ढूँढो|ढूंढें)(?=\s|$)/i;
const FIND_TAIL = /(dhundho|dhoondho|ढूंढो|ढूँढो|ढूंढें|chahiye|चाहिए|kahan|kahaan|कहाँ|कहां)\s*[?？]?\s*$/i;

/**
 * Asking what a word *means*. "shivir kya hai" is a question about the idea;
 * "shivir kab hai" is a question about the calendar, and the calendar is a
 * place in the app.
 */
const MEANING_WORDS = new Set([
  "what", "why", "meaning", "mean", "means", "define", "explain", "difference",
  "क्या", "क्यों", "अर्थ", "मतलब", "समझाइए", "समझाओ", "अंतर", "फर्क",
  "kya", "kyon", "kyun", "arth", "matlab", "samjhao", "antar", "farak",
]);

/**
 * Places whose *contents* are what people search for: "find anubhav in the
 * books" wants passages, not the shelf. A find-shaped sentence that names one
 * of these and something else besides is still a search.
 */
const CONTAINERS = new Set(["books", "library", "paribhasha", "translations", "materials", "media"]);

/**
 * Places that are logistics — when, where, who to call. Nearly any question
 * about them is a question about the calendar or the address book, not about
 * the ideas, so they go to Navigate unless the sentence asks what a word means.
 */
const LOGISTICS = new Set(["events", "centres", "contacts"]);

/**
 * The words that make a sentence about logistics on their own. Not every
 * keyword of those places: "parichay" reaches Events, but it is also half the
 * title of जीवन विद्या एक परिचय, and "jeevan vidya parichay" is a book.
 */
const LOGISTICS_WORDS = new Set([
  "shivir", "shivirs", "शिविर", "event", "events", "camp", "camps", "calendar",
  "centre", "centres", "center", "centers", "kendra", "केंद्र",
  "contact", "contacts", "sampark", "संपर्क", "prabodhak", "प्रबोधक",
]);

/**
 * The ways a reader asks what a word means, around the word itself: "meaning
 * of anubhav", "anubhav ka arth", "अनुभव की परिभाषा", "define sahastitva",
 * "vyavastha kise kehte hain". Without these the sentence was the query, and
 * a five-word sentence never reached the dictionary.
 */
const MEANING_BEFORE =
  /^(what\s+(is\s+)?(does|do)\s+|what\s+is\s+the\s+(meaning|definition)\s+of\s+|(the\s+)?(meaning|definition|paribhasha|arth)\s+of\s+|define\s+|परिभाषा\s+)/i;
const MEANING_AFTER =
  /(\s+(mean|means|meaning|definition|ka\s+arth|ka\s+matlab|ki\s+paribhasha|ke\s+arth|का\s+अर्थ|का\s+मतलब|की\s+परिभाषा|kise\s+(kehte|kahte)\s+(hain|hai|he)|किसे\s+कहते\s+(हैं|है)))\s*[?？]?\s*$/i;

/**
 * The word a meaning question is about, when the dictionary has it — the
 * Paribhasha answer looks this up, not the whole sentence. Null when the
 * sentence is not a meaning question, or the word is not a headword ("meaning
 * of life" is a question for Research, not a missing entry).
 */
export function glossaryTerm(
  query: string,
  dictionary: ParibhashaWord[] | null
): ParibhashaWord | null {
  const q = query.trim();
  const term = q.replace(MEANING_BEFORE, "").replace(MEANING_AFTER, "").replace(/[?？]\s*$/, "").trim();
  if (!term || term === q || tokens(term).length > 3) return null;
  return exactGlossaryWord(dictionary, term);
}

/** The verbs that can only mean "take me there" — not "show me", which also searches. */
const OPEN_VERBS = /^(open|go\s+to|goto|kholo|khol|kholiye|खोलो|खोलें|खोलिए|जाओ)(?=\s|$)/i;

export function detectIntent(
  query: string,
  dictionary: ParibhashaWord[] | null,
  books: BookSummary[] | null = null
): Intent {
  const q = query.trim();
  if (quotedPhrase(q)) return "books";
  if (glossaryTerm(q, dictionary)) return "paribhasha";

  const words = tokens(q);
  const nav = matchDestinations(q);
  // A command may name a book or the last chapter — places the static map
  // does not hold. "open manav vyavhar darshan" and "resume" are both asking
  // to go somewhere, and went to Book search because nothing matched.
  if (isCommand(q)) {
    const resume = resumeDestination();
    const runtime = [...(resume ? [resume] : []), ...bookDestinations(books ?? [])];
    // A book has to be *named*, not brushed against: two words of its title,
    // its code, or — after a firm "open" / "go to" — nothing typed but words
    // of titles. "show me anubhav" shares one word with a title and is still
    // a search; "open manav vyavhar darshan", "open dp" and "open vikalp"
    // name a book.
    const runtimeMatch = matchDestinations(q, runtime);
    const firm = OPEN_VERBS.test(q) && runtimeMatch.leftover.length === 0;
    const named = runtimeMatch.matches.some(({ destination: d, score }) => {
      if (!d.id.startsWith("book:")) return true;
      if (firm || words.includes(d.id.slice(5).toLowerCase())) return true;
      return score >= 3 * Math.min(2, d.skeletons?.length ?? 1);
    });
    if (named) return "navigate";
  }
  const best = nav.matches[0];
  const namesAPlace = (best?.score ?? 0) >= 3;
  const personal = words.some((w) =>
    ["my", "mere", "mera", "meri", "मेरे", "मेरा", "मेरी"].includes(w)
  );
  if (isCommand(q) && nav.matches.length > 0) return "navigate";
  if (namesAPlace && (personal || words.length <= 2)) return "navigate";

  // A sentence built around a place, rather than one that mentions it on the
  // way to a question. Auto-routing used to stop at two words, so "find me
  // shivir in surat" went to Book search and came back with passages that
  // happened to contain सूरत.
  if (namesAPlace) {
    const id = best.destination.id;
    const asksMeaning = words.some((w) => MEANING_WORDS.has(w));
    const searchesInside = CONTAINERS.has(id) && nav.leftover.length > 0;
    const logistics = LOGISTICS.has(id) && words.some((w) => LOGISTICS_WORDS.has(w));
    if (!asksMeaning && logistics) return "navigate";
    if (!searchesInside && (FIND_VERBS.test(q) || FIND_TAIL.test(q))) return "navigate";
    if (!searchesInside && !asksMeaning && nav.leftover.length <= 1 && !/[?？]\s*$/.test(q)) {
      return "navigate";
    }
  }

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
  research: "Ask any Question. Answer is built using Machine language from passages in the books, each one is cited.",
  navigate: "Name a place in the app — the Assistant opens it instead of answering.",
};
