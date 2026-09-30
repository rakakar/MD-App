import Link from "next/link";
import { ChevronRight } from "@/components/shell/icons";
import { contentLang } from "@/lib/script";
import type { ChapterTocEntry } from "@/lib/types";

/**
 * The chapter list on desktop (Book preview, desktop revision 29 Sep 2026):
 * one card, a row per chapter with its printed page range and a bar for how
 * long it is against the longest chapter in the book. The phone keeps its
 * ruled rows.
 *
 * The bar is length, not progress — it answers "is this a sitting or an
 * evening?" at a glance down the list. It is decoration beside the page count
 * that says the same thing in words, so it is hidden from screen readers.
 */
export function ChapterTable({
  bookCode,
  chapters,
  count,
}: {
  bookCode: string;
  /** front matter first, then the chapters, in reading order */
  chapters: ChapterTocEntry[];
  /** main chapters only — what the heading counts */
  count: number;
}) {
  const pagesOf = (c: ChapterTocEntry) =>
    c.page_count ??
    (c.start_page != null && c.end_page != null ? c.end_page - c.start_page + 1 : 0);
  const longest = Math.max(1, ...chapters.map(pagesOf));

  return (
    <section className="hidden lg:block" aria-labelledby="book-chapters">
      <h2 id="book-chapters" className="mb-4 flex items-center gap-2.5 text-xl font-semibold">
        Chapters
        <span className="rounded-md bg-inset px-2 py-0.5 text-xs font-semibold tabular-nums text-ink-soft">
          {count}
        </span>
      </h2>

      <ul className="overflow-hidden rounded-hero border border-rule bg-card shadow-card [&>li+li]:border-t [&>li+li]:border-rule">
        {chapters.map((c) => {
          const pages = pagesOf(c);
          const range = c.is_front_matter
            ? pages > 0
              ? `i–${roman(pages)}`
              : ""
            : c.start_page != null && c.end_page != null
              ? `${c.start_page}–${c.end_page}`
              : "";
          const t = contentLang(c.title_hi);
          return (
            <li key={`${c.is_front_matter}-${c.number}`}>
              <Link
                href={`/books/${encodeURIComponent(bookCode)}/${c.number}`}
                className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-inset/60"
              >
                <span
                  aria-hidden
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-tile text-sm font-semibold tabular-nums ${
                    c.is_front_matter ? "bg-inset text-ink-soft" : ""
                  }`}
                  style={
                    c.is_front_matter
                      ? undefined
                      : {
                          color: "var(--ws-ink)",
                          background: "color-mix(in srgb, var(--ws-color) 10%, var(--color-card))",
                        }
                  }
                >
                  {c.number}
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    {...t}
                    className={`${t.className} hi-tight block truncate text-title font-semibold group-hover:underline`}
                  >
                    {c.title_hi}
                  </span>
                  {pages > 0 && (
                    <span aria-hidden className="mt-2.5 block h-1 overflow-hidden rounded-full bg-inset">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${(pages / longest) * 100}%`,
                          background: "color-mix(in srgb, var(--ws-color) 45%, var(--color-card))",
                        }}
                      />
                    </span>
                  )}
                </span>

                <span className="w-24 shrink-0 text-end">
                  {range && (
                    <span lang="hi" className="block text-xs text-ink-soft">
                      पृष्ठ {range}
                    </span>
                  )}
                  {pages > 0 && (
                    <span className="mt-1 block text-xs text-ink-soft">
                      {pages} {pages === 1 ? "page" : "pages"}
                    </span>
                  )}
                </span>
                <span aria-hidden className="shrink-0 text-muted">
                  <ChevronRight />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Front matter is numbered i, ii, iii… — `12` → "xii". */
function roman(n: number): string {
  const table: [number, string][] = [
    [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"],
  ];
  let out = "";
  for (const [v, s] of table) {
    while (n >= v) {
      out += s;
      n -= v;
    }
  }
  return out;
}
