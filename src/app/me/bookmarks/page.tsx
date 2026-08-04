"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { EmptyState, PageContainer } from "@/components/ui";
import { localBookmarks, syncPersonal, unsaveBookmark } from "@/lib/personal";
import { refToHref } from "@/lib/refs";
import type { LocalBookmark } from "@/lib/storage";

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
      <h1 className="font-display text-2xl font-medium">Bookmarks</h1>
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
            title="No bookmarks yet"
            hint="Select any passage in the reader and choose Bookmark."
          />
        ) : (
          <ul className="divide-y divide-rule overflow-hidden rounded-2xl border border-rule bg-white">
            {rows.map((b) => (
              <li key={b.canonical_ref} className="flex items-center gap-3 px-4 py-3">
                <Link href={refToHref(b.canonical_ref)} className="min-w-0 flex-1">
                  {/* the saved words, not the reference they were filed under */}
                  {b.text_hi ? (
                    <p lang="hi" className="hi line-clamp-2 text-sm leading-relaxed">
                      {b.text_hi}
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
                  aria-label={`Remove bookmark ${b.canonical_ref}`}
                  className="rounded-full px-2 py-1 text-xs text-ink-soft hover:bg-black/5"
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
