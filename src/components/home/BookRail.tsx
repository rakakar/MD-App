import Link from "next/link";
import { CoverTile } from "@/components/shelf/CoverTile";
import type { BookSummary } from "@/lib/types";

/**
 * The horizontal ग्रंथ rail on Home (design 1A) — covers that snap one per
 * swipe. A rail rather than the grid used on the shelf: Home is a place to
 * re-enter the practice, so the books are a glance across what exists, and
 * the full shelf is one tap away at "All N →".
 *
 * The title sits *inside* the cover here and below it on the shelf. On the
 * rail the covers are the row, so a caption under each one would double the
 * rail's height for a title the cover is already carrying.
 */
export function BookRail({ books }: { books: BookSummary[] }) {
  return (
    // The rail bleeds to the screen edge so covers scroll out of frame rather
    // than stopping short. scroll-pl matches the padding: without it the first
    // snap point sits at the content edge, and the rail silently scrolls its
    // own gutter away on load.
    <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 scroll-pl-4 sm:mx-0 sm:px-0 sm:scroll-pl-0">
      {books.map((b) => (
        <li key={b.code} className="w-[6.5rem] shrink-0 snap-start">
          <Link href={`/books/${encodeURIComponent(b.code)}`} className="group block">
            <CoverTile book={b} size="rail" caption="title" />
            {b.page_count ? (
              <span className="mt-2 block text-[11px] font-medium text-ink-soft">
                {b.page_count} pages
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
