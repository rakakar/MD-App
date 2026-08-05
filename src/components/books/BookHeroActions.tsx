"use client";

import { DownloadButton } from "@/components/reader/DownloadButton";
import { ResumeButton, useResume } from "@/components/reader/ResumeButton";
import type { BookDetail } from "@/lib/types";

/**
 * The bottom of the book hero (design 1C): the progress bar with its percent,
 * then the action row — Resume, and download for offline.
 *
 * One client component rather than three, because all of it depends on the
 * same saved position, and reading it once keeps the bar and the button from
 * disagreeing for a frame.
 *
 * The spec also draws a headphones button here. The BE carries no link from a
 * book to its discourse audio — audio series and books are separate lists with
 * nothing joining them — so there is no way to know whether this book has any.
 * The spec's own States note says a book without audio omits the button rather
 * than disabling it, which is what happens here until that link exists.
 */
export function BookHeroActions({
  book,
  firstChapterHref,
}: {
  book: BookDetail;
  firstChapterHref: string | null;
}) {
  const resume = useResume(book.code, book.page_count);

  return (
    <>
      {resume?.percent !== null && resume?.percent !== undefined && (
        <div className="mt-3 flex items-center gap-2">
          <div
            role="progressbar"
            aria-valuenow={Math.round(resume.percent)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-[5px] flex-1 overflow-hidden rounded-full bg-white/20"
          >
            <div
              className="h-full rounded-full bg-card"
              style={{ width: `${Math.round(resume.percent)}%` }}
            />
          </div>
          <span className="shrink-0 text-xs font-bold tabular-nums text-white/90">
            {Math.round(resume.percent)}% complete
          </span>
        </div>
      )}

      {/* Capped on wide screens: a Resume button stretched across a desktop
          window reads as a banner, not as a button. */}
      <div className="mt-4 flex items-center gap-2.5 sm:max-w-sm">
        <ResumeButton
          bookCode={book.code}
          firstChapterHref={firstChapterHref}
          resume={resume}
        />
        <DownloadButton book={book} variant="hero" />
      </div>
    </>
  );
}
