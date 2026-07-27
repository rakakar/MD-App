"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { EmptyState, PageContainer } from "@/components/ui";
import { deleteBookmark, getBookmarks } from "@/lib/me";
import { refToHref } from "@/lib/refs";
import { getGuestStore, removeLocalBookmark } from "@/lib/storage";

interface Row {
  id?: number;
  ref: string;
  created?: string;
}

export default function BookmarksPage() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [local, setLocal] = useState(false);

  const reload = () => {
    if (user) {
      getBookmarks()
        .then((bs) =>
          setRows(bs.map((b) => ({ id: b.id, ref: b.canonical_ref, created: b.created_at })))
        )
        .catch(() => setRows([]));
      setLocal(false);
    } else {
      setRows(
        getGuestStore().bookmarks.map((b) => ({ ref: b.canonical_ref, created: b.created_at }))
      );
      setLocal(true);
    }
  };

  useEffect(() => {
    if (!loading) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  const remove = async (row: Row) => {
    if (user && row.id !== undefined) {
      await deleteBookmark(row.id).catch(() => undefined);
    } else {
      removeLocalBookmark(row.ref);
    }
    reload();
  };

  return (
    <PageContainer>
      <h1 className="text-xl font-bold">Bookmarks</h1>
      {local && rows !== null && rows.length > 0 && (
        <p className="mt-1 text-xs text-ink-soft">
          इसी device पर saved ·{" "}
          <Link href="/login?next=/me/bookmarks" className="underline">
            Sign in to sync
          </Link>
        </p>
      )}

      <div className="mt-5">
        {rows === null ? null : rows.length === 0 ? (
          <EmptyState
            title="No bookmarks yet"
            hint="Tap any paragraph in the reader and choose Bookmark."
          />
        ) : (
          <ul className="divide-y divide-rule overflow-hidden rounded-2xl border border-rule bg-white">
            {rows.map((r) => (
              <li key={r.ref} className="flex items-center gap-3 px-4 py-3">
                <Link href={refToHref(r.ref)} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.ref}</p>
                  {r.created && (
                    <p className="text-xs text-ink-soft">
                      {new Date(r.created).toLocaleDateString("en-IN")}
                    </p>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={() => void remove(r)}
                  aria-label={`Remove bookmark ${r.ref}`}
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
