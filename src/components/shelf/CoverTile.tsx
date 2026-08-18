import { bookHue, coverGradient, type BookHue } from "@/lib/bookHue";
import type { BookSummary } from "@/lib/types";

/**
 * A book's cover, at four densities (design 1A rail, 1B grid, 1C hero, plus
 * the small tile the resume cards use).
 *
 * Where a book has no cover image, the spec draws the fallback not as a grey
 * placeholder but as a *designed object*: a 150° gradient in the book's own
 * hue, the title's first letter set large in the top-left, and a short white
 * rule at the foot standing in for a spine band.
 *
 * Where it does have one, the cover is shown and the fallback gets out of the
 * way. The spec draws the letter and a full-height scrim over image covers too,
 * and this used to follow it — but the spec's covers are abstract textures,
 * and A. Nagraj ji's are photographs of printed covers that already carry the
 * title, the author and the publisher in type. Over those, the scrim muted the
 * artwork and the letter landed on the printed title, so a real cover came out
 * looking worse than the fallback invented to stand in for it. Nothing is
 * drawn on top of a cover now — which is also why no caption sits inside the
 * tile any more, and why the Home rail captions underneath as the shelf grid
 * already did.
 *
 * Covers fill their tile, and the tile is the shape of the cover: every book
 * the BE serves is a 612×834 scan, so `--cover-ratio` is that exact figure
 * (102/139) and filling crops nothing at all. It was 4:5 — chosen to make the
 * crop a sliver of margin rather than the third of the book a square tile threw
 * away — and a sliver is still the printed border, which is part of the object
 * these are photographs of.
 *
 * `object-cover` stays rather than `contain`, so a future cover that is not
 * 612×834 loses a sliver instead of sitting in bars. If the BE ever starts
 * serving mixed shapes, that is the line to revisit, not this ratio.
 */
type Size = "resume" | "rail" | "grid" | "lg";

/** 612×834, the shape of every cover the BE has. Written as a fraction rather
 *  than a decimal so the source of it is legible at the call site. */
const COVER = "aspect-[102/139]";

/** Four sizes, one shape and one corner. What differs between a cover on the
 *  shelf and the same cover in a resume card is how big it is — nothing else,
 *  or a book changes shape on the way between two screens. */
const BOX: Record<Size, string> = {
  // the resume card's cover — a book someone is actually inside, drawn large
  // enough to be recognised by its artwork rather than by its caption. Fixed
  // px because it sits beside text rather than in a grid, so the ratio is
  // spelled out in the numbers: 63/86 is 102/139 to within a pixel.
  resume: "h-[86px] w-[63px] rounded-cover p-2",
  rail: `${COVER} w-full rounded-cover p-3`,
  grid: `${COVER} w-full rounded-cover p-3`,
  lg: "h-[130px] w-[95px] rounded-cover p-3.5",
};

const LETTER: Record<Size, string> = {
  resume: "text-2xl",
  rail: "text-[1.625rem]",
  grid: "text-2xl",
  lg: "text-3xl",
};

export function CoverTile({
  book,
  size = "rail",
  caption = "dash",
  hue: given,
}: {
  book: Pick<BookSummary, "title_hi" | "cover_image"> & { code?: string };
  size?: Size;
  /** what sits at the foot of the tile: the spine rule, or nothing */
  caption?: "dash" | "none";
  /**
   * A colour chosen by the caller, where the tile stands for something whose
   * identity is not its own id — a library folder that should read as its
   * shelf. Omitted everywhere else, and then it is the book's own hue.
   */
  hue?: BookHue;
}) {
  const hue = given ?? bookHue(book.code ?? book.title_hi);
  const hasCover = Boolean(book.cover_image);
  const showDash = caption === "dash" && size !== "resume" && !hasCover;

  return (
    <div
      // `border-rule`, the same hairline the resume card beside it wears, and
      // not the `white/15` it had. That was an inner highlight — a lit edge
      // *inside* the artwork, which is a different object from the line that
      // separates a card from the page — and on a pale cover it disappeared
      // while on a dark one it glowed. One border on Home, and it follows the
      // theme like every other one.
      className={`${BOX[size]} relative flex shrink-0 flex-col justify-between overflow-hidden border border-rule shadow-[0_10px_22px_-12px_rgba(20,15,10,.55)]`}
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
          className="relative mt-auto h-0.5 w-5 rounded-full bg-card/55"
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
          className="shrink-0 text-xs font-bold tabular-nums"
          style={{ color: "var(--ws-ink)" }}
        >
          {pct}%
        </span>
      )}
    </span>
  );
}
