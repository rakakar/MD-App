"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { EmptyState, PageContainer } from "@/components/ui";
import { localNotes, syncPersonal, unsaveNote } from "@/lib/personal";
import { refToHref } from "@/lib/refs";
import type { LocalNote } from "@/lib/storage";

export default function NotesPage() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<LocalNote[] | null>(null);

  const reload = useCallback(() => setRows(localNotes()), []);

  useEffect(() => {
    if (loading) return;
    reload();
    if (user) void syncPersonal().then(reload);
  }, [user, loading, reload]);

  const remove = (ref: string) => {
    unsaveNote(ref, !!user);
    reload();
  };

  return (
    <PageContainer>
      <h1 className="font-display text-2xl font-medium">Notes</h1>
      {!loading && !user && rows !== null && rows.length > 0 && (
        <p className="mt-1 text-xs text-ink-soft">
          Saved on this device ·{" "}
          <Link href="/login?next=/me/notes" className="underline">
            Sign in to sync
          </Link>
        </p>
      )}

      <div className="mt-5">
        {rows === null ? null : rows.length === 0 ? (
          <EmptyState
            title="No notes yet"
            hint="Select any passage in the reader and choose Note."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((n) => (
              <li key={n.canonical_ref} className="rounded-2xl border border-rule bg-white p-4">
                {/* the passage first, then what you said about it — a note
                    without its subject is hard to place months later */}
                {n.text_hi && (
                  <p
                    lang="hi"
                    className="hi mb-3 line-clamp-2 border-s-2 ps-3 text-sm leading-relaxed text-ink-soft"
                    style={{ borderColor: "var(--ws-color)" }}
                  >
                    {n.text_hi}
                  </p>
                )}
                <p className="whitespace-pre-wrap text-sm">{n.text}</p>
                <div className="mt-3 flex items-center justify-between">
                  <Link
                    href={refToHref(n.canonical_ref)}
                    className="text-xs font-medium underline-offset-2 hover:underline"
                    style={{ color: "var(--ws-ink)" }}
                  >
                    {n.canonical_ref} →
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(n.canonical_ref)}
                    aria-label={`Delete note on ${n.canonical_ref}`}
                    className="rounded-full px-2 py-1 text-xs text-ink-soft hover:bg-black/5"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageContainer>
  );
}
