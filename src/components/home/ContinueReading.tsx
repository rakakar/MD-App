"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { CoverTile, ProgressBar } from "@/components/shelf/CoverTile";
import { getBook, getBooks } from "@/lib/api";
import { localProgress, syncPersonal } from "@/lib/personal";
import { parseRef, refToHref } from "@/lib/refs";

interface ResumeCard {
  key: string;
  title: string;
  href: string;
  cover: string | null;
  chapter: string;
  /** the chapter's own name, once its book's TOC has been read */
  chapterTitle: string | null;
  page: number | null;
  pageCount: number | null;
  percent: number | null;
}

/**
 * "Chapter 5 · <name>" — unless the name is itself a numbered chapter heading,
 * as MVD's TOC entries are ("अध्याय - पाँच निर्भ्रमता ही विश्राम"), where
 * prefixing it numbers the chapter twice. There the printed heading, which is
 * the manager's own words, stands on its own.
 */
function chapterLine(chapter: string, title: string | null): string {
  if (!title) return `Chapter ${chapter}`;
  return /^अध्याय/.test(title.trim()) ? title : `Chapter ${chapter} · ${title}`;
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
 * for a progress ring, and the reason the label says page N of M beside it
 * rather than leaving the ring to speak alone.
 */
export function ContinueReading({
  limit = 3,
  heading = "Continue reading",
  layout = "rail",
}: {
  limit?: number;
  heading?: string;
  /**
   * A rail on every screen (`rail`, the shelf — 1B desktop keeps the row of
   * 340px cards), or a rail on a phone that stacks from lg (`stack`, Home —
   * where the cards sit inside one column of the desktop grid and a sideways
   * scroller inside it would be a scrollbar nobody finds).
   */
  layout?: "rail" | "stack";
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

    const base: ResumeCard[] = rows.map((p) => {
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
        chapterTitle: null,
        page: usable,
        pageCount,
        percent:
          usable && pageCount ? Math.min(100, (usable / pageCount) * 100) : null,
      };
    });
    setCards(base);

    // The chapter's name is what tells a reader where they were — "Chapter 1"
    // alone names a position, not a subject. It lives in the book's TOC, which
    // the list endpoint does not carry, so it arrives a beat after the cards
    // do: the card is on screen and tappable first, and gains the name when it
    // comes. A failed detail call costs nothing but the name.
    const named = await Promise.all(
      base.map(async (c) => {
        const detail = await getBook(c.key).catch(() => null);
        const entry = detail?.chapters?.find(
          (ch) => String(ch.number) === c.chapter
        );
        return entry?.title_hi ? { ...c, chapterTitle: entry.title_hi } : c;
      })
    );
    setCards(named);
  }, [limit]);

  useEffect(() => {
    if (loading) return;
    void render();
    if (user) void syncPersonal().then(render);
  }, [user, loading, render]);

  if (cards.length === 0) return null;

  return (
    <section aria-label={heading}>
      <h2 className="mb-3 mt-7 text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
        {heading}
      </h2>
      {/* A snapping rail rather than a stack (design 1A/1B): the card a reader
          wants is nearly always the first one, and laying three of them out
          vertically pushed the book shelf below the fold on a phone. The rail
          bleeds to the screen edge so the second card peeks — which is what
          says "there are more" without a control saying it. */}
      <ul
        className={`-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scroll-pl-4 sm:mx-0 sm:px-0 sm:scroll-pl-0 ${
          layout === "stack" ? "lg:flex-col lg:overflow-visible" : ""
        }`}
      >
        {cards.map((c) => (
          <li
            key={c.key}
            className={`w-[17.5rem] shrink-0 snap-start sm:w-[340px] ${
              layout === "stack" ? "lg:w-full lg:shrink" : ""
            }`}
          >
            <Link
              href={c.href}
              className="flex h-full items-center gap-4 rounded-[20px] border border-rule bg-card p-4 transition-shadow hover:shadow-md"
            >
              <CoverTile
                book={{ code: c.key, title_hi: c.title, cover_image: c.cover }}
                size="resume"
              />
              <span className="min-w-0 flex-1">
                <span lang="hi" className="hi block truncate text-[1.0625rem] font-semibold">
                  {c.title}
                </span>
                <span
                  lang="hi"
                  className="hi mt-1 block truncate text-xs font-medium text-ink-soft"
                >
                  {chapterLine(c.chapter, c.chapterTitle)}
                </span>
                {c.percent !== null ? (
                  <>
                    {/* The bar runs the full width of the card and the two
                        figures sit under it — printed page on the left, where
                        a reader looks to check they are where they think they
                        are, and the percentage on the right. */}
                    <ProgressBar percent={c.percent} showValue={false} className="mt-3" />
                    <span className="mt-1.5 flex items-baseline justify-between gap-2">
                      <span className="truncate text-xs font-medium text-ink-soft">
                        {c.page !== null && c.pageCount !== null
                          ? `Page ${c.page} of ${c.pageCount}`
                          : ""}
                      </span>
                      <span
                        className="shrink-0 text-xs font-bold tabular-nums"
                        style={{ color: "var(--ws-ink)" }}
                      >
                        {Math.round(c.percent)}%
                      </span>
                    </span>
                  </>
                ) : (
                  <span
                    className="mt-2.5 block text-xs font-semibold"
                    style={{ color: "var(--ws-ink)" }}
                  >
                    Resume →
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
