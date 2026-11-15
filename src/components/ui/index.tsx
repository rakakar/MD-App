import Link from "next/link";

/**
 * The app's own furniture.
 *
 * What was one file is now a folder, because the designer's finished screens
 * turned out to repeat nine objects — a coloured hero, a collection card, a
 * kind tile, a row, a counted control, a chip, a filter panel, a stat tile,
 * a promo band — that nine screens had each been drawing for themselves. They
 * are all re-exported from here, so `@/components/ui` still means what it
 * always did to everything that imports it.
 *
 * The rule for what belongs here: a thing at least two screens draw, whose
 * *look* is shared and whose *policy* is not. Policy stays with the caller —
 * which is why there is a FilterButton and no FilterSheet, and a SearchField
 * with no opinion about when to search.
 */
export * from "./Card";
export * from "./CollectionHero";
export * from "./Filters";
export * from "./KindTile";
export * from "./ListRow";
export * from "./Segmented";
export * from "./Skeleton";
export { useUndoToast } from "./UndoToast";
export * from "./ShareButton";
export * from "./Sheet";
export * from "./Switch";

import { contentLang } from "@/lib/script";
import { Chip, ChipRow } from "./Segmented";

/**
 * The call-to-action, in one place.
 *
 * Sign in, Share, Retry, Send feedback, Register, Turn on notifications — the
 * app had about twenty of these and every one of them was written out by hand,
 * so they agreed on being white-on-workspace-colour and on nothing else: five
 * different horizontal paddings, two type sizes, and a pill radius that the
 * designer's 8px has now replaced. Three of them were also under the 44px
 * touch floor, because a `py-2.5` button is 40px and nobody had measured one.
 *
 * A class string rather than a component, deliberately: half of these are
 * `<button type="submit">` inside a form, half are `<Link>`, and a wrapper
 * that has to forward both would be more surface than the thing it wraps. The
 * fill stays with the caller as `style={{ background: "var(--ws-color)" }}` —
 * it is the one part that is genuinely per-workspace.
 *
 * `compact` is the same button at the metadata size, for the CTA that sits
 * inside a card rather than under a paragraph — the sutra's Share, the push
 * banner's Turn on. Same height, same radius; only the type steps down.
 *
 * Pressed is a dip and a slight give, so a tap on glass answers before the
 * page does. Disabled is `.cta` in globals.css — the idle canvas look Sign in
 * uses, not a faded accent; set `aria-busy` on a button disabled while it
 * works to keep its fill. Hover and press are off while disabled.
 */
const CTA_BASE =
  "cta inline-flex shrink-0 items-center justify-center gap-1.5 rounded-control " +
  "font-semibold text-white transition-[opacity,transform] duration-100 " +
  "not-disabled:hover:opacity-90 not-disabled:active:scale-[0.98] not-disabled:active:opacity-80";
export const ctaPrimary = `${CTA_BASE} min-h-11 px-5 text-sm`;
export const ctaPrimaryCompact = `${CTA_BASE} min-h-11 px-3.5 text-xs`;
/**
 * The app bar's own height, for the one CTA that stands in that row: Sign in,
 * beside a 48px switcher and a 48px account button. 44px is the touch floor and
 * right everywhere else; here it is the only control in the row standing short.
 *
 * A third name rather than `${ctaPrimary} min-h-12` at the call site: two
 * `min-h` utilities on one element are resolved by their order in the
 * stylesheet, not in the class list, so which one wins is a coin toss. The
 * padding tightens with the height because the bar is the one place this button
 * competes for width.
 */
export const ctaPrimaryBar = `${CTA_BASE} min-h-12 px-4 text-sm`;

/**
 * Page gutters and measure.
 *
 * Two widths, because the pages want different things. `text` keeps a reading
 * measure for pages that are mostly prose. `shelf` is the spec's 1088px
 * content max (1B) — the width the desktop panels are drawn at, and what a
 * 4-up cover grid or a two-column book page needs to exist at all.
 *
 * Desktop gutters step up to 32px to match the spec's panels; at 24px the
 * content sat too close to the sidebar rule.
 */
export function PageContainer({
  children,
  size = "text",
  flushTop = false,
}: {
  children: React.ReactNode;
  size?: "text" | "shelf";
  /**
   * Drop most of the space above the first element.
   *
   * For a page whose first thing is a *control* rather than a heading —
   * Connect opens on its three tabs. The standard `py-5` is measured for a
   * page that starts with a title, where the air is what separates the title
   * from the app bar; above a tab bar the same gap reads as the bar floating
   * loose, because the tabs already carry their own track and padding.
   */
  flushTop?: boolean;
}) {
  return (
    <div
      className={`mx-auto w-full ${
        size === "shelf" ? "max-w-[1088px]" : "max-w-3xl"
      } px-4 pb-5 sm:px-6 lg:px-8 ${flushTop ? "pt-2" : "pt-5"}`}
    >
      {children}
    </div>
  );
}

/**
 * Section headings come in two tiers, which the spec is consistent about and
 * which carry different meaning:
 *
 * - `eyebrow` (13px / 700 / uppercase) labels a shelf of things that belong to
 *   the page — the CONTINUE READING rail at the top of the Library, above the
 *   thing the page is actually about. It is a caption; the covers under it are
 *   the content.
 * - `title` (20px, sentence case, full ink) heads a section that is its own
 *   subject — Books, Shorts, Audio & Video, Explore workspaces.
 *
 * A single middle tier for both, which is what this used to be, made the page
 * read as one flat list of equal things.
 *
 * The title tier was 17px, then 20px/700 when the finished comps arrived, and
 * is 17px/600 again on the designer's revision of Home. The reason it went up
 * was that a heading the same size as the cards under it leaves a long page
 * without a shape; what carries that job now is the rhythm rather than the
 * type — one gap between every section, so a heading is read as a heading
 * because of the air above it. Weight and tracking still separate it from a
 * card title, which is 600 on a card, not on the page.
 *
 * The tier is only worn on Home. If it is ever used on a page that does not
 * keep that rhythm, the size is the thing to revisit.
 */
export function SectionHeading({
  children,
  action,
  tier = "eyebrow",
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  tier?: "eyebrow" | "title";
}) {
  return (
    <div className="mb-3 mt-5 flex items-center justify-between gap-3 first:mt-0">
      <h2
        className={
          tier === "title"
            ? "text-title font-semibold tracking-[-0.015em] text-ink"
            : "text-xs font-bold uppercase tracking-[0.09em] text-ink-soft"
        }
      >
        {children}
      </h2>
      {action}
    </div>
  );
}

/**
 * The "All 6 →" / "See all →" link the spec pairs with a section heading.
 *
 * The 44px touch target is drawn by the `after:` overlay rather than by the
 * link's own height, and that is the whole point of it. As `min-h-11` the
 * target made the heading row 44px tall, so "Books" and "Library" — the two
 * headings that carry one of these — sat 11px lower than "Shorts" and "Audio &
 * Video" and left 23px under themselves where the others left 12. One section
 * gap on Home means the headings have to sit on one baseline too, and the
 * thumb still gets its 44px.
 */
export function SeeAll({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="relative inline-flex shrink-0 items-center text-xs font-semibold transition-opacity after:absolute after:inset-x-[-0.5rem] after:top-1/2 after:h-11 after:-translate-y-1/2 hover:opacity-75"
      style={{ color: "var(--ws-ink)" }}
    >
      {children} →
    </Link>
  );
}

/**
 * A row of filter chips rendered as links, so a filtered shelf is a real URL
 * that can be shared, bookmarked and prerendered.
 *
 * Deliberately unopinionated about *what* it filters: Originals pass genres,
 * Translations pass languages. The three workspaces hold different kinds of
 * thing, so they never share one control — only this presentation.
 */
export function FilterChips({
  label,
  allHref,
  options,
  active,
}: {
  label: string;
  /** where the "All" chip goes — clearing the filter */
  allHref: string;
  options: { value: string; label: string; href: string }[];
  /** the selected value; undefined means "All" */
  active?: string;
}) {
  if (options.length === 0) return null;
  // `tint`, not `solid`. Something is always selected on this row — "All" is a
  // position in the set rather than a filter you switched on — and a row where
  // the selected chip is a solid accent fill reads as one active filter among
  // four available ones, which is the opposite of what it means.
  return (
    /* **Pinned under the app bar.**

       The shelf below runs to seven rows of covers on a phone, and this is the
       row that decides which of them are there — so it was scrolling away from
       the grid it governs, and changing genre meant scrolling back to the top
       to reach it. The same arrangement as the book's own Highlights filters
       and Connect's search: `top-(--app-header-h)` with `lg:top-0`, since the
       bar is `lg:hidden`.

       The air above the chips is padding inside the sticky box rather than a
       larger `top` — push the offset down instead and a band opens between the
       bar and this row that belongs to neither, with covers scrolling up
       through it in the clear. Opaque `bg-surface` for the same reason: this
       stops directly under a bar that is already blurring what passes behind
       it, and two blurred layers over one another is a smear.

       The `-mx-4 px-4` here and the one inside `ChipRow` are both wanted and
       do different jobs: this one takes the background to the screen edge, and
       that one lets the chips scroll to it.

       From sm the background still runs out through the page gutter (the
       container's own px-6 / px-8), not just to the grid's edge: a cover's drop
       shadow spreads ~20px past its column, and a bar exactly as wide as the
       grid left those shadows showing either side of it as they scrolled
       under. */
    <div className="sticky top-(--app-header-h) z-30 -mx-4 mt-3 bg-surface px-4 pb-2 pt-2 sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-8 lg:px-8">
      <ChipRow label={label}>
        <Chip label="All" href={allHref} selected={!active} variant="tint" />
        {options.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            href={o.href}
            selected={active === o.value}
            variant="tint"
          />
        ))}
      </ChipRow>
    </div>
  );
}

/**
 * A link-based segmented control for sibling destinations (design 5A, 9A):
 * Events | Centres on Connect, Audio | Videos on Listen. Links, not state —
 * each segment is its own URL, so the segments survive reload and sharing.
 */
export function SegmentedNav({
  label,
  items,
}: {
  label: string;
  items: { label: React.ReactNode; href: string; active: boolean }[];
}) {
  return (
    <nav
      aria-label={label}
      className="inline-flex overflow-hidden rounded-full border border-rule bg-card text-sm"
    >
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          aria-current={it.active ? "page" : undefined}
          className={`inline-flex min-h-11 items-center px-4 ${
            it.active ? "font-semibold text-white" : "text-ink"
          }`}
          style={it.active ? { background: "var(--ws-color)" } : undefined}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * The quiet button beside or instead of a CTA — Try again, Open a book. Same
 * height, radius and type as `ctaPrimary`; a card with a hairline rather than
 * a fill, so a screen can carry one of each and still have one primary.
 */
export const ctaSecondary =
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-control " +
  "border border-rule bg-card px-5 text-sm font-semibold text-ink " +
  "transition-[background-color,transform] duration-100 hover:bg-ink/5 active:scale-[0.98]";

export function EmptyState({
  title,
  hint,
  icon,
  action,
}: {
  title: string;
  /**
   * A node rather than a string, because the empty state a filter produces has
   * to carry the way back out of the filter. "Nothing matches" with no control
   * on it is the one screen in the app a reader can arrive at and be stuck on.
   */
  hint?: React.ReactNode;
  /** a glyph above the title, in ink-soft — say what would live here */
  icon?: React.ReactNode;
  /** the way forward, under the hint — usually a `ctaSecondary` link */
  action?: React.ReactNode;
}) {
  return (
    // `rounded-card`, not `rounded-2xl` (15 Nov 2026): it stands where the
    // cards it is standing in for would be, so it takes their corner.
    <div className="rounded-card border border-dashed border-rule bg-card/50 p-8 text-center">
      {icon && (
        <div aria-hidden className="mb-3 flex justify-center text-ink-soft">
          {icon}
        </div>
      )}
      <p className="text-base font-medium text-ink">{title}</p>
      {/* An empty state is a whole sentence addressed to the reader, not a
          caption — it gets body size, not the metadata floor. */}
      {hint && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/**
 * A fetch that failed. It used to blame the reader's connection and offer
 * nothing to press; most failures here are ours, and the one thing a reader
 * can do is try again, so a caller that can retry passes `onRetry` (15 Nov
 * 2026).
 */
export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-card border border-rule bg-card p-8 text-center">
      <p className="text-base font-medium text-ink">Couldn’t load this right now.</p>
      <p className="mt-1 text-sm text-ink-soft">
        {message ?? "It may be a problem on our side. Try again in a moment."}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={`mt-4 ${ctaSecondary}`}>
          Try again
        </button>
      )}
    </div>
  );
}

/**
 * The accessible name of an icon-only control that acts on a titled thing —
 * "Download" + the file's title (15 Nov 2026).
 *
 * As an `aria-label` the two were one English string, so a screen reader read
 * the Hindi title with English phonetics. As content, the title can carry its
 * own `lang`. Render it as the control's first child, in place of
 * `aria-label`; the icon beside it stays `aria-hidden`.
 */
export function SrName({ verb, name }: { verb: string; name: string }) {
  const l = contentLang(name);
  return (
    <span className="sr-only">
      {verb} <span lang={l.lang}>{name}</span>
    </span>
  );
}
