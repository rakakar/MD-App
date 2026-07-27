"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "@/components/shell/WorkspaceProvider";
import { Icon } from "@/components/shell/icons";
import { PageContainer } from "@/components/ui";
import { track } from "@/lib/analytics";
import { search } from "@/lib/api";
import { refToHref } from "@/lib/refs";
import type { SearchResult } from "@/lib/types";
import { isContentWorkspace } from "@/lib/workspaceConfig";

/**
 * v1 centre-slot Search (PRD §7). This component boundary is the future
 * assistant slot — keep everything inside so the v2 swap is internal.
 */
export function SearchScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const { workspace } = useWorkspace();
  const initialQ = params.get("q") ?? "";
  const [q, setQ] = useState(initialQ);
  const [scope, setScope] = useState<"all" | "workspace">("all");
  const [results, setResults] = useState<SearchResult[] | null>(null);
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
      setResults(null);
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
        const res = await search(query, { section, signal: ctrl.signal });
        setResults(res);
        track("search", { query_length: query.length });
        router.replace(`/search?q=${encodeURIComponent(query)}`, { scroll: false });
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError(true);
      } finally {
        setBusy(false);
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, scope]);

  return (
    <PageContainer>
      <div className="flex items-center gap-2 rounded-2xl border border-rule bg-white px-4 py-2.5 focus-within:border-(--ws-color)">
        <Icon name="search" className="h-4.5 w-4.5 shrink-0 text-ink-soft" />
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="खोजें… paribhasha, sutra, books"
          aria-label="Search"
          className="hi w-full bg-transparent text-base outline-none"
        />
      </div>

      {/* assistant placeholder — quiet inline banner (PRD §7) */}
      <p className="mt-2 px-1 text-xs text-ink-soft">
        <span lang="hi" className="hi">स्मार्ट सहायक जल्द आ रहा है</span> · Smart assistant
        coming soon
      </p>

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

      <div className="mt-5">
        {busy && <p className="text-center text-sm text-ink-soft">Searching…</p>}
        {error && (
          <p className="text-center text-sm text-ink-soft">Search is unavailable right now.</p>
        )}
        {!busy && results !== null && results.length === 0 && (
          <p className="text-center text-sm text-ink-soft">
            No results for “{q.trim()}”.
          </p>
        )}
        {results !== null && results.length > 0 && (
          <ul className="flex flex-col gap-3">
            {results.map((r, i) => (
              <ResultCard key={i} result={r} />
            ))}
          </ul>
        )}
      </div>
    </PageContainer>
  );
}

function fmtTimestamp(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/**
 * Forward-compatible result renderer: handles text | audio | video with
 * optional timestamp even though v1 returns text only (PRD §3 out-scope).
 */
function ResultCard({ result }: { result: SearchResult }) {
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
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--ws-color)" }}>
            {badge}
            {result.timestamp !== undefined && ` · ${fmtTimestamp(result.timestamp)}`}
          </span>
        )}
        {snippet && (
          <p lang="hi" className="hi line-clamp-3 text-[15px] leading-relaxed">
            {snippet}
          </p>
        )}
        <p className="mt-2 text-xs text-ink-soft">
          {title && <span lang="hi" className="hi">{title}</span>}
          {ref && <span className="ml-2">{ref}</span>}
        </p>
      </Link>
    </li>
  );
}
