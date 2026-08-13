import Link from "next/link";
import { CoverTile } from "@/components/shelf/CoverTile";
import type { BookSummary } from "@/lib/types";

/**
 * The horizontal book rail on Home (design 1A) — covers that snap one per
 * swipe. A rail rather than the grid used on the shelf: Home is a place to
 * re-enter the practice, so the books are a glance across what exists, and
 * the full shelf is one tap away at "All N →".
 *
 * The title sits under the cover, as it does on the shelf grid. The spec draws
 * it inside the tile, which worked while every tile was a coloured gradient
 * the app drew itself. Real covers arrived carrying their own printed title,
 * and a second title laid over it was both unreadable and redundant — so the
 * caption moved out, and the rail now captions the way 1B's grid already did.
 */
export function BookRail({ books }: { books: BookSummary[] }) {
  return (
    // The rail bleeds to the screen edge so covers scroll out of frame rather
    // than stopping short. scroll-pl matches the padding: without it the first
    // snap point sits at the content edge, and the rail silently scrolls its
    // own gutter away on load.
    // From lg the rail becomes a two-up grid: on desktop it lives in a column
    // of the Home grid (1A desktop), where covers scrolling sideways out of a
    // 340px column would hide most of the shelf behind a gesture.
    //
    // And there it stops at four. A rail can hold the whole shelf because a
    // swipe costs nothing; a grid cannot, and fourteen covers stacked 2-up
    // would run three screens down a column whose neighbours end in one. Four
    // is what the spec's desktop card shows, with the rest behind "All N →".
    // pb-2 is headroom for the covers' drop shadow, which overflow-x-auto
    // clips; -mb-2 keeps it out of the layout so the gap to the next heading
    // is the heading's margin and nothing else. See ContinueReading.
    <ul className="-mx-4 -mb-2 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 scroll-pl-4 sm:mx-0 sm:px-0 sm:scroll-pl-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:[&>li:nth-child(n+5)]:hidden">
      {books.map((b) => (
        <li key={b.code} className="w-[7.75rem] shrink-0 snap-start lg:w-full">
          <Link href={`/books/${encodeURIComponent(b.code)}`} className="group block">
            <CoverTile book={b} size="rail" />
            <span
              lang="hi"
              className="hi hi-tight mt-2.5 block line-clamp-2 text-xs font-semibold group-hover:underline"
            >
              {b.title_hi}
            </span>
            {/* The author line came off this rail with the finished comps, and
                it should have gone sooner. On Originals it is A. Nagraj on
                every card — three identical lines under three different covers,
                on the most crowded surface in the app. The shelf still carries
                it, and the shelf is where a reader is comparing books rather
                than glancing across them. */}
            {b.page_count ? (
              <span className="mt-0.5 block text-xs text-ink-soft">{b.page_count} pages</span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
