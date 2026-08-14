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
      // The same object as `CountTabs`, which the book page wears: an 8px track
      // with an 8px pill riding in it, and the selected segment lifted on the
      // card surface rather than filled with the accent. Two controls that do
      // the same job — "which of these am I looking at" — had a pill each, one
      // round and accented and one square and raised, and a reader met both
      // within two taps of each other.
      // A hairline on the track, in the same `rule` the resume cards above it
      // wear. The sunk fill alone was doing two jobs — holding the pill and
      // marking the edge of the control — and on this page it sits a few
      // pixels under a card that does have an edge, so the control read as a
      // smudge on the page rather than as an object on it.
      className="flex items-stretch gap-1 rounded-control border border-rule bg-inset p-1"
    >
      {segments.map((s) => {
        const active = s.value === value;
        // `min-w-0`, or the `truncate` on the label never fires: a flex item's
        // floor is its longest word, so at the largest text size three
        // segments asked for more than a 390px phone has and the control ran
        // off the screen taking the page's horizontal scroll with it.
        // The selected pill wears the kind tile's own pairing — a 12% wash of
        // the workspace colour with `--ws-ink` on it — and no outline. It was
        // a white raised card first, which had nothing to be lighter than on
        // this page, then an accent-bordered one, which put a second edge
        // inside the track's. The tile beside every recording on this shelf
        // already says what "this one" looks like; the pill says it the same
        // way, and the track's own hairline is the only line in the control.
        const cls = `flex min-h-11 min-w-0 flex-auto items-center justify-center gap-1.5 rounded-control px-2 text-sm transition-colors ${
          active ? "font-semibold" : "text-ink-soft"
        }`;
        const style = active
          ? {
              background: "color-mix(in srgb, var(--ws-color) 12%, var(--color-card))",
              color: "var(--ws-ink)",
            }
          : undefined;
        const inner = (
          <>
            {s.icon && (
              <span aria-hidden className="shrink-0">
                {s.icon}
              </span>
            )}
            <span className="truncate">{s.label}</span>
            {s.count !== undefined && (
              // The counted chip `CountTabs` draws, rather than a bare number:
              // the selected segment is a raised card now, and a loose figure
              // on it read as part of the label — "Audios 35" as a title.
              <span
                className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs tabular-nums ${
                  active ? "bg-card" : "text-ink-soft"
                }`}
              >
                {s.count}
              </span>
            )}
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
 * The active tab is a raised white card rather than an accent fill, which is
 * the one place in the app that distinction is load-bearing: the panel below
 * it is white too, so the tab reads as the front edge of the thing it opens.
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
    <nav aria-label={label} className="flex items-stretch gap-1 rounded-control bg-inset p-1">
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <Link
            key={t.value}
            href={t.href}
            aria-current={active ? "page" : undefined}
            /* `min-w-0` for the same reason as above — "Highlights & Notes"
               is the longest label in the app and the one that proved it.
               `flex-auto`, not `flex-1`: equal halves fitted that label exactly
               until it grew a count beside it, and then it truncated to
               "Highlights & No…" while the other half sat half empty. Sized
               from content, the long tab takes the room it needs and the spare
               is still shared. */
            /* The selected pill takes the bar's own 8px rather than a radius
               of its own — it was `rounded-[1.125rem]`, an 18px literal under
               a 24px track, which is the pair of one-offs the ladder exists to
               stop. Not inset by the 4px of track padding, because the
               designer draws the two corners the same. */
            className={`flex min-h-12 min-w-0 flex-auto items-center justify-center gap-2 rounded-control px-2 text-sm transition-colors ${
              active ? "bg-card font-semibold shadow-card" : "text-ink-soft"
            }`}
          >
            <span className="truncate">{t.label}</span>
            {t.count !== undefined && (
              <span
                className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs tabular-nums ${
                  active ? "bg-inset text-ink-soft" : "text-ink-soft"
                }`}
              >
                {t.count}
              </span>
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
