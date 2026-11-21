import { CloudIcon } from "@/components/shell/icons";

/**
 * The way out to the full scanned archive, under a shelf's folders (designer,
 * 23 Oct 2026).
 *
 * The shelf holds what has been published; the archive holds everything, as
 * it was scanned, and is where a reader goes for a whole folder at once.
 *
 * Highlighted (Raka, 19 Nov 2026): as a plain white card with a text link it
 * read as one more folder in the grid above it. Now the card is washed and
 * edged in the workspace colour (`archive-card` in globals), the icon tile is
 * filled, and the link is a real 44px button. White on `--ws-color` is 5.5:1
 * in every theme, because the fill does not follow the theme.
 *
 * This is the one link out of the app that is filled — "Buy books" stays
 * outlined so it does not outrank what stays in the app. The archive is the
 * deliberate exception. It opens in a new tab and says so with the arrow; a
 * phone has room for "Open" alone.
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
      className="archive-card group flex items-center gap-4 rounded-card border p-4 shadow-card transition-shadow hover:shadow-raised"
    >
      <span
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-tile text-white"
        style={{ background: "var(--ws-color)" }}
      >
        <CloudIcon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-title font-semibold leading-snug">{title}</span>
        <span className="mt-0.5 block text-sm text-ink-soft">{description}</span>
      </span>
      <span
        className="inline-flex min-h-11 shrink-0 items-center whitespace-pre rounded-control px-3.5 text-sm font-semibold text-white transition-opacity group-hover:opacity-90 sm:px-4"
        style={{ background: "var(--ws-color)" }}
      >
        Open<span className="hidden sm:inline"> archive</span>
        <span aria-hidden> ↗</span>
        <span className="sr-only"> (opens in a new tab)</span>
      </span>
    </a>
  );
}
