import Link from "next/link";
import { CheckIcon } from "@/components/shell/icons";
import { contentLang } from "@/lib/script";

/**
 * The three controls the comps use to say "which of these are you looking at".
 *
 * They are not interchangeable and the difference is worth keeping:
 *
 * - **CountedSegmented** splits one set into named parts that add up — All 73 /
 *   Audios 35 / Videos 38. The counts are the point; the reader is choosing
 *   how much to look at.
 * - **CountTabs** switches between two different things about the same object —
 *   a book's chapters and a book's highlights. Nothing adds up.
 * - **Chip** turns a filter on or off. Many can be on at once.
 *
 * Collapsing them into one "segmented control" is how a filter starts looking
 * like a tab, which is how a reader stops being able to guess what tapping it
 * will do.
 */

/**
 * One selected look for every segmented control in the app.
 *
 * It has been three things. A raised white pill, which works on the book page —
 * the panel below it is white too, so the tab reads as the front edge of what
 * it opens — and nowhere else, because on any other page it had nothing to be
 * lighter *than*. Then an accent-bordered pill, which put a second edge inside
 * the track's own. Now the accent itself, filled, with white on it.
 *
 * Filled because the question these controls answer — *which of these am I
 * looking at* — should be answerable from across the room, and because the app
 * already answers it this way: `SegmentedNav` on Connect has always been a
 * solid accent segment. Two shapes for one question was the thing to fix.
 *
 * White on `--ws-color` clears AA in every theme by construction: there the
 * accent is the background, so no theme can change the pairing. Selection is
 * still never colour alone — the weight carries it too, and `aria-current` /
 * `aria-checked` carry it for anyone not looking.
 *
 * The track keeps a hairline in `rule`, the same edge the cards above it wear,
 * so the control reads as an object on the page rather than a smudge in it.
 */
const SEGMENT_TRACK =
  "flex items-stretch gap-1 rounded-control border border-rule bg-inset p-1";

/* `min-w-0`, or the `truncate` on a label never fires: a flex item's floor is
   its longest word, so at the largest text size three segments asked for more
   than a 390px phone has and the control ran off the screen taking the page's
   horizontal scroll with it. `flex-auto` rather than `flex-1` so a long label
   takes the room it needs instead of truncating beside a half-empty neighbour. */
const SEGMENT =
  "flex min-h-11 min-w-0 flex-auto items-center justify-center gap-1.5 rounded-control px-2 text-sm transition-colors";
const SEGMENT_ON = "font-semibold text-white";
const SEGMENT_OFF = "text-ink-soft";
const SEGMENT_ON_STYLE = { background: "var(--ws-color)" };

/**
 * The one exception, and it is the book page's.
 *
 * `CountTabs` sits directly on top of the panel it opens, and that panel is
 * `card` — so a raised card *is* the selected state there: the tab reads as the
 * front edge of the thing below it, which is a relationship the accent cannot
 * express and would talk over. Everywhere else the panel is the page, the pill
 * had nothing to be lighter than, and the fill is what makes it legible.
 */
const SEGMENT_ON_RAISED = "bg-card font-semibold shadow-card";

/** The count beside a segment's label — a chip, so it is not read as part of
 *  the name. On the filled pill it sits in a wash of white rather than a fill
 *  of its own, which would be a third colour inside one control. */
function SegmentCount({
  active,
  value,
  raised,
}: {
  active: boolean;
  value: number;
  /** the book page's white pill, which needs a sunk chip rather than a lit one */
  raised?: boolean;
}) {
  const on = raised ? "bg-inset text-ink-soft" : "bg-white/20 text-white";
  return (
    <span
      className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs tabular-nums ${
        active ? on : "text-ink-soft"
      }`}
    >
      {value}
    </span>
  );
}

/** A segment, as a link when it has its own URL and a button when it does not. */
type Segment<T> = {
  value: T;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  href?: string;
};

/**
 * All 73 · Audios 35 · Videos 38 — a filled pill sliding along a sunk track.
 *
 * Prefers links: on Audio/Video each segment is `?kind=`, and a filtered shelf
 * that is a real URL can be shared, bookmarked and prerendered. Falls back to
 * buttons where there is no URL to give.
 */
export function CountedSegmented<T extends string>({
  label,
  segments,
  value,
  onChange,
}: {
  label: string;
  segments: Segment<T>[];
  value: T;
  onChange?: (v: T) => void;
}) {
  return (
    <div
      role={onChange ? "radiogroup" : undefined}
      aria-label={label}
      className={SEGMENT_TRACK}
    >
      {segments.map((s) => {
        const active = s.value === value;
        const cls = `${SEGMENT} ${active ? SEGMENT_ON : SEGMENT_OFF}`;
        const style = active ? SEGMENT_ON_STYLE : undefined;
        const inner = (
          <>
            {s.icon && (
              <span aria-hidden className="shrink-0">
                {s.icon}
              </span>
            )}
            <span className="truncate">{s.label}</span>
            {s.count !== undefined && <SegmentCount active={active} value={s.count} />}
          </>
        );
        return s.href ? (
          <Link
            key={s.value}
            href={s.href}
            aria-current={active ? "true" : undefined}
            className={cls}
            style={style}
          >
            {inner}
          </Link>
        ) : (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange?.(s.value)}
            className={cls}
            style={style}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Chapters 4 | Highlights & Notes 2.
 *
 * Two different things about one object, where `CountedSegmented` splits one
 * set into parts that add up. Same track, and the one different selected look
 * in the app — see `SEGMENT_ON_RAISED`.
 */
export function CountTabs<T extends string>({
  label,
  tabs,
  value,
}: {
  label: string;
  tabs: { value: T; label: string; count?: number; href: string }[];
  value: T;
}) {
  return (
    <nav aria-label={label} className={SEGMENT_TRACK}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <Link
            key={t.value}
            href={t.href}
            aria-current={active ? "page" : undefined}
            /* min-h-12 rather than the shared 11: "Highlights & Notes" is the
               longest label in the app, and this is the one bar that carries
               two of them. */
            className={`${SEGMENT} min-h-12 ${active ? SEGMENT_ON_RAISED : SEGMENT_OFF}`}
          >
            <span className="truncate">{t.label}</span>
            {t.count !== undefined && (
              <SegmentCount active={active} value={t.count} raised />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * One filter, on or off.
 *
 * Two selected looks, because the comps use two and they mean different
 * things. `solid` is a filter you have positively applied — the topic chips
 * inside the filter sheet, where the fill is what makes "2 selected" visible
 * across the whole panel. `tint` is a selected *position* in a set where
 * something is always selected — the All / With Notes row, where a row of
 * solid fills would read as four active filters.
 *
 * Selection is never colour alone: `solid` also carries a check, and both
 * carry `aria-pressed` or `aria-current`.
 */
export function Chip({
  label,
  selected,
  variant = "solid",
  href,
  onClick,
  onRemove,
}: {
  label: string;
  selected?: boolean;
  variant?: "solid" | "tint";
  href?: string;
  onClick?: () => void;
  /** renders the chip as a dismissible one — the active-filters row */
  onRemove?: () => void;
}) {
  const l = contentLang(label);
  // `shrink-0` and `whitespace-nowrap` together are what keep a chip on one
  // line. Without them a two-word Devanagari label — "व्यवस्था सम्बन्धित" — broke
  // across two lines inside its own pill and left the × floating at the height
  // of neither, because the chip is a flex item in a scrolling row and was
  // being squeezed rather than allowed to scroll out of view.
  const base =
    "inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-colors";
  const cls = !selected
    ? `${base} border-rule bg-card text-ink`
    : variant === "solid"
      ? `${base} border-transparent text-white`
      : base;
  const style = !selected
    ? undefined
    : variant === "solid"
      ? { background: "var(--ws-color)" }
      : {
          borderColor: "var(--ws-ink)",
          background: "color-mix(in srgb, var(--ws-color) 10%, var(--color-card))",
          color: "var(--ws-ink)",
        };

  const body = (
    <>
      {selected && variant === "solid" && <CheckIcon className="h-3.5 w-3.5 shrink-0" />}
      <span {...l} className={l.className}>
        {label}
      </span>
      {onRemove && (
        <span aria-hidden className="text-base leading-none opacity-70">
          ×
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} aria-current={selected ? "true" : undefined} className={cls} style={style}>
        {body}
      </Link>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={onRemove ? undefined : !!selected}
      aria-label={onRemove ? `Remove filter ${label}` : undefined}
      onClick={onRemove ?? onClick}
      className={cls}
      style={style}
    >
      {body}
    </button>
  );
}

/** A horizontal run of chips that scrolls rather than wrapping to a third row
 *  — the genre row on Read, the All / With Notes row on Highlights. */
export function ChipRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
    >
      {children}
    </div>
  );
}
