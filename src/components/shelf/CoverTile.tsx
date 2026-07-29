import { bookHue, coverGradient } from "@/lib/bookHue";
import type { BookSummary } from "@/lib/types";

/**
 * A book's cover, at four densities (design 1A rail, 1B grid, 1C hero, plus
 * the small tile the resume cards use).
 *
 * Most ग्रंथ have no cover image on the BE, and the spec draws the fallback not
 * as a grey placeholder but as a *designed object*: a 150° gradient in the
 * book's own hue, the title's first अक्षर set large in the top-left, and a
 * short white rule at the foot standing in for a spine band. So the letter
 * tile is the normal case here, not the error case.
 *
 * `caption="title"` puts the title inside the tile — the Home rail draws it
 * that way, over a scrim so small white type keeps its contrast on an image
 * cover as well as on a gradient.
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
  /** what sits at the foot of the tile: the spine rule, the title, or nothing */
  caption?: "dash" | "title" | "none";
}) {
  const hue = bookHue(book.code ?? book.title_hi);
  const showTitle = caption === "title" && size !== "sm";
  const showDash = caption === "dash" && size !== "sm";

  return (
    <div
      className={`${BOX[size]} relative flex shrink-0 flex-col justify-between overflow-hidden border border-white/15 shadow-[0_10px_22px_-12px_rgba(20,15,10,.55)]`}
      style={
        book.cover_image
          ? undefined
          : { background: coverGradient(hue) }
      }
    >
      {book.cover_image && (
        <>
          {/* covers come from the BE media host; a plain img avoids configuring
              remote patterns for a host that is still moving */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={book.cover_image}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* The spec's own scrim over image covers (1A/1B), so the अक्षर and
              any title on top of them read at the same contrast they do on a
              gradient — an unknown photograph cannot be trusted to be dark. */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(rgba(20,15,10,.18), rgba(20,15,10,.62))",
            }}
          />
        </>
      )}

      <span
        aria-hidden
        lang="hi"
        className={`hi relative leading-none text-white/90 ${LETTER[size]}`}
      >
        {book.title_hi?.[0] ?? "ग्र"}
      </span>

      {showDash && (
        <span
          aria-hidden
          className="relative h-0.5 w-5 rounded-full bg-white/55"
        />
      )}
      {showTitle && (
        <span
          lang="hi"
          className="hi relative line-clamp-2 text-xs font-semibold leading-snug text-white/95"
        >
          {book.title_hi}
        </span>
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
