"use client";

import Link from "next/link";
import { useState } from "react";
import { FindRow } from "@/components/library/FindRow";
import { provenanceLabel } from "@/components/library/ProvenanceBadge";
import type { LibrarySearchRow } from "@/lib/types";

/** first N rows; the rest are one tap away on the shelf itself */
const LANE_LIMIT = 6;

/** nearest his own word first — the order the badge legend reads in */
const PROVENANCE_ORDER = ["moola", "sankalan", "adhyayan"];

/**
 * The **Library lane** — folders and files that matched on metadata
 * (contract §13.8).
 *
 * Never merged into the citation results beside it. That separation is the
 * point rather than a layout choice: a passage hit is quotable back to
 * A. Nagraj ji by canonical ref, and a metadata hit is a title or a tag that
 * happens to contain the word. Mixing them would let a shivir folder's name
 * look like evidence.
 *
 * One list now, not three arrays to merge, and each row says what it is —
 * `type` exists only in this response because this is the only one that mixes
 * the two. Folders lead, because a folder answers "what is this?" better than
 * a lone file does.
 */
export function LibraryLane({ rows }: { rows: LibrarySearchRow[] }) {
  const [provenance, setProvenance] = useState<string | null>(null);
  if (rows.length === 0) return null;

  const shown = provenance ? rows.filter((r) => r.provenance === provenance) : rows;

  return (
    <section aria-label="Library" className="mt-8">
      <h2 className="text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
        Library materials
      </h2>
      {/*
        Said plainly, because the difference between the two lanes is invisible
        otherwise: this half searched titles and tags, not the inside of any
        file. Someone who does not know that will read an empty lane as "the
        library has nothing on this".
      */}
      <p className="mt-1 text-xs text-ink-soft">
        Matched on titles, topics, people and places — file contents are never indexed.
      </p>

      <ProvenanceFilter rows={rows} active={provenance} onChange={setProvenance} />

      <ul className="mt-3 divide-y divide-rule overflow-hidden rounded-2xl border border-rule bg-white">
        {shown.slice(0, LANE_LIMIT).map((row) => (
          <li key={`${row.type}-${row.id}`}>
            <FindRow row={row} />
          </li>
        ))}
      </ul>

      {shown.length > LANE_LIMIT && (
        <p className="mt-3 text-center text-xs">
          <Link
            href="/resources"
            className="font-semibold underline underline-offset-2"
            style={{ color: "var(--ws-ink)" }}
          >
            See the whole Resources collection
          </Link>
        </p>
      )}
    </section>
  );
}

/**
 * Source over the results — the second place the provenance question is asked.
 *
 * "उनके अपने शब्दों में व्यवस्था पर क्या है?" is one question, and a search box
 * is where it gets asked. It used to have a page of its own (everything of
 * Original provenance in one flat list), which answered a question nobody had:
 * provenance is inherited, so that page was those branches, flattened
 * away. Here it narrows a list the reader is already reading, which is the
 * shape the thing always wanted.
 *
 * Client-side over what the response already holds — the lane is capped at
 * fifty rows, so a round trip to narrow them would be spent on nothing.
 */
function ProvenanceFilter({
  rows,
  active,
  onChange,
}: {
  rows: LibrarySearchRow[];
  active: string | null;
  onChange: (v: string | null) => void;
}) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.provenance) counts.set(row.provenance, (counts.get(row.provenance) ?? 0) + 1);
  }
  // One option narrows nothing, so the row would be an instruction to press a
  // button that changes nothing. Same rule the folder sieve draws itself by.
  if (counts.size < 2) return null;
  const chips = PROVENANCE_ORDER.filter((p) => counts.has(p));

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {chips.map((value) => {
        const badge = provenanceLabel(value as LibrarySearchRow["provenance"]);
        const selected = active === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(selected ? null : value)}
            aria-pressed={selected}
            className={`min-h-11 inline-flex items-center rounded-full border px-3 text-xs font-medium transition-colors ${
              selected ? "border-transparent text-white" : "border-rule bg-white text-ink"
            }`}
            style={selected ? { background: "var(--ws-color)" } : undefined}
          >
            <span lang="hi" className="hi">
              {badge?.label ?? value}
            </span>
            <span className="ms-1 tabular-nums opacity-70">{counts.get(value)}</span>
          </button>
        );
      })}
    </div>
  );
}
