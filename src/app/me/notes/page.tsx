"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { bookTitle, PersonalHeader, usePersonalRows } from "@/components/me/PersonalTabs";
import { SavedCardFooter, savedDate } from "@/components/me/SavedCard";
import { EmptyState, PageContainer } from "@/components/ui";
import { unsaveNote } from "@/lib/personal";
import { parseRef, refToHref } from "@/lib/refs";

/**
 * **Notes — the other half of My Journey's Highlights & Notes.**
 *
 * Its own route, under the shared heading and tab bar the Highlights list
 * wears; `PersonalTabs` carries the reasoning, including why this is two
 * routes rather than one page holding a tab in state.
 */
export default function NotesPage() {
  const { user } = useAuth();
  const { rows, reload, titles } = usePersonalRows();
  /** the book the list is narrowed to, or null for all of them */
  const [book, setBook] = useState<string | null>(null);
  const all = rows?.notes ?? null;
  const notes = all && book ? all.filter((n) => n.book_code === book) : all;

  const remove = (ref: string) => {
    unsaveNote(ref, !!user);
    reload();
  };

  return (
    <PageContainer>
      <PersonalHeader
        active="notes"
        rows={rows}
        titles={titles}
        book={book}
        onBook={setBook}
      />

      <div className="mt-5">
        {notes === null ? null : notes.length === 0 ? (
          <EmptyState
            title="No notes yet"
            hint="Select any passage in the reader and choose Note."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {notes.map((n) => {
              const ref = parseRef(n.canonical_ref);
              const href = refToHref(n.canonical_ref);
              return (
                <li key={n.canonical_ref}>
                  <article className="relative rounded-card border border-rule bg-card p-4 shadow-card">
                    {/* The passage first, then what you said about it — a note
                        without its subject is hard to place months later. The
                        rule down its start is what marks it as quoted rather
                        than written, which is the one distinction this card
                        has to make. */}
                    {n.text_hi && (
                      <p
                        lang="hi"
                        className="hi line-clamp-2 border-s-2 ps-3 text-sm leading-relaxed text-ink-soft"
                        style={{ borderColor: "var(--ws-color)" }}
                      >
                        {n.text_hi}
                      </p>
                    )}
                    {/* A step up from the quote above it: the reader's own
                        words are what this card is for, and at one size the
                        two read as a single block of grey. */}
                    <p className={`whitespace-pre-wrap text-title leading-relaxed ${n.text_hi ? "mt-3" : ""}`}>
                      <Link href={href} className="after:absolute after:inset-0">
                        {n.text}
                      </Link>
                    </p>

                    <SavedCardFooter
                      bookTitle={bookTitle(n.book_code, titles)}
                      page={ref?.page ?? ""}
                      /* `created_at`, not `updated_at` — the same field the
                         highlight card dates by. It answers "when did I mark
                         this", which is how a reader finds their way back to a
                         sitting; editing a note's wording months later does not
                         move when the passage caught them. */
                      date={savedDate(n.created_at)}
                      shareTitle={n.text}
                      href={href}
                      onDelete={() => remove(n.canonical_ref)}
                      deleteLabel={`Delete note on ${n.canonical_ref}`}
                    />
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageContainer>
  );
}
