import Link from "next/link";
import { contentLang } from "@/lib/script";

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
}: {
  children: React.ReactNode;
  size?: "text" | "shelf";
}) {
  return (
    <div
      className={`mx-auto w-full ${
        size === "shelf" ? "max-w-[1088px]" : "max-w-3xl"
      } px-4 py-5 sm:px-6 lg:px-8`}
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
 *   the page — CONTINUE READING, BOOKS, EXPLORE WORKSPACES. It is a
 *   caption; the covers under it are the content.
 * - `title` (17px, sentence case, full ink) heads a section that is its own
 *   subject — News & updates, Upcoming shivirs.
 *
 * A single middle tier for both, which is what this used to be, made the page
 * read as one flat list of equal things.
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
    <div className="mb-3 mt-7 flex items-center justify-between gap-3 first:mt-0">
      <h2
        className={
          tier === "title"
            ? "text-[1.0625rem] font-semibold tracking-[-0.01em] text-ink"
            : "text-xs font-bold uppercase tracking-[0.09em] text-ink-soft"
        }
      >
        {children}
      </h2>
      {action}
    </div>
  );
}

/** The "All 6 →" / "See all →" link the spec pairs with a section heading. */
export function SeeAll({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 shrink-0 items-center text-xs font-semibold transition-opacity hover:opacity-75"
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
  const chip = (selected: boolean) =>
    `min-h-11 inline-flex items-center rounded-full border px-3 text-xs font-medium transition-colors ${
      selected ? "border-transparent text-white" : "border-rule bg-white text-ink"
    }`;
  return (
    <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={label}>
      <Link
        href={allHref}
        aria-current={active ? undefined : "true"}
        className={chip(!active)}
        style={!active ? { background: "var(--ws-color)" } : undefined}
      >
        All
      </Link>
      {options.map((o) => (
        <Link
          key={o.value}
          href={o.href}
          aria-current={active === o.value ? "true" : undefined}
          className={chip(active === o.value)}
          style={active === o.value ? { background: "var(--ws-color)" } : undefined}
        >
          <span {...contentLang(o.label)}>{o.label}</span>
        </Link>
      ))}
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
      className="inline-flex overflow-hidden rounded-full border border-rule bg-white text-sm"
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

export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-rule bg-white/50 p-8 text-center">
      <p className="text-base font-medium text-ink">{title}</p>
      {/* An empty state is a whole sentence addressed to the reader, not a
          caption — it gets body size, not the metadata floor. */}
      {hint && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}
    </div>
  );
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-white p-8 text-center">
      <p className="text-base font-medium text-ink">Couldn&apos;t load this right now.</p>
      <p className="mt-1 text-sm text-ink-soft">
        {message ?? "Check your connection and try again."}
      </p>
    </div>
  );
}
