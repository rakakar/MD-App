"use client";

import { useEffect, useState } from "react";
import { getBooks, getParibhashaIndex } from "@/lib/api";
import { ensureFullGlossary, localGlossaryWords } from "@/lib/glossary";
import type { BookSummary, ParibhashaWord } from "@/lib/types";

/**
 * The whole dictionary, brought to the device when the Assistant opens.
 *
 * Usually free — the reader's word-tap and the download button keep the same
 * copy in IndexedDB. Otherwise one ~143 KB request, after which every
 * Paribhasha answer and every intent guess is instant and works offline.
 * `null` until it is here (or if it cannot be had), which every caller reads
 * as "ask the network instead", never as "the glossary is empty".
 */
export function useDictionary(): ParibhashaWord[] | null {
  // Null on the first render even when the copy is already in memory, so the
  // server's HTML and the first client render agree.
  const [words, setWords] = useState<ParibhashaWord[] | null>(null);
  useEffect(() => {
    if (words) return;
    const here = localGlossaryWords();
    if (here) {
      setWords(here);
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const { version } = await getParibhashaIndex();
        await ensureFullGlossary(version);
      } catch {
        // offline or the glossary is down; answers fall back to the endpoint
      }
      if (alive) setWords(localGlossaryWords());
    })();
    return () => {
      alive = false;
    };
  }, [words]);
  return words;
}

let shelf: Promise<BookSummary[]> | null = null;

/**
 * The Originals shelf — for the header's "N books" and for "open <book>".
 *
 * Originals only, because that is what Research and Book search actually read:
 * citations are quotable back to A. Nagraj ji, and translations are not
 * indexed (contract §9.1). Saying "41 books" while searching 37 would be the
 * kind of small untruth the header exists to avoid.
 */
export function useOriginalBooks(): BookSummary[] | null {
  const [books, setBooks] = useState<BookSummary[] | null>(null);
  useEffect(() => {
    let alive = true;
    shelf ??= getBooks({ workspace: "originals" }).catch(() => {
      shelf = null;
      return [];
    });
    void shelf.then((b) => alive && setBooks(b));
    return () => {
      alive = false;
    };
  }, []);
  return books;
}
