"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { HighlightsPanel } from "@/components/books/HighlightsPanel";
import { CountTabs } from "@/components/ui";
import { localHighlights, syncPersonal, type Highlight } from "@/lib/personal";
import type { ChapterTocEntry } from "@/lib/types";

/**
 * The book's two tabs, and whichever one is open.
 *
 * This owns the highlights rather than the panel, because the *tab* needs them
 * too: its count is the reason to look, and a reader with nothing marked should
 * be told that before tapping rather than after. Loading them in both places
 * would have meant two syncs on one screen and — worse — two answers, since
 * only one of the two would have been the one that just synced.
 *
 * The chapters list stays a server component and arrives as `children`. It is a
 * static list of links off data this page already has; there is nothing about
 * it that wants to be client-side, and passing it through keeps it that way.
 */
export function BookTabs({
  bookCode,
  chapters,
  chapterCount,
  chaptersHref,
  highlightsHref,
  tab,
  children,
}: {
  bookCode: string;
  chapters: ChapterTocEntry[];
  chapterCount: number;
  chaptersHref: string;
  highlightsHref: string;
  tab: "chapters" | "highlights";
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<Highlight[] | null>(null);

  const reload = useCallback(() => setRows(localHighlights(bookCode)), [bookCode]);

  useEffect(() => {
    if (loading) return;
    reload();
    if (user) void syncPersonal().then(reload);
  }, [user, loading, reload]);

  return (
    <>
      {/* 16px above the tab bar, the same as the page's own side gutter — the
          hero is full-bleed on a phone, so this gap and the gutter meet at the
          bar's top-left corner and any difference between them shows there. */}
      <div className="mt-4">
        <CountTabs
          label="This book"
          value={tab}
          tabs={[
            {
              value: "chapters",
              label: "Chapters",
              count: chapterCount,
              href: chaptersHref,
            },
            {
              value: "highlights",
              label: "Highlights & Notes",
              // Absent until the local store has been read, and absent at zero
              // — a badge saying "0" is a worse answer than no badge, and one
              // that says "0" for a frame before saying "12" is worse again.
              count: rows === null || rows.length === 0 ? undefined : rows.length,
              href: highlightsHref,
            },
          ]}
        />
      </div>

      {tab === "highlights" ? (
        <HighlightsPanel rows={rows} chapters={chapters} />
      ) : (
        children
      )}
    </>
  );
}
