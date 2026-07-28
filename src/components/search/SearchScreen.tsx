"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useWorkspace } from "@/components/shell/WorkspaceProvider";
import { Icon } from "@/components/shell/icons";
import { PageContainer } from "@/components/ui";
import { track } from "@/lib/analytics";
import { search } from "@/lib/api";
import { refToHref } from "@/lib/refs";
import type { SearchResponse, SearchResult } from "@/lib/types";
import { isContentWorkspace } from "@/lib/workspaceConfig";

/**
 * v1 centre-slot Search (PRD §7). This component boundary is the future
 * assistant slot — keep everything inside so the v2 swap is internal.
 */

// A first page of ten, then the rest on request. The BE already sent them
// all, so "show more" is a reveal, not a fetch.
const FIRST_PAGE = 10;

export function SearchScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const { workspace } = useWorkspace();
  const initialQ = params.get("q") ?? "";
  const [q, setQ] = useState(initialQ);
  const [scope, setScope] = useState<"all" | "workspace">("all");
  // "search as typed" — skips the BE's Hinglish→Devanagari rewrite. Resets on
  // every new query, because it is a correction to one rewrite, not a setting.
  const [raw, setRaw] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Journey and Connect have no section, so they get no scope chips (PRD §7)
  const contentWorkspace = isContentWorkspace(workspace.id);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setResponse(null);
      return;
    }
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setBusy(true);
      setError(false);
      try {
        // ?section= takes a section code, which is the workspace id (contract §10)
        const section = scope === "workspace" && contentWorkspace ? workspace.id : undefined;
        const res = await search(query, { section, raw, signal: ctrl.signal });
        setResponse(res);
        setExpanded(false);
        track("search", { query_length: query.length, results: res.total, mode: res.mode });
        router.replace(`/search?q=${encodeURIComponent(query)}`, { scroll: false });
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError(true);
      } finally {
        setBusy(false);
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, scope, raw]);

  const results = response?.results ?? [];
  const shown = expanded ? results : results.slice(0, FIRST_PAGE);

  return (
    <PageContainer>
      <div className="flex items-center gap-2 rounded-2xl border border-rule bg-white px-4 py-2.5 focus-within:border-(--ws-color)">
        <Icon name="search" className="h-4.5 w-4.5 shrink-0 text-ink-soft" />
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setRaw(false);
          }}
          placeholder="खोजें… paribhasha, sutra, books"
          aria-label="Search"
          className="hi w-full bg-transparent text-base outline-none"
        />
      </div>

      {contentWorkspace && (
        <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Search scope">
          {(
            [
              ["all", "All"],
              ["workspace", workspace.name],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={scope === value}
              onClick={() => setScope(value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                scope === value ? "border-transparent text-white" : "border-rule bg-white"
              }`}
              style={scope === value ? { background: "var(--ws-color)" } : undefined}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/*
        The books are in Devanagari, so a Latin query is rewritten before it is
        searched. Saying so matters: without this line, someone who typed
        "anubhav" sees Hindi results appear with no explanation — and someone
        searching an English word we translated wrongly has no way back.
      */}
      {response?.searchedAs && !busy && (
        <p className="mt-3 text-xs text-ink-soft">
          Showing results for{" "}
          <span lang="hi" className="hi font-medium text-ink">
            {response.searchedAs}
          </span>
          {" · "}
          <button
            type="button"
            onClick={() => setRaw(true)}
            className="underline underline-offset-2"
          >
            search for “{q.trim()}” instead
          </button>
        </p>
      )}

      <div className="mt-5">
        {busy && <p className="text-center text-sm text-ink-soft">Searching…</p>}
        {error && (
          <p className="text-center text-sm text-ink-soft">Search is unavailable right now.</p>
        )}
        {!busy && response !== null && results.length === 0 && (
          <p className="text-center text-sm text-ink-soft">
            No results for “{q.trim()}”.
          </p>
        )}
        {results.length > 0 && (
          <>
            <p className="mb-3 px-1 text-xs text-ink-soft">
              {results.length === 1 ? "1 result" : `${results.length} results`}
            </p>
            <ul className="flex flex-col gap-3">
              {shown.map((r, i) => (
                <ResultCard key={r.canonical_ref ?? i} result={r} terms={response!.terms} />
              ))}
            </ul>
            {!expanded && results.length > FIRST_PAGE && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="mt-4 w-full rounded-2xl border border-rule bg-white px-4 py-3 text-sm font-medium"
                style={{ color: "var(--ws-ink)" }}
              >
                Show {results.length - FIRST_PAGE} more
              </button>
            )}
          </>
        )}
      </div>

      {/* assistant placeholder — quiet inline banner (PRD §7). It sits below
          the results rather than above them: on an empty search it used to be
          the loudest thing on the screen, which read as an apology. */}
      <p className="mt-8 text-center text-xs text-ink-soft">
        <span lang="hi" className="hi">स्मार्ट सहायक जल्द आ रहा है</span> · Smart assistant
        coming soon
      </p>
    </PageContainer>
  );
}

function fmtTimestamp(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

const RE_SPECIAL = /[.*+?^${}()|[\]\\]/g;

/**
 * Mark the searched words inside a snippet. Rendered as React nodes, never as
 * HTML, so book text can never inject markup. Terms arrive longest-first from
 * the BE, which keeps a short term from splitting a longer match.
 */
function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const parts = useMemo(() => {
    if (!terms.length) return [text];
    const pattern = terms.map((t) => t.replace(RE_SPECIAL, "\\$&")).join("|");
    return text.split(new RegExp(`(${pattern})`, "gi"));
  }, [text, terms]);
  const matches = useMemo(() => new Set(terms.map((t) => t.toLowerCase())), [terms]);

  return (
    <>
      {parts.map((part, i) =>
        matches.has(part.toLowerCase()) ? (
          <mark key={i} className="bg-transparent font-semibold text-ink">
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
 * Forward-compatible result renderer: handles text | audio | video with
 * optional timestamp even though v1 returns text only (PRD §3 out-scope).
 */
function ResultCard({ result, terms }: { result: SearchResult; terms: string[] }) {
  const ref = result.canonical_ref;
  const snippet =
    (result.snippet as string) ||
    (result.text as string) ||
    (result.text_hi as string) ||
    "";
  const title =
    (result.book_title as string) ||
    (result.title as string) ||
    (result.title_hi as string) ||
    "";

  const badge =
    result.type === "audio" ? "🎧 Audio" : result.type === "video" ? "▶ Video" : null;

  const href =
    result.type === "text" && ref
      ? refToHref(ref)
      : result.type === "video"
        ? "/videos"
        : result.type === "audio"
          ? "/audio"
          : "/books";

  return (
    <li>
      <Link
        href={href}
        onClick={() => track("search_result_click", { type: result.type })}
        className="block rounded-2xl border border-rule bg-white p-4 transition-shadow hover:shadow-md"
      >
        {badge && (
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--ws-ink)" }}>
            {badge}
            {result.timestamp !== undefined && ` · ${fmtTimestamp(result.timestamp)}`}
          </span>
        )}
        {snippet && (
          <p lang="hi" className="hi line-clamp-3 text-[15px] leading-relaxed">
            <Highlight text={snippet} terms={terms} />
          </p>
        )}
        <p className="mt-2 text-xs text-ink-soft">
          {title && <span lang="hi" className="hi">{title}</span>}
          {result.page_number !== undefined && (
            <span lang="hi" className="hi ml-2">पृष्ठ {result.page_number}</span>
          )}
          {ref && <span className="ml-2">{ref}</span>}
        </p>
      </Link>
    </li>
  );
}
