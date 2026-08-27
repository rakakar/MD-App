"use client";

import { useCallback, useEffect, useRef } from "react";
import { getChapter } from "@/lib/api";
import { pageScript, type BookScript } from "@/lib/bookLanguage";
import { getCachedChapter, putCachedChapter } from "@/lib/idb";
import type { ChapterPayload, Paragraph } from "@/lib/types";

export interface ReaderPage {
  /** printed page number, or front-matter label */
  key: string;
  label: string;
  paragraphs: Paragraph[];
  /**
   * Which language this page is in, on the two facing-page bilingual editions
   * — `null` on a page that belongs to both (front matter, the term glossary)
   * and on every page of an ordinary single-language book, where nothing is
   * being told apart. See `lib/bookLanguage.ts`.
   */
  script: BookScript | null;
}

/** Group a chapter's paragraphs into display pages (contract §0). */
export function groupPages(paragraphs: Paragraph[]): ReaderPage[] {
  const pages: ReaderPage[] = [];
  let current: ReaderPage | null = null;
  for (const p of paragraphs) {
    const key = p.page_label || String(p.page_number);
    if (!current || current.key !== key) {
      current = {
        key,
        label: p.page_label || String(p.page_number),
        paragraphs: [],
        script: null,
      };
      pages.push(current);
    }
    current.paragraphs.push(p);
  }
  // Judged once the page is whole: a page is classified on all its lettering
  // at once, and the first paragraph of an English page is often a Devanagari
  // heading carried over from the facing side.
  for (const page of pages) page.script = pageScript(page.paragraphs);
  return pages;
}

/**
 * Why a chapter could not be produced. Worth distinguishing: "you are
 * offline and it isn't downloaded" is the user's problem to fix, while
 * "the request failed" is ours — reporting the second as the first (which
 * this used to do) sends everyone hunting for a network fault that isn't
 * there. A CORS-blocked response looks exactly like this to the browser.
 */
export type ChapterLoadFailure = "offline" | "request-failed";

export type ChapterLoad =
  | { ok: true; payload: ChapterPayload }
  | { ok: false; reason: ChapterLoadFailure };

/**
 * Chapter loader: IndexedDB first (instant + offline), network revalidate
 * when the cached copy is older than the 900s TTL (contract §5).
 */
export function useChapterLoader(code: string) {
  const inflight = useRef(new Map<number, Promise<ChapterLoad>>());

  return useCallback(
    async (number: number): Promise<ChapterLoad> => {
      const existing = inflight.current.get(number);
      if (existing) return existing;
      const promise = (async (): Promise<ChapterLoad> => {
        const cached = await getCachedChapter(code, number);
        if (cached?.fresh) return { ok: true, payload: cached.payload };
        try {
          const fresh = await getChapter(code, number);
          await putCachedChapter(code, number, fresh);
          return { ok: true, payload: fresh };
        } catch {
          // Network refused us — a stale cached copy is far better than
          // nothing, so serve it and say nothing.
          if (cached?.payload) return { ok: true, payload: cached.payload };
          const offline = typeof navigator !== "undefined" && navigator.onLine === false;
          return { ok: false, reason: offline ? "offline" : "request-failed" };
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
