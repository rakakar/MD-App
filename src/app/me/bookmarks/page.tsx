"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { EmptyState, PageContainer } from "@/components/ui";
import { localBookmarks, syncPersonal, unsaveBookmark } from "@/lib/personal";
import { refToHref } from "@/lib/refs";
import type { HighlightColour, LocalBookmark } from "@/lib/storage";

/** Tailwind cannot build a class name at runtime; the three are written out. */
const FILL: Record<HighlightColour, string> = {
  amber: "bg-hl-amber",
  sage: "bg-hl-sage",
  sky: "bg-hl-sky",
};

/**
 * **Highlights — every book, in one place.**
 *
 * This was "Bookmarks", and the rename is the whole change. The designer took
 * the bookmark button off the reader's bottom bar: a position saved with no
 * words attached turned out to be the thing nobody came back for, and
 * selecting a passage now offers the two things they do — paint it, or write
 * against it.
 *
 * Nothing anyone saved is lost, and nothing had to be migrated, because a
 * highlight *is* a bookmark with a colour in the store. Rows saved before the
 * colours existed simply have none and show unpainted, which is exactly what
 * they are: a passage somebody kept.
 *
 * Per-book highlights, with their notes and grouped by chapter, live on the
 * book's own Highlights & Notes tab. This is the cross-book list — the one
 * the Journey and Resources workspaces link to as "Saved".
 */
/**
 * What one saved row shows: the words the reader painted, and in which colour.
 *
 * A paragraph can hold several highlights (§6.0) while this list draws one row
 * per saved *passage*, so the spans are joined with an ellipsis rather than
 * split into rows — this screen answers "what have I saved", and the book's own
 * Highlights tab is where each one gets its own card. A row with no spans is a
 * whole-paragraph highlight or a plain save, and shows the passage as before.
 */
function saved(b: LocalBookmark): { text?: string; colour?: HighlightColour } {
  const spans = b.ranges ?? [];
  if (spans.length === 0) return { text: b.text_hi, colour: b.colour };
  return { text: spans.map((s) => s.text).join(" … "), colour: spans[0].colour };
}

export default function BookmarksPage() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<LocalBookmark[] | null>(null);

  const reload = useCallback(() => setRows(localBookmarks()), []);

  // The local store answers immediately in both states — it holds this
  // reader's own saves whether or not there is an account behind them. When
  // there is, a sync folds in anything saved on another device and we redraw.
  useEffect(() => {
    if (loading) return;
    reload();
    if (user) void syncPersonal().then(reload);
  }, [user, loading, reload]);

  const remove = (ref: string) => {
    unsaveBookmark(ref, !!user);
    reload();
  };

  return (
    <PageContainer>
      <h1 className="font-display text-2xl font-medium">Highlights</h1>
      {!loading && !user && rows !== null && rows.length > 0 && (
        <p className="mt-1 text-xs text-ink-soft">
          Saved on this device ·{" "}
          <Link href="/login?next=/me/bookmarks" className="underline">
            Sign in to sync
          </Link>
        </p>
      )}

      <div className="mt-5">
        {rows === null ? null : rows.length === 0 ? (
          <EmptyState
            title="Nothing highlighted yet"
            hint="Press and hold any line while reading, then pick a colour."
          />
        ) : (
          <ul className="divide-y divide-rule overflow-hidden rounded-2xl border border-rule bg-card">
            {rows.map((b) => (
              <li key={b.canonical_ref} className="flex items-center gap-3 px-4 py-3">
                <Link href={refToHref(b.canonical_ref)} className="min-w-0 flex-1">
                  {/* the saved words, not the reference they were filed under */}
                  {saved(b).text ? (
                    <p lang="hi" className="hi line-clamp-2 text-sm leading-relaxed">
                      {/* Painted in the colour it was saved in, so this list
                          reads the way the page did. A row from before the
                          colours existed gets none and reads as a quotation. */}
                      <span
                        className={
                          saved(b).colour
                            ? `box-decoration-clone rounded-md px-1 ${FILL[saved(b).colour!]}`
                            : ""
                        }
                      >
                        {saved(b).text}
                      </span>
                    </p>
                  ) : (
                    <p className="truncate text-sm font-medium">{b.canonical_ref}</p>
                  )}
                  <p className="mt-1 text-xs text-ink-soft">
                    {b.canonical_ref}
                    {b.created_at &&
                      ` · ${new Date(b.created_at).toLocaleDateString("en-IN")}`}
                  </p>
                </Link>
                <button
                  type="button"
                  onClick={() => remove(b.canonical_ref)}
                  aria-label={`Remove highlight ${b.canonical_ref}`}
                  className="rounded-full px-2 py-1 text-xs text-ink-soft hover:bg-ink/5"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageContainer>
  );
}
