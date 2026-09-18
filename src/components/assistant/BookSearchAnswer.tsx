"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { BookmarkIcon, ChevronRight } from "@/components/shell/icons";
import { track } from "@/lib/analytics";
import { search, searchLibrary } from "@/lib/api";
import { quotedPhrase } from "@/lib/assistant/intent";
import { localBookmarks, saveBookmark, unsaveBookmark } from "@/lib/personal";
import { refToHref } from "@/lib/refs";
import { LibraryLane } from "@/components/library/LibraryLane";
import type { LibrarySearchRow, SearchResponse, SearchResult } from "@/lib/types";
import { AnswerEyebrow } from "./parts";

/** cards before "N more passages" — enough to judge the list by */
const FIRST = 5;
const STEP = 10;

/**
 * 4 · Book search — exact phrase, or words.
 *
 * The same live retrieval `GET search` has always been (meaning + words,
 * contract §9.1), with two things the comp adds on top:
 *
 * - **Quotes mean "these words, in this order".** The engine has no phrase
 *   mode, so the passages it returns are narrowed here to the ones that
 *   actually contain the phrase. When none do, the list is still shown, and
 *   says it is the nearest passages rather than pretending they are exact.
 * - **Book chips.** Counted from the results in hand — the BE sends the whole
 *   ranked set in one response, so narrowing is free and needs no second call.
 */
export function BookSearchAnswer({
  query,
  asTyped,
  onSettle,
}: {
  query: string;
  /** skip the Roman → Devanagari rewrite — the composer's EN setting */
  asTyped: boolean;
  onSettle: (summary: string, count: number) => void;
}) {
  const phrase = quotedPhrase(query);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [raw, setRaw] = useState(asTyped);
  const [failed, setFailed] = useState(false);
  const [book, setBook] = useState<string | null>(null);
  const [shown, setShown] = useState(FIRST);
  /**
   * The library's own answer, matched on titles and tags — never merged into
   * the passages above it (contract §13.5): a passage is quotable back to
   * A. Nagraj ji, a folder whose name contains the word is not evidence.
   * Not asked for a quoted phrase, which is a question about wording.
   */
  const [library, setLibrary] = useState<LibrarySearchRow[] | null>(null);
  useEffect(() => {
    if (phrase) return;
    const ctrl = new AbortController();
    searchLibrary(query, ctrl.signal)
      .then(setLibrary)
      .catch(() => setLibrary(null));
    return () => ctrl.abort();
  }, [query, phrase]);

  useEffect(() => {
    const ctrl = new AbortController();
    setResponse(null);
    setFailed(false);
    search(phrase ?? query, { raw, signal: ctrl.signal })
      .then((r) => {
        setResponse(r);
        track("search", { query_length: query.length, results: r.total, mode: r.mode });
      })
      .catch((e) => {
        if ((e as Error).name !== "AbortError") setFailed(true);
      });
    return () => ctrl.abort();
  }, [query, phrase, raw]);

  /** Passages that really contain the phrase, when one was quoted. */
  const exact = useMemo(() => {
    if (!response || !phrase) return null;
    const needle = normalise(phrase);
    const searched = response.searchedAs ? normalise(response.searchedAs) : null;
    return response.results.filter((r) => {
      const hay = normalise(`${r.text ?? ""} ${r.snippet ?? ""}`);
      return hay.includes(needle) || (searched !== null && hay.includes(searched));
    });
  }, [response, phrase]);

  const pool = useMemo(
    () => (exact && exact.length > 0 ? exact : (response?.results ?? [])),
    [exact, response]
  );
  const books = useMemo(() => countBooks(pool), [pool]);
  const list = book ? pool.filter((r) => bookKey(r) === book) : pool;
  const terms = phrase ? [phrase, ...(response?.searchedAs ? [response.searchedAs] : [])] : (response?.terms ?? []);

  useEffect(() => {
    if (!response) return;
    const titles = books.slice(0, 2).map((b) => b.title);
    onSettle(
      pool.length === 0
        ? "No passages found"
        : `${pool.length} passages · ${titles.join(", ")}`,
      pool.length
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  if (failed) {
    return <p className="text-sm text-ink-soft">Search is unavailable right now.</p>;
  }
  if (!response) {
    return <p className="text-sm text-ink-soft" role="status">Searching the books…</p>;
  }

  const label = phrase
    ? exact && exact.length > 0
      ? `Exact phrase · ${exact.length} ${exact.length === 1 ? "passage" : "passages"}`
      : "Nearest passages"
    : `In the books · ${pool.length} ${pool.length === 1 ? "passage" : "passages"}`;

  return (
    <div className="flex flex-col gap-4">
      <AnswerEyebrow label={label} />

      {phrase && exact && exact.length === 0 && pool.length > 0 && (
        <p className="text-sm text-ink-soft">
          No passage has these exact words together. These are the closest.
        </p>
      )}

      {/* The books are Devanagari, so a Roman query is rewritten first. Saying
          so is what lets someone whose English word was mistranslated get
          back to what they typed. */}
      {response.searchedAs && (
        <p className="text-sm text-ink-soft">
          Showing results for{" "}
          <span lang="hi" className="hi font-semibold text-ink">
            {response.searchedAs}
          </span>{" "}
          ·{" "}
          <button type="button" onClick={() => setRaw(true)} className="underline underline-offset-2">
            search as typed
          </button>
        </p>
      )}

      {pool.length === 0 && !library?.length && (
        <p className="text-sm text-ink-soft">Nothing in the books matches “{phrase ?? query}”.</p>
      )}

      {books.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          <BookChip
            label="All books"
            count={pool.length}
            selected={book === null}
            onClick={() => {
              setBook(null);
              setShown(FIRST);
            }}
          />
          {books.map((b) => (
            <BookChip
              key={b.key}
              label={b.title}
              count={b.count}
              selected={book === b.key}
              onClick={() => {
                setBook(b.key);
                setShown(FIRST);
              }}
            />
          ))}
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {list.slice(0, shown).map((r, i) => (
          <PassageCard key={r.canonical_ref ?? i} result={r} terms={terms} />
        ))}
      </ul>

      {list.length > shown && (
        <button
          type="button"
          onClick={() => setShown((n) => n + STEP)}
          className="mx-auto inline-flex min-h-11 items-center rounded-full border border-rule bg-card px-5 text-sm font-medium"
        >
          {list.length - shown} more {list.length - shown === 1 ? "passage" : "passages"}
        </button>
      )}

      {library && library.length > 0 && <LibraryLane rows={library} />}
    </div>
  );
}

function normalise(s: string): string {
  return s.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
}

function bookKey(r: SearchResult): string {
  return r.book_code ?? r.book_title ?? "";
}

function countBooks(results: SearchResult[]) {
  const map = new Map<string, { key: string; title: string; count: number }>();
  for (const r of results) {
    const key = bookKey(r);
    if (!key) continue;
    const row = map.get(key) ?? { key, title: r.book_title ?? key, count: 0 };
    row.count += 1;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

/**
 * A chip that carries its count. Selected is the dark fill the comp draws —
 * ink, not the answer's colour — and it carries `aria-pressed` besides, so the
 * choice is never told by colour alone.
 */
function BookChip({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex min-h-11 max-w-[14rem] shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm ${
        selected ? "border-transparent bg-ink font-semibold text-surface" : "border-rule bg-card text-ink"
      }`}
    >
      <span lang="hi" className={`truncate ${/[ऀ-ॿ]/.test(label) ? "hi-note" : ""}`}>
        {label}
      </span>
      <span className={selected ? "opacity-80" : "text-ink-soft"}>{count}</span>
    </button>
  );
}

const RE_SPECIAL = /[.*+?^${}()|[\]\\]/g;

/** Searched words marked in the snippet — as React nodes, never as HTML. */
function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const parts = useMemo(() => {
    const t = terms.filter(Boolean);
    if (!t.length) return [text];
    const pattern = t.map((x) => x.replace(RE_SPECIAL, "\\$&")).join("|");
    return text.split(new RegExp(`(${pattern})`, "gi"));
  }, [text, terms]);
  const set = useMemo(() => new Set(terms.map((t) => t.toLowerCase())), [terms]);
  return (
    <>
      {parts.map((part, i) =>
        set.has(part.toLowerCase()) ? (
          <mark
            key={i}
            className="rounded px-0.5 text-ink"
            style={{ background: "color-mix(in srgb, var(--color-accent) 18%, var(--color-card))" }}
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

/**
 * One passage: where it is, the words around the match, and the two things a
 * reader does with it — go and read it, or keep it.
 */
function PassageCard({ result, terms }: { result: SearchResult; terms: string[] }) {
  const { user } = useAuth();
  const ref = result.canonical_ref;
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (ref) setSaved(localBookmarks().some((b) => b.canonical_ref === ref));
  }, [ref]);

  const text = (result.snippet as string) || (result.text as string) || "";
  const where = [
    result.chapter_number !== undefined && `Ch. ${result.chapter_number}`,
    result.page_number !== undefined && `p. ${result.page_number}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="rounded-card border border-rule bg-card p-5 shadow-card">
      <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
        {result.book_title && (
          <span lang="hi" className="hi-note font-semibold" style={{ color: "var(--color-accent-deep)" }}>
            {result.book_title}
          </span>
        )}
        {where && <span className="text-ink-soft">· {where}</span>}
      </p>
      <p lang="hi" className="hi mt-2 text-lg leading-relaxed">
        <Highlight text={text} terms={terms} />
      </p>
      <div className="mt-3 flex items-center border-t border-rule pt-2">
        {ref && (
          <Link
            href={refToHref(ref)}
            onClick={() => track("search_result_click", { type: result.type })}
            className="inline-flex min-h-11 flex-1 items-center gap-1 text-sm font-semibold"
            style={{ color: "var(--color-accent-deep)" }}
          >
            Open in reader
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
        {ref && result.book_code && (
          <button
            type="button"
            aria-pressed={saved}
            aria-label={saved ? "Remove from highlights" : "Save to highlights"}
            onClick={() => {
              if (saved) {
                unsaveBookmark(ref, !!user);
              } else {
                saveBookmark(
                  {
                    canonical_ref: ref,
                    book_code: result.book_code!,
                    book_title: result.book_title,
                    text_hi: (result.text as string) || text,
                  },
                  !!user
                );
                track("bookmark_add", { source: "assistant" });
              }
              setSaved(!saved);
            }}
            className="flex h-11 w-11 items-center justify-center rounded-control border border-rule"
            style={saved ? { color: "var(--color-accent-deep)" } : undefined}
          >
            <BookmarkIcon filled={saved} className={`h-5 w-5 ${saved ? "" : "text-ink-soft"}`} />
          </button>
        )}
      </div>
    </li>
  );
}
