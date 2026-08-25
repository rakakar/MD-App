"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { PersonalHeader, usePersonalRows } from "@/components/me/PersonalTabs";
import { EmptyState, PageContainer } from "@/components/ui";
import { unsaveNote } from "@/lib/personal";
import { refToHref } from "@/lib/refs";

/**
 * **Notes — the other half of My Journey's Highlights & Notes.**
 *
 * Its own route, under the shared heading and tab bar the Highlights list
 * wears; `PersonalTabs` carries the reasoning, including why this is two
 * routes rather than one page holding a tab in state.
 */
export default function NotesPage() {
  const { user } = useAuth();
  const { rows, reload } = usePersonalRows();
  const notes = rows?.notes ?? null;

  const remove = (ref: string) => {
    unsaveNote(ref, !!user);
    reload();
  };

  return (
    <PageContainer>
      <PersonalHeader active="notes" rows={rows} />

      <div className="mt-5">
        {notes === null ? null : notes.length === 0 ? (
          <EmptyState
            title="No notes yet"
            hint="Select any passage in the reader and choose Note."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {notes.map((n) => (
              <li key={n.canonical_ref} className="rounded-2xl border border-rule bg-card p-4">
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
                    className="rounded-full px-2 py-1 text-xs text-ink-soft hover:bg-ink/5"
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
