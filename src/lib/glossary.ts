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
  return ranked.slice(0, limit).map((r) => r.word);
}
