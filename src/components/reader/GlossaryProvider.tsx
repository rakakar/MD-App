"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getParibhashaIndex, lookupParibhasha } from "@/lib/api";
import { dropFullGlossary, ensureFullGlossary, localDefinition } from "@/lib/glossary";
import {
  clearCachedDefinitions,
  getCachedDefinition,
  getCachedFullGlossary,
  getCachedGlossary,
  putCachedDefinition,
  putCachedGlossary,
} from "@/lib/idb";
import { buildMatcher, type Matcher } from "@/lib/paribhasha";
import type { ParibhashaWord } from "@/lib/types";

/**
 * The glossary, as the reader sees it (contract §14).
 *
 * The headword list is downloaded **once** and kept in IndexedDB, so knowing
 * which words on a page have a definition costs nothing while reading — no
 * request per paragraph, works offline, and the underlines appear with the
 * text rather than after it.
 */
interface GlossaryValue {
  /** null until the index is in hand; every consumer must handle that */
  matcher: Matcher | null;
  lookup: (word: string) => Promise<ParibhashaWord | null>;
}

const GlossaryContext = createContext<GlossaryValue>({
  matcher: null,
  lookup: async () => null,
});

export function useGlossary(): GlossaryValue {
  return useContext(GlossaryContext);
}

export function GlossaryProvider({ children }: { children: ReactNode }) {
  const [words, setWords] = useState<{ id: number; hindi: string }[] | null>(null);
  // Definitions already fetched this session. A tap on the same word twice —
  // common, since a reader checks a term and meets it again a page later —
  // should not pay for a second round trip.
  const seen = useRef(new Map<string, ParibhashaWord | null>());
  // Held so the first tap can start the full download, which needs the version
  // to know whether what is on the device is still current.
  const version = useRef<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    void (async () => {
      // 1. cached copy first: underlines appear on the first paint, offline
      const cached = await getCachedGlossary();
      if (cached) {
        setWords(cached.words);
        version.current = cached.version;
      }

      // 2. then revalidate. `version` is the newest updated_at in the glossary
      //    (§14.3), so an unchanged one means the cached copy is still current
      //    and the parse can be skipped. The BE also marks this response
      //    public, max-age=86400, so this is usually served from the HTTP
      //    cache without touching the network at all.
      try {
        // Asked before anything is dropped: a reader who keeps the whole
        // dictionary on this device stays a reader who keeps it, version
        // change or not. Finding out on a train that it was invalidated and
        // never replaced is the one outcome worth engineering against.
        const keepsDictionary = (await getCachedFullGlossary()) !== null;

        const fresh = await getParibhashaIndex(ctrl.signal);
        if (ctrl.signal.aborted) return;
        version.current = fresh.version;
        if (!cached || cached.version !== fresh.version) {
          setWords(fresh.words);
          await putCachedGlossary(fresh);
          // A moved version is the sign that a manager edited the glossary, so
          // every definition held from before it is suspect — the stored
          // dictionary and the individually looked-up words alike.
          if (cached) {
            dropFullGlossary();
            await clearCachedDefinitions();
            seen.current.clear();
          }
        }
        if (keepsDictionary) void ensureFullGlossary(fresh.version);
      } catch {
        // offline, or the glossary is down: the cached copy stands, and with
        // no cached copy the reader simply has no underlines. Reading is
        // never blocked on the dictionary.
      }
    })();
    return () => ctrl.abort();
  }, []);

  const matcher = useMemo(() => (words ? buildMatcher(words) : null), [words]);

  /**
   * The offline dictionary if it is here, then memory, then the one stored
   * definition, then the network.
   *
   * The first tap also starts the 143 KB download of the whole dictionary in
   * the background — but never waits on it. Opening one definition is what
   * tells us this reader uses the glossary; from the second tap onward the
   * answers are local, instant and available with no connection at all. A
   * reader who never taps a word never pays for it.
   */
  const lookup = useCallback(async (word: string) => {
    const key = word.normalize("NFC").trim();

    const local = localDefinition(key);
    if (local) return local;

    if (version.current) void ensureFullGlossary(version.current);

    const remembered = seen.current.get(key);
    if (remembered !== undefined) return remembered;

    const stored = await getCachedDefinition(key);
    if (stored) {
      seen.current.set(key, stored);
      return stored;
    }

    const found = await lookupParibhasha(key);
    seen.current.set(key, found);
    // A 404 is held for this session only. It usually means the word was
    // hidden, and writing that to disk would outlive a manager un-hiding it.
    if (found) await putCachedDefinition(key, found);
    return found;
  }, []);

  const value = useMemo(() => ({ matcher, lookup }), [matcher, lookup]);
  return <GlossaryContext.Provider value={value}>{children}</GlossaryContext.Provider>;
}
