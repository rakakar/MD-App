"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChatIcon, BookGlyph } from "@/components/assistant/icons";
import { useDictionary } from "@/components/assistant/useAssistantData";
import { ChevronRight, ShareIcon } from "@/components/shell/icons";
import { search } from "@/lib/api";
import { relatedWords } from "@/lib/assistant/related";
import { refToHref } from "@/lib/refs";
import type { ParibhashaWord, SearchResult } from "@/lib/types";

/** The top bar's share — the page's own URL, or the clipboard on a desktop. */
export function EntryShare({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={copied ? "Link copied" : `Share ${title}`}
      onClick={async () => {
        const url = window.location.href;
        try {
          if (navigator.share) return void (await navigator.share({ title, url }));
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          // a cancelled share sheet is not an error
        }
      }}
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control border border-rule bg-card"
    >
      {copied ? <span className="text-xs font-semibold">Copied</span> : <ShareIcon className="h-5 w-5" />}
    </button>
  );
}

/**
 * The half of design 3 that needs the reader's device: related words, where
 * the word occurs, and the bar to go and read it.
 *
 * **Related words** are the glossary's own headwords found inside this
 * word's definition — the words you have to know to know this one. The
 * glossary has no "related" field; its definitions are written in its own
 * vocabulary, which is a better source than a list someone would have to keep.
 *
 * **Occurrences** are the same `GET search` the Assistant runs, grouped by
 * book. It is ranked retrieval, not a concordance, so the count is "the
 * passages search finds", which is what the heading says.
 */
export function EntryExtras({ word }: { word: ParibhashaWord }) {
  const dictionary = useDictionary();
  const related = useMemo(
    () => (dictionary ? relatedWords(dictionary, word, 6) : []),
    [dictionary, word]
  );

  const [hits, setHits] = useState<SearchResult[] | null>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    search(word.hindi, { raw: true, signal: ctrl.signal })
      .then((r) => setHits(r.results.filter((x) => x.type === "text" && x.canonical_ref)))
      .catch(() => setHits([]));
    return () => ctrl.abort();
  }, [word.hindi]);

  const byBook = useMemo(() => {
    const map = new Map<string, { title: string; count: number; chapters: Set<number>; first: string }>();
    for (const h of hits ?? []) {
      const key = h.book_code ?? h.book_title ?? "";
      const row = map.get(key) ?? {
        title: h.book_title ?? key,
        count: 0,
        chapters: new Set<number>(),
        first: h.canonical_ref!,
      };
      row.count += 1;
      if (h.chapter_number !== undefined) row.chapters.add(h.chapter_number);
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [hits]);

  const first = hits?.[0]?.canonical_ref;
  const ask = `/assistant?mode=research&q=${encodeURIComponent(`${word.hindi} को सरल शब्दों में समझाइए`)}`;

  return (
    <>
      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">Related words</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {related.map((w) => (
              <Link
                key={w.id}
                href={`/paribhasha/${w.id}`}
                lang="hi"
                className="hi-note inline-flex min-h-11 items-center rounded-full border px-4 text-base font-medium"
                style={{
                  borderColor: "color-mix(in srgb, var(--ws-color) 25%, transparent)",
                  background: "color-mix(in srgb, var(--ws-color) 12%, var(--color-card))",
                  color: "var(--ws-ink)",
                }}
              >
                {w.hindi}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <div className="flex items-center gap-3">
          <h2 className="shrink-0 text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
            Occurrences
          </h2>
          <span aria-hidden className="h-px flex-1 bg-rule" />
          {hits && hits.length > 0 && (
            <span className="shrink-0 text-sm font-semibold text-ink-soft">
              {hits.length} in {byBook.length} {byBook.length === 1 ? "book" : "books"}
            </span>
          )}
        </div>
        {hits === null && <p className="mt-3 text-sm text-ink-soft">Finding it in the books…</p>}
        {hits?.length === 0 && (
          <p className="mt-3 text-sm text-ink-soft">Search finds no passage using this word.</p>
        )}
        <ul className="mt-3 flex flex-col gap-3">
          {byBook.map((b) => (
            <li key={b.title}>
              <Link
                href={`/assistant?mode=books&q=${encodeURIComponent(word.hindi)}`}
                className="flex items-center gap-3 rounded-card border border-rule bg-card px-5 py-4"
              >
                <span className="min-w-0 flex-1">
                  <span lang="hi" className="hi-note block text-lg font-semibold">
                    {b.title}
                  </span>
                  <span className="block text-sm text-ink-soft">
                    {b.count} {b.count === 1 ? "passage" : "passages"}
                    {b.chapters.size > 0 && ` · Ch. ${[...b.chapters].sort((x, y) => x - y).join(", ")}`}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Stands on the tab bar, like the Assistant's composer. */}
      <div aria-hidden className="h-24" />
      <div
        className="fixed inset-x-0 z-30 border-t border-rule bg-surface lg:left-64"
        style={{ bottom: "var(--bottom-nav-h, 0px)" }}
      >
        <div className="mx-auto flex max-w-3xl gap-3 px-4 py-3 sm:px-6">
          {first ? (
            <Link
              href={refToHref(first)}
              className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-card px-4 text-title font-semibold text-white"
              style={{ background: "var(--ws-color)" }}
            >
              <BookGlyph className="h-5 w-5" />
              Read in context
            </Link>
          ) : (
            <span className="flex-1" />
          )}
          <Link
            href={ask}
            aria-label="Ask the Assistant about this word"
            className="flex h-14 w-16 shrink-0 items-center justify-center rounded-card border border-rule bg-card"
          >
            <ChatIcon className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </>
  );
}
