// The offline dictionary — one copy per browser tab, outside React.
//
// It lives here rather than in a provider because three very different places
// need to ask for it: the reader, when someone taps a word; the book download
// button, which is promising that a book will work on a train; and the
// परिभाषा search box, which searches this copy rather than the network. A
// context could not serve the second — the download button is not inside the
// reader — and two copies of a 900 KB map is not a thing to arrange casually.

import { getParibhashaFull } from "./api";
import { getCachedFullGlossary, putCachedFullGlossary } from "./idb";
import type { ParibhashaWord } from "./types";

/** headword → entry, once the dictionary is in hand */
let dictionary: Map<string, ParibhashaWord> | null = null;
/**
 * The same entries as a list, built once beside the map.
 *
 * The map answers a tap and the list answers the search box, and rebuilding
 * the second from the first on every keystroke would put 2,800 allocations in
 * front of the one screen whose whole point is that it costs nothing.
 */
let wordList: ParibhashaWord[] | null = null;
/** the version `dictionary` was built from, so a moved version can drop it */
let loadedVersion: string | null = null;
let inflight: Promise<void> | null = null;

function index(words: ParibhashaWord[]): Map<string, ParibhashaWord> {
  const map = new Map<string, ParibhashaWord>();
  for (const w of words) {
    // A server that does not know `full=1` answers with headwords only, and
    // an entry with no definitions would open an empty sheet. Skipping them
    // leaves the map empty, which reads as "no local copy" and sends taps
    // back to the lookup endpoint — the exact behaviour we had before.
    if (Array.isArray(w.definitions) && w.definitions.length > 0) {
      map.set(w.hindi.normalize("NFC").trim(), w);
    }
  }
  return map;
}

function adopt(map: Map<string, ParibhashaWord>, version: string): void {
  dictionary = map;
  wordList = [...map.values()];
  loadedVersion = version;
}

/**
 * A definition, if the dictionary happens to be here already.
 *
 * Synchronous and never fetches: a caller that gets null should fall back to
 * the network. This is the fast path, not the only path.
 */
export function localDefinition(word: string): ParibhashaWord | null {
  return dictionary?.get(word.normalize("NFC").trim()) ?? null;
}

export function haveFullGlossary(): boolean {
  return dictionary !== null;
}

/**
 * Make sure the whole dictionary is on this device — from IndexedDB if it is
 * already there and still current, otherwise one 143 KB request.
 *
 * Safe to call from anywhere, any number of times: concurrent callers share
 * one download, and a completed one is never repeated. Failure is silent and
 * leaves lookups on the network, which is where they were anyway.
 *
 * @param version the current glossary version, from the headword index
 */
export function ensureFullGlossary(version: string): Promise<void> {
  if (dictionary && loadedVersion === version) return Promise.resolve();
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const cached = await getCachedFullGlossary();
      if (cached && cached.version === version) {
        adopt(index(cached.words), cached.version);
        return;
      }
      const fresh = await getParibhashaFull();
      const built = index(fresh.words);
      if (built.size === 0) return; // a server without `full=1` — nothing to keep
      adopt(built, fresh.version);
      await putCachedFullGlossary(fresh.version, fresh.words);
    } catch {
      // offline, or the glossary is down. Taps keep working against the
      // network; only the offline promise is postponed.
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Forget the in-memory copy. Called when the version moves under us. */
export function dropFullGlossary(): void {
  dictionary = null;
  wordList = null;
  loadedVersion = null;
}

// ---------------------------------------------------------------------------
// Searching the copy we are holding.
//
// A port of the BE's `apps/paribhasha/search.py` and `normalize.py`, and a
// port rather than a call because the dictionary is already here. Asking
// `paribhasha/?q=` to search it is asking the network for an answer we hold:
// ~0.9s and a request per keystroke, for a filter that runs in under a
// millisecond over 2,800 rows.
//
// This is why परिभाषा searches as you type while every other box in the app
// waits to be asked. The rule is not "dictionaries are different" — it is that
// **instant search needs local data**. Anything crossing the network waits for
// the reader to ask (see `SearchField`).
//
// Fidelity matters, because a worse local search would be a bad trade at any
// speed. The ladder is the BE's rung for rung, over the same set: the index
// serves `is_active=True`, which is what `search_words` filters over. The one
// rung not ported is the BE's last, vector similarity — `WordList` never calls
// it, so the endpoint this replaces never used it either.
// ---------------------------------------------------------------------------

/** the endpoint's own page size, kept so the list is the length it always was */
export const GLOSSARY_LIMIT = 20;

/** below this, a "contains" match takes half the glossary and ranks noise */
const MIN_CONTAINS_CHARS = 2;

/**
 * How many typed characters may be wrong before a word stops being the word.
 *
 * Elasticsearch's `fuzziness: AUTO` thresholds, which most search stacks have
 * settled on. Short words get no allowance at all, and that is the important
 * half: one edit from `मन` reaches `तन`, `धन`, `जन` and `बन`, so a two-letter
 * query with a budget would answer everything and mean nothing.
 */
function editBudget(query: string): number {
  if (query.length <= 2) return 0;
  return query.length <= 5 ? 1 : 2;
}

/**
 * Damerau-Levenshtein distance, given up on as soon as it passes `max`.
 *
 * Four edits are counted, and the fourth is why this is not plain Levenshtein:
 * insert (`anubav` → `anubhav`), delete (`anubhava` → `anubhav`), substitute
 * (`anubhaw` → `anubhav`, `अनुभब` → `अनुभव`) and **transpose** (`anubhva` →
 * `anubhav`), which is the commonest thing fingers actually do.
 *
 * The ceiling is what makes this affordable over the whole glossary: the
 * moment an entire row is already worse than the budget, no later row can
 * recover, so the pair is abandoned. With the length check in front of it,
 * 2,802 entries measure ~1.4 ms per query — under a rendered frame, on the
 * device, for nothing.
 */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prevPrev: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prevPrev[j - 2] + 1);
      }
      cur[j] = v;
      if (v < best) best = v;
    }
    if (best > max) return max + 1;
    prevPrev = prev;
    prev = cur;
  }
  return prev[b.length];
}

const NON_LATIN = /[^a-z]+/g;
const DOUBLES = /(.)\1+/g;
const VOWEL_RUNS = /[aeiou]+/g;
const TRAILING_VOWELS = /[aeiou]+$/;

/**
 * Folded lookup key for a Roman transliteration — `normalize.search_key_for`.
 *
 * There is no standard for writing Hindi in Latin letters, so the same word
 * arrives as "anubhav", "anubhaav", "anubhava". Folding collapses vowel
 * length, doubled letters and the trailing inherent 'a' — the variation
 * people produce without meaning to. It deliberately stops short of a
 * consonant skeleton ("anubhav" → "nbhv"), which would match more but collide
 * करण/किरण/कर्म onto one key.
 *
 * The BE stores this on the row (`Word.search_key`, derived from `hinglish`)
 * and the index does not send it, so it is recomputed here from the
 * `hinglish` that does arrive — same input, same rules.
 */
export function searchKeyFor(hinglish: string): string {
  if (!hinglish) return "";
  const ascii = hinglish
    .normalize("NFKD")
    // NFKD leaves the combining marks behind as their own code points; the BE
    // drops them by encoding to ASCII, and stripping everything outside a-z
    // after lowercasing removes the same set without the round trip.
    .toLowerCase()
    .replace(NON_LATIN, "");
  return ascii
    .replace(DOUBLES, "$1")
    .replace(VOWEL_RUNS, (run) => run[0])
    .replace(TRAILING_VOWELS, "")
    .slice(0, 100);
}

/**
 * Every entry on this device, or null when the dictionary is not here yet.
 *
 * Null is an ordinary answer and means "ask the network" — see the परिभाषा
 * box in `SearchScreen`, which degrades to `getParibhasha` rather than
 * telling a reader the dictionary is empty.
 */
export function localGlossaryWords(): ParibhashaWord[] | null {
  return wordList;
}

/**
 * The ladder, exact-first — `search.search_words`.
 *
 * Someone who types अनुभव wants *that word's* definition, not the twenty
 * entries that mention it, so an exact headword outranks everything and a
 * definition-text match comes last.
 *
 *   0. exact headword          अनुभव    → अनुभव
 *   1. exact Roman spelling    anubhav  → अनुभव
 *   2. folded Roman spelling   anubhaav → अनुभव
 *   3. headword prefix         अनुभ     → अनुभव, अनुभूति…
 *   4. headword contains
 *   5. anything else that matched — Roman spelling, folded prefix, definition
 *   6. a misspelling                anubhaw / अनुभब → अनुभव
 *
 * **Rung 6 is ours and runs only when 0–5 found nothing at all.** The folding
 * above settles how a word is *spelled by taste* — `anubhaav`, `anubhava` —
 * and stops there, so a genuine slip still missed: `anubhaw`, `anubav`,
 * `jeewan`, and every Devanagari typo, since nothing on the way in corrects
 * Devanagari. Those are not exotic. Romanised Hindi has no standard, and a
 * dictionary is the one screen a reader opens *because* they are unsure how
 * the word is written.
 *
 * Last, and only on an empty result, because it is loose: `samadan` sits one
 * edit from संपादन, समाधान *and* समापन. Three guesses in a list a reader picks
 * from is help; the same three anywhere that answers with one word is not,
 * which is why the reader's tap (`localDefinition`, `lookup`) never comes
 * here — see the note in the BE's `normalize.py`.
 */
export function searchGlossary(
  words: ParibhashaWord[],
  rawQuery: string,
  limit: number = GLOSSARY_LIMIT
): ParibhashaWord[] {
  const query = (rawQuery ?? "").normalize("NFC").trim();
  if (!query) return [];
  const lower = query.toLowerCase();
  const key = searchKeyFor(query);
  const wide = query.length >= MIN_CONTAINS_CHARS;

  const ranked: { word: ParibhashaWord; rank: number }[] = [];
  for (const word of words) {
    const hindi = (word.hindi ?? "").normalize("NFC");
    const hinglish = (word.hinglish ?? "").toLowerCase();
    const wordKey = searchKeyFor(word.hinglish ?? "");

    let rank: number | null = null;
    if (hindi === query) rank = 0;
    else if (hinglish && hinglish === lower) rank = 1;
    else if (key && wordKey === key) rank = 2;
    else if (hindi.startsWith(query)) rank = 3;
    else if (wide && hindi.toLowerCase().includes(lower)) rank = 4;
    else if (key && wordKey.startsWith(key)) rank = 5;
    else if (wide && hinglish.includes(lower)) rank = 5;
    else if (wide && (word.definitions ?? []).some((d) => d.toLowerCase().includes(lower)))
      rank = 5;

    if (rank !== null) ranked.push({ word, rank });
  }

  // The BE's `order_by("match_rank", "hindi")` — **rank here, `hindi` by not
  // touching it.** The index arrives ordered by `hindi` already (`WordIndex`
  // sorts it), `words` keeps that order, and `Array.sort` is stable, so ties
  // come out in the order the server put them in.
  //
  // Sorting the headwords here instead would mean reproducing Postgres's
  // collation in the browser, and it does not survive the attempt: the server
  // returns अनुभव गम्य, अनुभवगामी, अनुभव दर्शन — spaces ignored — which is
  // neither code-point order nor `localeCompare(…, "hi")`, with or without
  // `ignorePunctuation`. Inheriting the order is exact; guessing at it is a
  // list that looks subtly wrong in a dictionary, where alphabetical order is
  // most of how anybody reads one.
  ranked.sort((a, b) => a.rank - b.rank);
  if (ranked.length > 0) return ranked.slice(0, limit).map((r) => r.word);

  return nearestWords(words, query, lower, limit);
}

/**
 * Rung 6 — the words a reader probably meant, when they matched nothing.
 *
 * Both spellings are measured and the better one wins, so a Devanagari typo is
 * caught by the headword and a Roman one by the transliteration, without the
 * caller having to know which keyboard was used.
 *
 * Ordered by distance rather than by the index, and this is the one rung where
 * that is right: within a rung the server's alphabetical order is the answer,
 * but here "how close is it" *is* the ranking, and one edit away is a better
 * guess than two however the alphabet feels about it. Ties keep the index
 * order underneath, because the sort is stable.
 */
function nearestWords(
  words: ParibhashaWord[],
  query: string,
  lower: string,
  limit: number
): ParibhashaWord[] {
  const max = editBudget(query);
  if (max === 0) return [];

  const near: { word: ParibhashaWord; distance: number }[] = [];
  for (const word of words) {
    const hindi = (word.hindi ?? "").normalize("NFC");
    const hinglish = (word.hinglish ?? "").toLowerCase();
    let distance = editDistance(query, hindi, max);
    if (distance > max && hinglish) {
      distance = Math.min(distance, editDistance(lower, hinglish, max));
    }
    if (distance <= max) near.push({ word, distance });
  }

  near.sort((a, b) => a.distance - b.distance);
  return near.slice(0, limit).map((n) => n.word);
}
