import { bookHue, coverGradient } from "@/lib/bookHue";
import type { BookSummary } from "@/lib/types";

/**
 * A book's cover, at four densities (design 1A rail, 1B grid, 1C hero, plus
 * the small tile the resume cards use).
 *
 * Where a ग्रंथ has no cover image, the spec draws the fallback not as a grey
 * placeholder but as a *designed object*: a 150° gradient in the book's own
 * hue, the title's first अक्षर set large in the top-left, and a short white
 * rule at the foot standing in for a spine band.
 *
 * Where it does have one, the cover is shown and the fallback gets out of the
 * way. The spec draws the अक्षर and a full-height scrim over image covers too,
 * and this used to follow it — but the spec's covers are abstract textures,
 * and A. Nagraj ji's are photographs of printed covers that already carry the
 * title, the author and the publisher in type. Over those, the scrim muted the
 * artwork and the अक्षर landed on the printed title, so a real cover came out
 * looking worse than the fallback invented to stand in for it. Nothing is
 * drawn on top of a cover now — which is also why no caption sits inside the
 * tile any more, and why the Home rail captions underneath as the shelf grid
 * already did.
 *
 * Covers fill their tile, and every tile a cover lands in is now portrait
 * (4:5) so that filling costs a sliver of margin rather than a third of the
 * book: on a square tile the same crop threw away the publisher's block and
 * half the printed title, which is why these were contained-with-a-blurred-
 * backdrop before.
 */
type Size = "resume" | "rail" | "grid" | "lg";

const BOX: Record<Size, string> = {
  // the resume card's cover — a book someone is actually inside, drawn large
  // enough to be recognised by its artwork rather than by its caption
  resume: "h-[86px] w-[62px] rounded-xl p-2",
  rail: "aspect-[4/5] w-full rounded-[14px] p-3",
  // 4:5, not the square it was: now that a cover fills its tile rather than
  // sitting inside it, a square would crop a third of a portrait book away.
  grid: "aspect-[4/5] w-full rounded-xl p-3",
  lg: "h-[130px] w-24 rounded-[14px] p-3.5",
};

const LETTER: Record<Size, string> = {
  resume: "text-[24px]",
  rail: "text-[26px]",
  grid: "text-2xl",
  lg: "text-3xl",
};

export function CoverTile({
  book,
  size = "rail",
  caption = "dash",
}: {
  book: Pick<BookSummary, "title_hi" | "cover_image"> & { code?: string };
  size?: Size;
  /** what sits at the foot of the tile: the spine rule, or nothing */
  caption?: "dash" | "none";
}) {
  const hue = bookHue(book.code ?? book.title_hi);
  const hasCover = Boolean(book.cover_image);
  const showDash = caption === "dash" && size !== "resume" && !hasCover;

  return (
    <div
      className={`${BOX[size]} relative flex shrink-0 flex-col justify-between overflow-hidden border border-white/15 shadow-[0_10px_22px_-12px_rgba(20,15,10,.55)]`}
      style={{ background: coverGradient(hue) }}
    >
      {book.cover_image && (
        /* covers come from the BE media host; a plain img avoids configuring
           remote patterns for a host that is still moving.

           The cover fills the tile. A portrait cover in a tile this shape
           leaves bars, and the bars used to be filled with a blown-out,
           blurred copy of the cover itself — which read as a halo around a
           smaller book and spent the tile's height on surround rather than on
           artwork. Filling crops a sliver off the top and foot instead, which
           on these covers is margin: the printed title sits well inside it. */
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={book.cover_image}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {!hasCover && (
        <span
          aria-hidden
          lang="hi"
          className={`hi relative leading-none text-white/90 ${LETTER[size]}`}
        >
          {book.title_hi?.[0] ?? "ग्र"}
        </span>
      )}

      {showDash && (
        <span
          aria-hidden
          className="relative mt-auto h-0.5 w-5 rounded-full bg-white/55"
        />
      )}
    </div>
  );
}

/**
 * Percent-read, as the spec's linear bar (design 1A/1B resume cards).
 *
 * A bar rather than a ring: it is what both print screens draw, and at the
 * width a resume card gives it, a bar reads a 6% and a 62% apart at a glance
 * where a 44px ring does not. The figure is always spelled out — beside the
 * bar by default, or, with `showValue={false}`, by whatever draws it instead:
 * the resume card runs the bar full width and sets the figure on the line
 * below it, opposite the page count. The fill alone carries the meaning only
 * for people who can see it, so the figure never simply disappears.
 */
export function ProgressBar({
  percent,
  className = "",
  showValue = true,
}: {
  percent: number;
  className?: string;
  showValue?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <span
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${pct}% read`}
        className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-canvas"
      >
        <span
          className="block h-full rounded-full"
          style={{
            width: `${pct}%`,
            background:
              "linear-gradient(90deg, var(--color-accent), var(--ws-color))",
          }}
        />
      </span>
      {showValue && (
        <span
          className="shrink-0 text-[11px] font-bold tabular-nums"
          style={{ color: "var(--ws-ink)" }}
        >
          {pct}%
        </span>
      )}
    </span>
  );
}
