// The offline dictionary — one copy per browser tab, outside React.
//
// It lives here rather than in a provider because two very different places
// need to ask for it: the reader, when someone taps a word, and the book
// download button, which is promising that a book will work on a train. A
// context could not serve the second — the download button is not inside the
// reader — and two copies of a 900 KB map is not a thing to arrange casually.

import { getParibhashaFull } from "./api";
import { getCachedFullGlossary, putCachedFullGlossary } from "./idb";
import type { ParibhashaWord } from "./types";

/** headword → entry, once the dictionary is in hand */
let dictionary: Map<string, ParibhashaWord> | null = null;
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
        dictionary = index(cached.words);
        loadedVersion = cached.version;
        return;
      }
      const fresh = await getParibhashaFull();
      const built = index(fresh.words);
      if (built.size === 0) return; // a server without `full=1` — nothing to keep
      dictionary = built;
      loadedVersion = fresh.version;
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
  loadedVersion = null;
}
