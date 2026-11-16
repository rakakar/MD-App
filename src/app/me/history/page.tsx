"use client";

import { ContinueReading } from "@/components/home/ContinueReading";
import { ContinueAv } from "@/components/library/ContinueAv";
import { NavScope } from "@/components/shell/WorkspaceProvider";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, PageContainer } from "@/components/ui";
import { BackButton } from "@/components/ui/BackButton";

const NO_SOURCES: never[] = [];

/**
 * **History** (16 Nov 2026, UX audit ST9).
 *
 * My Journey's rails stop at two books and three recordings, with no dates and
 * no "See all" — a reader who studied four books and a shivir series last
 * month could not see that trail anywhere. This is the whole of it: every
 * book with a saved place (finished ones too) and every recording, newest
 * first, each with the day it was last opened.
 *
 * Both lists are this device's, merged with the account's when signed in —
 * the same sources the rails read, without their limits.
 */
export default function HistoryPage() {
  // Each list reports what it drew; nothing in either after a moment is the
  // empty state, rather than a heading over a blank page.
  const [books, setBooks] = useState<number | null>(null);
  const [recs, setRecs] = useState<number | null>(null);
  const onBooks = useCallback((s: string[]) => setBooks(s.length), []);
  const onRecs = useCallback((s: string[]) => setRecs(s.length), []);
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 2500);
    return () => clearTimeout(t);
  }, []);
  const empty = waited && !books && !recs;

  return (
    <PageContainer>
      <NavScope href="/me" />
      <div className="flex items-center gap-2">
        <BackButton fallback="/me" />
        <h1 className="font-display text-2xl font-medium lg:text-3xl">History</h1>
      </div>
      <p className="mt-1 text-sm text-ink-soft">What you have read and listened to, newest first.</p>

      <ContinueReading
        workspace="all"
        heading="Reading"
        tier="eyebrow"
        limit={200}
        layout="stack"
        showWhen
        includeFinished
        onStamps={onBooks}
        className="mt-8"
      />
      <ContinueAv
        sources={NO_SOURCES}
        limit={200}
        heading="Listening & watching"
        note="Audio and video"
        variant="list"
        onStamps={onRecs}
      />
      {empty && (
        <div className="mt-8">
          <EmptyState
            title="Nothing here yet"
            hint="Books you open and recordings you play are listed here, with the day you last opened them."
          />
        </div>
      )}
    </PageContainer>
  );
}
