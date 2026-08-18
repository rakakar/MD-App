"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { CoverTile, ProgressBar } from "@/components/shelf/CoverTile";
import { getBook, getBooks } from "@/lib/api";
import { chapterLine } from "@/lib/chapter";
import { localProgress, syncPersonal } from "@/lib/personal";
import { parseRef, refToHref } from "@/lib/refs";
import { contentLang } from "@/lib/script";
import { readingHomeFor, rememberReadingHome } from "@/lib/storage";
import type { BookSummary } from "@/lib/types";

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
  heading = "Continue Reading",
  tier = "title",
  layout = "rail",
  workspace = "originals",
}: {
  limit?: number;
  heading?: string;
  /**
   * Which heading tier the rail wears. `title` on Home and Read, where
   * resuming is the reason the page exists; `eyebrow` on the Library, where
   * the rail sits above the shelf the page is actually about and a second
   * 20px heading there would compete with the page's own title.
   */
  tier?: "title" | "eyebrow";
  /**
   * A rail on every screen (`rail`, the shelf — 1B desktop keeps the row of
   * 340px cards), or a rail on a phone that stacks from lg (`stack`, Home —
   * where the cards sit inside one column of the desktop grid and a sideways
   * scroller inside it would be a scrollbar nobody finds).
   */
  layout?: "rail" | "stack";
  /**
   * Which shelf's books this rail resumes into — see `ContinueDocument`, the
   * same idea for library documents. Originals by default, since that is
   * where this rail first lived; Translations passes its own code so a
   * reader resuming a Hindi original on the Originals Home does not also see
   * an English one it has never offered, and the other way round.
   */
  workspace?: "originals" | "translations";
}) {
  const { user, loading } = useAuth();
  const [cards, setCards] = useState<ResumeCard[]>([]);

  const render = useCallback(async () => {
    // Shelf books only. A **text edition** is a book underneath — same
    // chapters, same paragraphs, one row in this same store — but it is a
    // library document to the reader, and it resumes on the Library tab where
    // it lives. Letting it surface here put a card on Home and on Read that
    // led to a folder, on a shelf that has never listed it, and undid on this
    // rail the separation `offShelfHref` makes everywhere else.
    //
    // A reading home is what marks one, and it is known locally in both the
    // cases that matter: the reader opened it here, or `pull()` recorded it
    // from the row's `source_item`. The detail pass below is the backstop for
    // the third case, and it teaches this device the answer for next time.
    const notLibraryDocs = localProgress().filter(
      (p) => readingHomeFor(p.book_code) === null
    );
    if (notLibraryDocs.length === 0) {
      setCards([]);
      return;
    }
    // Scoped to one shelf. The local store keeps one resume position per book
    // across every workspace it has ever been asked to remember — an
    // original, a translation, a book filed under Resources, anything — and
    // this rail is drawn on more than one workspace's own pages. A
    // translation's progress row surfacing on the Originals Home sent a
    // reader who has never opened a Hindi original a resume card in a
    // language that page has never offered — and the same wrong turn the
    // other way round, on Translations' Home, before this took a `workspace`
    // of its own.
    //
    // This same call also covers titles, covers and page counts for every
    // surviving row.
    const shelf = await getBooks({ workspace }).catch(() => []);
    const byCode = new Map(shelf.map((b) => [b.code, b]));
    const rows = notLibraryDocs.filter((p) => byCode.has(p.book_code)).slice(0, limit);
    if (rows.length === 0) {
      setCards([]);
      return;
    }

    const card = (p: (typeof rows)[number], book?: BookSummary): ResumeCard => {
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
    };

    setCards(rows.map((p) => card(p, byCode.get(p.book_code))));

    // The chapter's name is what tells a reader where they were — "Chapter 1"
    // alone names a position, not a subject. It lives in the book's TOC, which
    // the list endpoint does not carry, so it arrives a beat after the cards
    // do: the card is on screen and tappable first, and gains the name when it
    // comes. A failed detail call costs nothing but the name.
    //
    // The same call settles two other things the list cannot. It says whether
    // this is a text edition at all — authoritatively, where the local reading
    // home was only a memory — and it carries a `page_count` and a cover for
    // any book the list did not describe, which is how a row that could only
    // offer "Resume →" grows the bar every other card has.
    const named = await Promise.all(
      rows.map(async (p) => {
        const detail = await getBook(p.book_code).catch(() => null);
        if (detail?.role === "compilation") {
          // Remembered, so the filter above catches it on the next paint
          // rather than drawing it and taking it away again.
          if (detail.reading_home) rememberReadingHome(p.book_code, detail.reading_home);
          return null;
        }
        const c = card(p, byCode.get(p.book_code) ?? detail ?? undefined);
        const entry = detail?.chapters?.find((ch) => String(ch.number) === c.chapter);
        return entry?.title_hi ? { ...c, chapterTitle: entry.title_hi } : c;
      })
    );
    setCards(named.filter((c): c is ResumeCard => c !== null));
  }, [limit, workspace]);

  useEffect(() => {
    if (loading) return;
    void render();
    if (user) void syncPersonal().then(render);
  }, [user, loading, render]);

  if (cards.length === 0) return null;

  return (
    // The section gap belongs on the section, not on its heading. On the
    // heading it was dead code: the h2 is always the first child of this
    // <section>, so `first:mt-0` always won, and the rail leaned on whatever
    // was above it. That is fine on Home, where the stack's own `gap-5` does
    // the spacing — and `first:` is still what keeps it from doubling there —
    // but on the Read shelf nothing else was providing it, so the heading sat
    // against the "13 books · … " line as if it were part of it.
    <section aria-label={heading} className="mt-5 first:mt-0">
      <h2
        className={`mb-3 ${
          tier === "title"
            ? "text-title font-semibold tracking-[-0.015em] text-ink"
            : "text-xs font-bold uppercase tracking-[0.09em] text-ink-soft"
        }`}
      >
        {heading}
      </h2>
      {/* A snapping rail rather than a stack (design 1A/1B): the card a reader
          wants is nearly always the first one, and laying three of them out
          vertically pushed the book shelf below the fold on a phone. The rail
          bleeds to the screen edge so the second card peeks — which is what
          says "there are more" without a control saying it. */}
      {/* pb/-mb in a pair: the padding is headroom for the card's hover
          shadow, which `overflow-x-auto` would otherwise clip, and the
          negative margin takes it back out of the layout so it cannot show up
          as a wider gap before whatever follows. Every rail on Home does this,
          so one heading margin is the only thing setting the rhythm. */}
      <ul
        className={`-mx-4 -mb-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scroll-pl-4 sm:mx-0 sm:px-0 sm:scroll-pl-0 ${
          layout === "stack" ? "lg:flex-col lg:overflow-visible" : ""
        }`}
      >
        {cards.map((c) => {
          const chapterText = chapterLine(c.chapter, c.chapterTitle);
          const titleLang = contentLang(c.title);
          const chapterLang = contentLang(chapterText);
          return (
          <li
            key={c.key}
            className={`w-[17.5rem] shrink-0 snap-start sm:w-[340px] ${
              layout === "stack" ? "lg:w-full lg:shrink" : ""
            }`}
          >
            <Link
              href={c.href}
              // px-4 py-3, not p-4. The cover is the tallest thing in the row
              // and the text column beside it is shorter, so 16px top and
              // bottom was 16px plus the slack the centred text already left —
              // it read as a card with a hole in it.
              className="flex h-full items-center gap-4 rounded-card border border-rule bg-card px-4 py-3 transition-shadow hover:shadow-md"
            >
              <CoverTile
                book={{ code: c.key, title_hi: c.title, cover_image: c.cover }}
                size="resume"
              />
              {/* Both lines are `hi-tight`, and between them that is what
                  squares this column with the cover beside it. At the `.hi`
                  body leading of 1.85 a Devanagari title and chapter line were
                  31 and 24 tall — 15px of half-leading nobody asked for, on two
                  single lines that are truncated anyway — and the column came
                  out 101.5 against an 86px cover, so it overhung the artwork by
                  7.5 at the head and the foot. Tight, it is 86.5: the title
                  starts at the top of the cover and the page figures end at its
                  foot. Change either leading and that alignment goes.

                  `hi-tight` stays on regardless of script — it is the leading
                  fix, not the font. `lang`/`.hi` are decided per line instead:
                  a translation's title is English, and setting "Jeevan Vidya —
                  An Introduction" in the Devanagari face announced it to a
                  screen reader as Hindi and rendered it in the wrong type. */}
              <span className="min-w-0 flex-1">
                <span
                  {...titleLang}
                  className={`${titleLang.className} hi-tight block truncate text-title font-semibold`}
                >
                  {c.title}
                </span>
                <span
                  {...chapterLang}
                  className={`${chapterLang.className} hi-tight mt-1 block truncate text-xs font-medium text-ink-soft`}
                >
                  {chapterText}
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
          );
        })}
      </ul>
    </section>
  );
}
