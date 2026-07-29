import type { BookSummary } from "@/lib/types";

/**
 * A book's cover, at three sizes (design 1A rail, 1B grid, 1C hero).
 *
 * Most ग्रंथ have no cover image on the BE, and the spec draws the fallback as
 * a solid workspace-hue tile carrying the title's first अक्षर — not a grey
 * placeholder. So the letter tile is the normal case here, not the error case,
 * and it is styled as deliberately as the image would be.
 */
export function CoverTile({
  book,
  size = "md",
}: {
  book: Pick<BookSummary, "title_hi" | "cover_image">;
  size?: "sm" | "md" | "lg";
}) {
  const box =
    size === "sm"
      ? "h-16 w-11 rounded-md text-base"
      : size === "lg"
        ? "h-40 w-28 rounded-xl text-3xl"
        : "h-28 w-20 rounded-lg text-xl";

  if (book.cover_image) {
    return (
      // covers come from the BE media host; a plain img avoids configuring
      // remote patterns for a host that is still moving
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={book.cover_image}
        alt=""
        loading="lazy"
        className={`${box} shrink-0 object-cover shadow-sm`}
      />
    );
  }

  return (
    <div
      aria-hidden
      className={`${box} flex shrink-0 items-center justify-center font-bold text-white shadow-sm`}
      style={{ background: "var(--ws-color)" }}
    >
      <span lang="hi" className="hi">
        {book.title_hi?.[0] ?? "ग्र"}
      </span>
    </div>
  );
}

/**
 * Percent-read, as a ring around the number (design 1A/1C).
 *
 * The figure is always spelled out in text inside the ring, because the arc
 * alone carries the meaning only for people who can see it.
 */
export function ProgressRing({ percent, size = 44 }: { percent: number; size?: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div
      role="img"
      aria-label={`${pct}% read`}
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <div
        className="h-full w-full rounded-full"
        style={{
          background: `conic-gradient(var(--ws-color) ${pct * 3.6}deg, var(--color-rule) 0deg)`,
        }}
      />
      <div className="absolute inset-[3px] flex items-center justify-center rounded-full bg-white">
        <span className="text-[10px] font-semibold tabular-nums" style={{ color: "var(--ws-ink)" }}>
          {pct}%
        </span>
      </div>
    </div>
  );
}
