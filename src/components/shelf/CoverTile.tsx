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
 * Covers are contained rather than cropped. A printed cover is portrait and
 * these boxes are not; `object-cover` on the square shelf tile threw away the
 * publisher's block and half the title.
 */
type Size = "sm" | "rail" | "grid" | "lg";

const BOX: Record<Size, string> = {
  sm: "h-16 w-11 rounded-[10px] p-2",
  rail: "aspect-[3/4] w-full rounded-[14px] p-3",
  grid: "aspect-square w-full rounded-xl p-3",
  lg: "h-[130px] w-24 rounded-[14px] p-3.5",
};

const LETTER: Record<Size, string> = {
  sm: "text-[20px]",
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
  const showDash = caption === "dash" && size !== "sm" && !hasCover;

  return (
    <div
      className={`${BOX[size]} relative flex shrink-0 flex-col justify-between overflow-hidden border border-white/15 shadow-[0_10px_22px_-12px_rgba(20,15,10,.55)]`}
      style={{ background: coverGradient(hue) }}
    >
      {book.cover_image && (
        <>
          {/* covers come from the BE media host; a plain img avoids configuring
              remote patterns for a host that is still moving */}
          {/* The same cover, blown out and blurred, filling the bars a portrait
              cover leaves in a square tile. The book's hue was the obvious
              ground and the wrong one: a hue derived from the book's *code*
              has no relation to the artwork, so a lavender cover sat in a teal
              surround and the tile read as two objects. Its own colours always
              agree with it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={book.cover_image}
            alt=""
            aria-hidden
            loading="lazy"
            className="absolute inset-0 h-full w-full scale-125 object-cover blur-xl saturate-125"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={book.cover_image}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_4px_12px_rgba(20,15,10,.35)]"
          />
        </>
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
 * where a 44px ring does not. The figure is always spelled out beside it,
 * because the fill alone carries the meaning only for people who can see it.
 */
export function ProgressBar({
  percent,
  className = "",
}: {
  percent: number;
  className?: string;
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
      <span
        className="shrink-0 text-[11px] font-bold tabular-nums"
        style={{ color: "var(--ws-ink)" }}
      >
        {pct}%
      </span>
    </span>
  );
}
