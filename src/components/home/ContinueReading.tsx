"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getBooks } from "@/lib/api";
import { localProgress, syncPersonal } from "@/lib/personal";
import { parseRef, refToHref } from "@/lib/refs";

interface ResumeCard {
  key: string;
  title: string;
  href: string;
  detail: string;
}

/**
 * Resume cards, from the local store in both states — so they are on screen in
 * the first paint rather than after a round-trip, and they survive being
 * offline. A signed-in reader additionally gets a sync that folds in whatever
 * they were reading on another device.
 */
export function ContinueReading() {
  const { user, loading } = useAuth();
  const [cards, setCards] = useState<ResumeCard[]>([]);

  const render = useCallback(async () => {
    const rows = localProgress().slice(0, 4);
    let titleOf = new Map<string, string>();
    if (rows.some((p) => !p.book_title)) {
      titleOf = new Map((await getBooks().catch(() => [])).map((b) => [b.code, b.title_hi]));
    }
    setCards(
      rows.map((p) => ({
        key: p.book_code,
        title: p.book_title ?? titleOf.get(p.book_code) ?? p.book_code,
        href: refToHref(p.canonical_ref),
        detail: `Chapter ${parseRef(p.canonical_ref)?.chapter ?? p.chapter_number}`,
      }))
    );
  }, []);

  useEffect(() => {
    if (loading) return;
    void render();
    if (user) void syncPersonal().then(render);
  }, [user, loading, render]);

  if (cards.length === 0) return null;

  return (
    <section aria-label="Continue reading">
      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-ink-soft">
        Continue reading
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {cards.map((c) => (
          <Link
            key={c.key}
            href={c.href}
            className="min-w-44 rounded-xl border border-rule bg-white p-3 transition-shadow hover:shadow-md"
          >
            <p lang="hi" className="hi truncate text-sm font-semibold">{c.title}</p>
            <p className="mt-1 text-xs text-ink-soft">{c.detail}</p>
            <p className="mt-2 text-xs font-medium" style={{ color: "var(--ws-ink)" }}>
              Resume →
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
