"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { EmptyState, PageContainer, SectionHeading } from "@/components/ui";
import { getBookmarks, getNotes, getProgress } from "@/lib/me";
import { refToHref } from "@/lib/refs";
import { getGuestStore, getRecentlyRead } from "@/lib/storage";
import type { Bookmark, Note, Progress } from "@/lib/types";

interface Overview {
  resume: { key: string; title: string; detail: string; href: string }[];
  bookmarkCount: number;
  noteCount: number;
}

function SyncCta() {
  return (
    <div className="rounded-2xl border border-rule bg-white p-4">
      <p className="text-sm font-medium">इसी device पर saved</p>
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

  useEffect(() => {
    if (loading) return;
    if (user) {
      Promise.all([
        getProgress().catch(() => [] as Progress[]),
        getBookmarks().catch(() => [] as Bookmark[]),
        getNotes().catch(() => [] as Note[]),
      ]).then(([progress, bookmarks, notes]) =>
        setData({
          resume: progress.map((p) => ({
            key: p.book_code,
            title: p.book_code,
            detail: p.canonical_ref,
            href: refToHref(p.canonical_ref),
          })),
          bookmarkCount: bookmarks.length,
          noteCount: notes.length,
        })
      );
    } else {
      const store = getGuestStore();
      setData({
        resume: getRecentlyRead().map((p) => ({
          key: p.book_code,
          title: p.book_title ?? p.book_code,
          detail: p.canonical_ref,
          href: refToHref(p.canonical_ref),
        })),
        bookmarkCount: store.bookmarks.length,
        noteCount: store.notes.length,
      });
    }
  }, [user, loading]);

  return (
    <PageContainer>
      <h1 className="text-xl font-bold">My Journey · मेरी यात्रा</h1>
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
              <p className="mt-2 text-xs font-medium" style={{ color: "var(--ws-color)" }}>
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
          <p className="text-2xl font-bold" style={{ color: "var(--ws-color)" }}>
            {data?.bookmarkCount ?? "–"}
          </p>
          <p className="text-sm text-ink-soft">Bookmarks</p>
        </Link>
        <Link href="/me/notes" className="rounded-2xl border border-rule bg-white p-4 transition-shadow hover:shadow-md">
          <p className="text-2xl font-bold" style={{ color: "var(--ws-color)" }}>
            {data?.noteCount ?? "–"}
          </p>
          <p className="text-sm text-ink-soft">Notes</p>
        </Link>
      </div>
    </PageContainer>
  );
}
