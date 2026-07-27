"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getProgress } from "@/lib/me";
import { parseRef, refToHref } from "@/lib/refs";
import { getRecentlyRead, type LocalProgress } from "@/lib/storage";

interface ResumeCard {
  key: string;
  title: string;
  href: string;
  detail: string;
}

/** Resume cards: logged-in from me/progress, guest from localStorage. */
export function ContinueReading() {
  const { user, loading } = useAuth();
  const [cards, setCards] = useState<ResumeCard[]>([]);

  useEffect(() => {
    if (loading) return;
    if (user) {
      getProgress()
        .then((rows) =>
          setCards(
            rows.slice(0, 4).map((p) => ({
              key: p.book_code,
              title: p.book_code,
              href: refToHref(p.canonical_ref),
              detail: p.canonical_ref,
            }))
          )
        )
        .catch(() => setCards([]));
    } else {
      setCards(
        getRecentlyRead()
          .slice(0, 4)
          .map((p: LocalProgress) => ({
            key: p.book_code,
            title: p.book_title ?? p.book_code,
            href: refToHref(p.canonical_ref),
            detail: `Chapter ${parseRef(p.canonical_ref)?.chapter ?? p.chapter_number}`,
          }))
      );
    }
  }, [user, loading]);

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
            <p className="mt-2 text-xs font-medium" style={{ color: "var(--ws-color)" }}>
              Resume →
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
