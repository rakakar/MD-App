"use client";

import { useCallback, useEffect, useRef } from "react";
import { getChapter } from "@/lib/api";
import { getCachedChapter, putCachedChapter } from "@/lib/idb";
import type { ChapterPayload, Paragraph } from "@/lib/types";

export interface ReaderPage {
  /** printed page number, or front-matter label */
  key: string;
  label: string;
  paragraphs: Paragraph[];
}

/** Group a chapter's paragraphs into display pages (contract §0). */
export function groupPages(paragraphs: Paragraph[]): ReaderPage[] {
  const pages: ReaderPage[] = [];
  let current: ReaderPage | null = null;
  for (const p of paragraphs) {
    const key = p.page_label || String(p.page_number);
    if (!current || current.key !== key) {
      current = { key, label: p.page_label || String(p.page_number), paragraphs: [] };
      pages.push(current);
    }
    current.paragraphs.push(p);
  }
  return pages;
}

/**
 * Chapter loader: IndexedDB first (instant + offline), network revalidate
 * when the cached copy is older than the 900s TTL (contract §5).
 */
export function useChapterLoader(code: string) {
  const inflight = useRef(new Map<number, Promise<ChapterPayload | null>>());

  return useCallback(
    async (number: number): Promise<ChapterPayload | null> => {
      const existing = inflight.current.get(number);
      if (existing) return existing;
      const promise = (async () => {
        const cached = await getCachedChapter(code, number);
        if (cached?.fresh) return cached.payload;
        try {
          const fresh = await getChapter(code, number);
          await putCachedChapter(code, number, fresh);
          return fresh;
        } catch {
          // offline / BE down — stale cache is far better than nothing
          return cached?.payload ?? null;
        }
      })();
      inflight.current.set(number, promise);
      promise.finally(() => inflight.current.delete(number));
      return promise;
    },
    [code]
  );
}

/** Cache the SSR-provided chapter and keep it warm for offline. */
export function useSeedCache(code: string, chapter: ChapterPayload | null) {
  const seeded = useRef(false);
  useEffect(() => {
    if (chapter && !seeded.current) {
      seeded.current = true;
      void putCachedChapter(code, chapter.number, chapter);
    }
  }, [code, chapter]);
}
