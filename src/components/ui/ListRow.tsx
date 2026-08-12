import Link from "next/link";
import { ChevronRight } from "@/components/shell/icons";
import { contentLang } from "@/lib/script";

/**
 * The row.
 *
 * A chapter in a book, a file in a folder, a recording in an album — the comps
 * draw all three as the same thing: something on the left that says what kind
 * it is, a title, a line of fact under it, and something on the right that says
 * what happens next. What differs is only the furniture around them, so that
 * is what the wrappers below are for and the row itself stays one component.
 */
export function ListRow({
  href,
  onClick,
  label,
  leading,
  title,
  meta,
  trailing = <ChevronRight />,
  className = "",
}: {
  href?: string;
  /**
   * A row that *does* something rather than going somewhere — a track, which
   * starts playing in the player already on the page. It renders a real
   * `<button>`: a div with a click handler is not reachable by keyboard, and
   * this row is half the album screen.
   */
  onClick?: () => void;
  /** what the button announces, when the title alone would not say enough */
  label?: string;
  leading?: React.ReactNode;
  title: string;
  meta?: React.ReactNode;
  /** the right-hand end — a chevron by default, a duration on a track */
  trailing?: React.ReactNode;
  className?: string;
}) {
  const t = contentLang(title);
  const inner = (
    <>
      {leading}
      <span className="min-w-0 flex-1">
        <span {...t} className={`${t.className} block text-title font-semibold leading-snug`}>
          {title}
        </span>
        {meta && <span className="mt-1 block text-sm text-ink-soft">{meta}</span>}
      </span>
      {trailing && (
        // The chevron is decoration — the row is already a link and its title
        // says where it goes. A duration is not, so a caller passing one
        // passes readable text and this wrapper does not hide it.
        <span className="shrink-0 text-muted">{trailing}</span>
      )}
    </>
  );
  const cls = `flex min-h-14 w-full items-center gap-3.5 text-start ${className}`;
  if (href) {
    return (
      <Link href={href} className={`${cls} group transition-colors active:bg-ink/[0.03]`}>
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={`${cls} group transition-colors active:bg-ink/[0.03]`}
      >
        {inner}
      </button>
    );
  }
  return <div className={cls}>{inner}</div>;
}

/**
 * The numbered square in front of a chapter. Sunk rather than tinted: a
 * chapter has no kind to colour, and giving it one would put a fifth hue in a
 * palette that means something.
 */
export function RowNumber({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-tile bg-inset text-sm font-semibold tabular-nums text-ink-soft"
    >
      {children}
    </span>
  );
}

/**
 * Rows on the page itself, ruled between rather than boxed — the chapter list.
 * The rule is drawn on every row but the first so a group can grow or shrink
 * without anyone maintaining a "last" case.
 */
export function RowGroup({ children }: { children: React.ReactNode }) {
  return (
    <ul className="[&>li+li]:border-t [&>li+li]:border-rule [&>li]:py-1.5">{children}</ul>
  );
}

/**
 * One row inside its own card, with an optional footer of actions under a
 * hairline — the file list, where "Open in a new tab" and "Download" belong to
 * the file above them and not to the list.
 */
export function RowCard({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-rule bg-card p-3.5 shadow-card">
      {children}
      {footer && (
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-rule pt-2">
          {footer}
        </div>
      )}
    </div>
  );
}

/** A footer action on a RowCard — text and a glyph, never a filled button:
 *  there are two of them and neither is the primary thing to do with a file. */
export function RowAction({
  href,
  download,
  icon,
  children,
}: {
  href: string;
  download?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      {...(download ? { download: "" } : { target: "_blank", rel: "noopener noreferrer" })}
      className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-ink transition-opacity hover:opacity-70"
    >
      <span aria-hidden className="text-ink-soft">
        {icon}
      </span>
      {children}
    </a>
  );
}
