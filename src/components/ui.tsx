import Link from "next/link";

export function PageContainer({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`mx-auto w-full ${wide ? "max-w-5xl" : "max-w-3xl"} px-4 py-5 sm:px-6`}>
      {children}
    </div>
  );
}

/**
 * Section headings come in two tiers, which the spec is consistent about and
 * which carry different meaning:
 *
 * - `eyebrow` (11px / 700 / uppercase) labels a shelf of things that belong to
 *   the page — CONTINUE READING, BOOKS · ग्रंथ, EXPLORE WORKSPACES. It is a
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
            ? "text-[17px] font-semibold tracking-[-0.01em] text-ink"
            : "text-[11px] font-bold uppercase tracking-[0.09em] text-ink-soft"
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
      className="shrink-0 text-xs font-semibold transition-opacity hover:opacity-75"
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
  /** where the "सभी" chip goes — clearing the filter */
  allHref: string;
  options: { value: string; label: string; href: string }[];
  /** the selected value; undefined means "सभी" */
  active?: string;
}) {
  if (options.length === 0) return null;
  const chip = (selected: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
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
        <span lang="hi" className="hi">सभी</span>
      </Link>
      {options.map((o) => (
        <Link
          key={o.value}
          href={o.href}
          aria-current={active === o.value ? "true" : undefined}
          className={chip(active === o.value)}
          style={active === o.value ? { background: "var(--ws-color)" } : undefined}
        >
          <span lang="hi" className="hi">{o.label}</span>
        </Link>
      ))}
    </div>
  );
}

/**
 * A link-based segmented control for sibling destinations (design 5A, 9A):
 * Events | Centres on Connect, प्रवचन | Videos on Listen. Links, not state —
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
          className={`px-4 py-1.5 ${it.active ? "font-semibold text-white" : "text-ink"}`}
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
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-white p-8 text-center">
      <p className="text-sm font-medium text-ink">Couldn&apos;t load this right now.</p>
      <p className="mt-1 text-xs text-ink-soft">
        {message ?? "Check your connection and try again."}
      </p>
    </div>
  );
}
