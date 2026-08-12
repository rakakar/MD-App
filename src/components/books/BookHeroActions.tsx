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
 * **No headphones here, and that is the comps rather than a gap.** An earlier
 * spec drew one, and it was left out because the BE has no link from a book to
 * its discourse audio. The finished comps ("Book preview", 2026-08-11) settle
 * it the other way: this hero holds Resume and download and nothing else, and
 * listening is a *chapter* action — the headphones is on the reader's bottom
 * bar, where it opens that chapter's own audio with the text following along
 * ("Read mode", "Audio mode").
 *
 * So the missing link is not blocking anything. Contract §9 records the
 * decision, including the shape it would need if a screen ever asks for it.
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
