import { CloudIcon } from "@/components/shell/icons";

/**
 * The way out to the full scanned archive, under a shelf's folders (designer,
 * 23 Oct 2026).
 *
 * The shelf holds what has been published; the archive holds everything, as
 * it was scanned, and is where a reader goes for a whole folder at once. An
 * ordinary link that leaves the app, so it opens in a new tab and says so
 * with the arrow. The label beside the arrow is the desktop's; a phone has
 * room for the arrow alone.
 */
export function ArchiveLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-4 rounded-card border border-rule bg-card p-4 shadow-card transition-shadow hover:shadow-raised"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-tile bg-kind-folder text-kind-folder-ink">
        <CloudIcon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-title font-semibold leading-snug">{title}</span>
        <span className="mt-0.5 block text-sm text-ink-soft">{description}</span>
      </span>
      <span className="shrink-0 text-sm font-semibold" style={{ color: "var(--ws-ink)" }}>
        <span className="hidden sm:inline">Open archive </span>
        <span aria-hidden>↗</span>
      </span>
    </a>
  );
}
