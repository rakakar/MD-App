"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { EmptyState, PageContainer, SectionHeading } from "@/components/ui";
import { getBooks } from "@/lib/api";
import {
  localBookmarks,
  localNotes,
  localProgress,
  syncPersonal,
} from "@/lib/personal";
import { parseRef, refToHref } from "@/lib/refs";

interface Overview {
  resume: { key: string; title: string; detail: string; href: string }[];
  bookmarkCount: number;
  noteCount: number;
}

function SyncCta() {
  return (
    <div className="rounded-2xl border border-rule bg-white p-4">
      <p className="text-sm font-medium">Saved on this device</p>
      <p className="mt-1 text-xs text-ink-soft">
        Your progress, bookmarks and notes live only on this device right now.
      </p>
      <Link
        href="/login?next=/me"
        className="mt-3 inline-block rounded-full px-4 py-1.5 text-sm font-semibold text-white"
        style={{ background: "var(--ws-color)" }}
      >
        Sign in to sync across devices
      </Link>
    </div>
  );
}

export default function MyJourneyPage() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<Overview | null>(null);

  // One source in both states: the local store, which every reader writes to.
  // Signing in adds a sync pass that folds in other devices — it does not
  // change where this screen reads from.
  const render = useCallback(async () => {
    const progress = localProgress();
    // a resume card should name the book; fall back to the book list only for
    // rows that arrived from the server without a title
    let titleOf = new Map<string, string>();
    if (progress.some((p) => !p.book_title)) {
      titleOf = new Map((await getBooks().catch(() => [])).map((b) => [b.code, b.title_hi]));
    }
    setData({
      resume: progress.map((p) => ({
        key: p.book_code,
        title: p.book_title ?? titleOf.get(p.book_code) ?? p.book_code,
        detail: `Chapter ${parseRef(p.canonical_ref)?.chapter ?? p.chapter_number}`,
        href: refToHref(p.canonical_ref),
      })),
      bookmarkCount: localBookmarks().length,
      noteCount: localNotes().length,
    });
  }, []);

  useEffect(() => {
    if (loading) return;
    void render();
    if (user) void syncPersonal().then(render);
  }, [user, loading, render]);

  return (
    <PageContainer>
      <h1 className="font-display text-2xl font-medium">My Journey</h1>
      {!loading && !user && (
        <div className="mt-4">
          <SyncCta />
        </div>
      )}

      <SectionHeading>Continue reading</SectionHeading>
      {data && data.resume.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.resume.map((r) => (
            <Link
              key={r.key}
              href={r.href}
              className="rounded-2xl border border-rule bg-white p-4 transition-shadow hover:shadow-md"
            >
              <p lang="hi" className="hi text-sm font-semibold">{r.title}</p>
              <p className="mt-1 text-xs text-ink-soft">{r.detail}</p>
              <p className="mt-2 text-xs font-medium" style={{ color: "var(--ws-ink)" }}>
                Resume →
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nothing in progress yet"
          hint="Open any book and your place is saved automatically."
        />
      )}

      <SectionHeading>Saved</SectionHeading>
      <div className="grid grid-cols-2 gap-3">
        <Link href="/me/bookmarks" className="rounded-2xl border border-rule bg-white p-4 transition-shadow hover:shadow-md">
          <p className="text-2xl font-bold" style={{ color: "var(--ws-ink)" }}>
            {data?.bookmarkCount ?? "–"}
          </p>
          <p className="text-sm text-ink-soft">Bookmarks</p>
        </Link>
        <Link href="/me/notes" className="rounded-2xl border border-rule bg-white p-4 transition-shadow hover:shadow-md">
          <p className="text-2xl font-bold" style={{ color: "var(--ws-ink)" }}>
            {data?.noteCount ?? "–"}
          </p>
          <p className="text-sm text-ink-soft">Notes</p>
        </Link>
      </div>
    </PageContainer>
  );
}
