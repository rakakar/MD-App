"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBooks } from "@/lib/api";
import { STAGES, stageBooks } from "@/lib/journey";
import type { BookSummary } from "@/lib/types";

/**
 * **Next on the path**, under "You've reached the end of this book" (16 Nov
 * 2026, UX audit IA10).
 *
 * Finishing a book is the biggest stopping point in a reader's year, and the
 * end card offered only the way back to the book just read. The study path
 * already orders the literature — each stage's books in its own order, stage
 * after stage — so the book after this one in that order is the suggestion.
 *
 * Originals only, as the path is: a translation, or a book the path does not
 * name, gets nothing rather than a guess. Asked for once, when the end is
 * reached; a failed shelf costs only the suggestion.
 */
export function NextOnPath({
  bookCode,
  className,
  style,
}: {
  bookCode: string;
  className: string;
  style?: React.CSSProperties;
}) {
  const [next, setNext] = useState<BookSummary | null>(null);

  useEffect(() => {
    let live = true;
    getBooks({ workspace: "originals" })
      .then((books) => {
        if (!live) return;
        const order: BookSummary[] = [];
        for (const stage of STAGES) {
          for (const b of stageBooks(stage, books)) {
            if (!order.some((o) => o.code === b.code)) order.push(b);
          }
        }
        const at = order.findIndex((b) => b.code === bookCode);
        setNext(at >= 0 ? (order[at + 1] ?? null) : null);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [bookCode]);

  if (!next) return null;

  return (
    <Link href={`/books/${encodeURIComponent(next.code)}`} className={className} style={style}>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold" style={{ color: "var(--ws-ink)" }}>
          Next on the study path
        </span>
        <span lang="hi" className="hi hi-tight mt-1 line-clamp-2 font-semibold">
          {next.title_hi}
        </span>
      </span>
      <span aria-hidden className="shrink-0 text-lg" style={{ color: "var(--ws-ink)" }}>
        →
      </span>
    </Link>
  );
}
