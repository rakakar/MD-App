import { Skeleton } from "@/components/ui";

/** A paragraph's worth of line widths, with gaps between paragraphs. */
const LINES = [
  "w-full", "w-11/12", "w-full", "w-3/4", "",
  "w-full", "w-11/12", "w-full", "w-full", "w-3/5", "",
  "w-full", "w-11/12", "w-5/6",
];

/**
 * The reader on its way, in the reader's own frame: no app chrome (the shell
 * drops it on reader paths), the paper colour, a bar where the top bar stands
 * and lines in the text column.
 *
 * Only an arrival shows it — opening a chapter from a book page, a resume card
 * or a link. Moving between chapters inside the reader is `pushState`, not a
 * route change (see `goToChapter`), so this never flashes between chapters.
 */
export default function Loading() {
  return (
    <div className="reader-surface min-h-dvh" aria-busy="true">
      <span className="sr-only" role="status">
        Opening chapter…
      </span>
      <div className="pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3 px-4 py-2">
          <Skeleton className="h-11 w-11 shrink-0 rounded-control" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-1/2 max-w-60 rounded-md" />
            <Skeleton className="mt-1.5 h-3 w-1/3 max-w-40 rounded-md" />
          </div>
        </div>
      </div>
      <div className="reader-content pt-6">
        <Skeleton className="mx-auto h-6 w-1/2 rounded-md" />
        <div className="mt-8 flex flex-col gap-3">
          {LINES.map((w, i) =>
            w ? <Skeleton key={i} className={`h-4 rounded-md ${w}`} /> : <div key={i} className="h-3" />,
          )}
        </div>
      </div>
    </div>
  );
}
