"use client";

import { useState } from "react";
import { FindRow } from "@/components/library/FindRow";
import { findLibrary } from "@/lib/api";
import { FIND_PAGE, type FindState } from "@/lib/find";
import type { ShelfMap } from "@/lib/library";
import type { LibrarySearchRow } from "@/lib/types";

/**
 * "और दिखाएँ" — the rest of a long answer, a page at a time.
 *
 * This replaces a silent cap. `library/search/` used to return fifty rows
 * and stop, so the fifty-first hit simply did not exist and nothing on screen
 * said so — a reader is never quietly shown a truncated answer (U12).
 *
 * The first page is server-rendered with the page it belongs to; only the
 * pages a reader actually asks for are fetched here and appended in place.
 * Appending rather than paging is the mobile-first call: on a phone, a "next"
 * link that replaces what you were reading loses the three rows you were
 * halfway through comparing, and the scroll position with them.
 *
 * Rendered **inside** the results list — rows and the button alike — so the
 * page a reader asks for arrives as a continuation of the one they were
 * reading rather than as a second card below the first.
 */
export function MoreResults({
  scope,
  state,
  total,
  firstPage,
  shelves,
}: {
  scope: { workspace?: string; under?: number };
  state: FindState;
  /** `count` — everything in scope, so this knows when to stop offering */
  total: number;
  /** how many the server already drew */
  firstPage: number;
  shelves: ShelfMap;
}) {
  const [rows, setRows] = useState<LibrarySearchRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const shown = firstPage + rows.length;
  const remaining = total - shown;

  async function more() {
    setBusy(true);
    setFailed(false);
    try {
      const page = await findLibrary({ ...scope, state, limit: FIND_PAGE, offset: shown });
      setRows((current) => [...current, ...page.results]);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {rows.map((row) => (
        <li key={`${row.type}-${row.id}`}>
          <FindRow row={row} shelves={shelves} />
        </li>
      ))}

      {remaining > 0 && (
        <li>
          <button
            type="button"
            onClick={more}
            disabled={busy}
            className="w-full px-4 py-3 text-xs font-semibold transition-colors hover:bg-black/[.03] disabled:opacity-60"
            style={{ color: "var(--ws-ink)" }}
          >
            <span lang="hi" className="hi">
              {busy ? "ला रहे हैं…" : "और दिखाएँ"}
            </span>
            {!busy && <span className="ms-1 tabular-nums opacity-70">{remaining}</span>}
          </button>
          {failed && (
            <p lang="hi" className="hi pb-3 text-center text-xs text-ink-soft">
              अभी नहीं ला सके — फिर से देखें।
            </p>
          )}
        </li>
      )}
    </>
  );
}
