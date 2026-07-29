"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { CoverTile, ProgressRing } from "@/components/shelf/CoverTile";
import { getBooks } from "@/lib/api";
import { localProgress, syncPersonal } from "@/lib/personal";
import { parseRef, refToHref } from "@/lib/refs";

interface ResumeCard {
  key: string;
  title: string;
  href: string;
  cover: string | null;
  chapter: string;
  page: number | null;
  pageCount: number | null;
  percent: number | null;
}

/**
 * Resume cards (design 1A / 1B "CONTINUE READING").
 *
 * From the local store in both states — so they are on screen in the first
 * paint rather than after a round-trip, and they survive being offline. A
 * signed-in reader additionally gets a sync that folds in whatever they were
 * reading on another device.
 *
 * The percentage is derived from the printed page in the canonical ref against
 * the book's page count, which is the only progress signal that exists: the BE
 * stores a resume position, not a completion figure. It is therefore "how far
 * into the book this page sits", not "how much has been read" — near enough
 * for a progress ring, and the reason the label says पृष्ठ N of M beside it
 * rather than leaving the ring to speak alone.
 */
export function ContinueReading({
  limit = 3,
  heading = "Continue reading",
}: {
  limit?: number;
  heading?: string;
}) {
  const { user, loading } = useAuth();
  const [cards, setCards] = useState<ResumeCard[]>([]);

  const render = useCallback(async () => {
    const rows = localProgress().slice(0, limit);
    if (rows.length === 0) {
      setCards([]);
      return;
    }
    // One books call covers titles, covers and page counts for every row.
    const books = await getBooks().catch(() => []);
    const byCode = new Map(books.map((b) => [b.code, b]));

    setCards(
      rows.map((p) => {
        const book = byCode.get(p.book_code);
        const ref = parseRef(p.canonical_ref);
        const page = ref ? Number(ref.page) : NaN;
        const pageCount = book?.page_count ?? null;
        const usable = Number.isFinite(page) && pageCount ? page : null;
        return {
          key: p.book_code,
          title: p.book_title ?? book?.title_hi ?? p.book_code,
          href: refToHref(p.canonical_ref),
          cover: book?.cover_image ?? null,
          chapter: ref?.chapter ?? String(p.chapter_number),
          page: usable,
          pageCount,
          percent:
            usable && pageCount ? Math.min(100, (usable / pageCount) * 100) : null,
        };
      })
    );
  }, [limit]);

  useEffect(() => {
    if (loading) return;
    void render();
    if (user) void syncPersonal().then(render);
  }, [user, loading, render]);

  if (cards.length === 0) return null;

  return (
    <section aria-label={heading}>
      <h2 className="mb-3 mt-8 text-[11px] font-bold uppercase tracking-[0.09em] text-ink-soft">
        {heading}
      </h2>
      <ul className="flex flex-col gap-2">
        {cards.map((c) => (
          <li key={c.key}>
            <Link
              href={c.href}
              className="flex items-center gap-4 rounded-2xl border border-rule bg-white p-3 transition-shadow hover:shadow-md"
            >
              <CoverTile book={{ title_hi: c.title, cover_image: c.cover }} size="sm" />
              <span className="min-w-0 flex-1">
                <span lang="hi" className="hi block truncate text-[15px] font-semibold">
                  {c.title}
                </span>
                <span className="mt-0.5 block text-xs text-ink-soft">
                  <span lang="hi" className="hi">
                    अध्याय {c.chapter}
                  </span>
                  {c.page !== null && c.pageCount !== null && (
                    <>
                      {" · "}
                      <span lang="hi" className="hi">
                        पृष्ठ {c.page}
                      </span>{" "}
                      of {c.pageCount}
                    </>
                  )}
                </span>
              </span>
              {c.percent !== null ? (
                <ProgressRing percent={c.percent} />
              ) : (
                <span
                  className="shrink-0 text-xs font-semibold"
                  style={{ color: "var(--ws-ink)" }}
                >
                  Resume →
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
