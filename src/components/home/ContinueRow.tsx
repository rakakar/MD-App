"use client";

import { useCallback, useMemo, useState } from "react";
import { ContinueAv } from "@/components/library/ContinueAv";
import type { BookSummary } from "@/lib/types";
import { ContinueReading } from "./ContinueReading";

/** How many cards Home's row keeps, books and recordings together. */
const SHOWN = 3;

/**
 * The listening rail's `sources`, as one constant. **Never an inline `[]`.**
 * The rail redoes its library look-ups whenever `sources` changes, and this
 * row re-renders whenever the rail reports its cards — so a fresh `[]` on
 * every render was a loop: report, re-render, new `[]`, look up again, report.
 * With one saved recording it sent the library search out several times a
 * second, until the API rate-limited the reader and every other page stuck
 * loading (16 Nov 2026).
 */
const NO_SOURCES: never[] = [];

/** Same times as before → the same array, so a report changes nothing. */
function keep(prev: string[], next: string[]): string[] {
  return prev.length === next.length && prev.every((s, i) => s === next[i]) ? prev : next;
}

/**
 * **Continue** — Home's one resume row (16 Nov 2026, designer's call).
 *
 * Home had two: Continue Reading, and Continue Listening under it (added the
 * day before, UX audit IA3). A returning reader then met two full-width resume
 * rows before anything new, with two different heading styles side by side.
 * Now there is one, holding the few most recent places of either kind, newest
 * first — the reader has not said yet whether they came to read or to listen,
 * and the row should not make them choose. Books and Media keep their own
 * fuller rails, where that choice has been made.
 *
 * The two rails still build their own cards, so each keeps its own look and
 * behaviour (a recording plays in place, a book opens at its page); here they
 * render bare `<li>`s into one list. Each reports its cards' times, the row
 * works out the oldest it will keep, and hands that back as a cut-off; a flex
 * `order` from each card's time interleaves the two. Both stay mounted even
 * when empty, since an empty one still has to report.
 */
export function ContinueRow({
  books,
  className,
}: {
  /** Home's shelf, so book cards draw at hydration — see `ContinueReading` */
  books?: BookSummary[];
  className?: string;
}) {
  const [reading, setReading] = useState<string[]>([]);
  const [listening, setListening] = useState<string[]>([]);
  const onReading = useCallback((s: string[]) => setReading((p) => keep(p, s)), []);
  const onListening = useCallback((s: string[]) => setListening((p) => keep(p, s)), []);

  const all = useMemo(
    () => [...reading, ...listening].sort((a, b) => b.localeCompare(a)),
    [reading, listening]
  );
  const minStamp = all.length > SHOWN ? all[SHOWN - 1] : null;

  return (
    // `hidden` with nothing to resume: out of the layout, so Home's grid does
    // not keep an empty cell (and its gap) for a first-time reader.
    <section aria-label="Continue" className={className} hidden={all.length === 0}>
      <h2 className="mb-3 text-title font-semibold tracking-[-0.015em] text-ink">Continue</h2>
      {/* ContinueReading's rail: bleeding, snapping, the next card peeking. */}
      <ul className="-mx-4 -mb-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scroll-pl-4 sm:mx-0 sm:px-0 sm:scroll-pl-0">
        <ContinueReading bare books={books} limit={SHOWN} onStamps={onReading} minStamp={minStamp} />
        <ContinueAv bare sources={NO_SOURCES} limit={SHOWN} onStamps={onListening} minStamp={minStamp} />
      </ul>
    </section>
  );
}
