"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { EmptyState, PageContainer } from "@/components/ui";
import { deleteNote, getNotes } from "@/lib/me";
import { refToHref } from "@/lib/refs";
import { getGuestStore, removeLocalNote } from "@/lib/storage";

interface Row {
  id?: number;
  ref: string;
  text: string;
  updated?: string;
}

export default function NotesPage() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [local, setLocal] = useState(false);

  const reload = () => {
    if (user) {
      getNotes()
        .then((ns) =>
          setRows(
            ns.map((n) => ({
              id: n.id,
              ref: n.canonical_ref,
              text: n.text,
              updated: n.updated_at ?? n.created_at,
            }))
          )
        )
        .catch(() => setRows([]));
      setLocal(false);
    } else {
      setRows(
        getGuestStore().notes.map((n) => ({
          ref: n.canonical_ref,
          text: n.text,
          updated: n.updated_at,
        }))
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
      await deleteNote(row.id).catch(() => undefined);
    } else {
      removeLocalNote(row.ref);
    }
    reload();
  };

  return (
    <PageContainer>
      <h1 className="text-xl font-bold">Notes</h1>
      {local && rows !== null && rows.length > 0 && (
        <p className="mt-1 text-xs text-ink-soft">
          इसी device पर saved ·{" "}
          <Link href="/login?next=/me/notes" className="underline">
            Sign in to sync
          </Link>
        </p>
      )}

      <div className="mt-5">
        {rows === null ? null : rows.length === 0 ? (
          <EmptyState
            title="No notes yet"
            hint="Tap any paragraph in the reader and choose Note."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((r) => (
              <li key={r.ref} className="rounded-2xl border border-rule bg-white p-4">
                <p className="whitespace-pre-wrap text-sm">{r.text}</p>
                <div className="mt-3 flex items-center justify-between">
                  <Link
                    href={refToHref(r.ref)}
                    className="text-xs font-medium underline-offset-2 hover:underline"
                    style={{ color: "var(--ws-color)" }}
                  >
                    {r.ref} →
                  </Link>
                  <button
                    type="button"
                    onClick={() => void remove(r)}
                    aria-label={`Delete note on ${r.ref}`}
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
