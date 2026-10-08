"use client";

import { PLAY_ALL, downloadFiles } from "@/components/library/folderActions";
import { formatBytes } from "@/components/library/format";
import { DownloadIcon, PlayIcon } from "@/components/shell/icons";

/**
 * The folder hero's two actions (designer's comps, 8 Oct 2026). Client
 * components only because they act: the hero itself is server-rendered.
 */

/** every file in the folder, one download after another — see `downloadFiles` */
export function DownloadAllButton({ files }: { files: { url: string; title: string; file_size: number | null }[] }) {
  const bytes = files.reduce((n, f) => n + (f.file_size ?? 0), 0);
  return (
    <button
      type="button"
      onClick={() => downloadFiles(files)}
      className="inline-flex min-h-11 items-center gap-2 rounded-control border border-white/30 bg-white/10 px-4 text-sm font-semibold transition-colors hover:bg-white/20"
    >
      <DownloadIcon className="h-4 w-4" />
      Download all
      {bytes > 0 && <span className="tabular-nums text-white/80">· {formatBytes(bytes)}</span>}
    </button>
  );
}

/** starts the folder's recordings from the first, in the list below */
export function PlayAllButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(PLAY_ALL))}
      className="inline-flex min-h-11 items-center gap-2 rounded-control bg-white px-4 text-sm font-semibold transition-opacity hover:opacity-90"
      style={{ color: "var(--ws-ink)" }}
    >
      <PlayIcon className="h-3.5 w-3.5" />
      Play all
    </button>
  );
}

/*
 * The phone's copies (designer's phone comps, 8 Oct 2026). On a phone these
 * leave the hero and sit with the list they act on: Play all and Full series
 * as one row under the search, Download all as a full-width button at the
 * list's foot. On the page's own surface rather than the coloured panel, so
 * they are drawn as the page's buttons, not the hero's.
 */

/** Play all, filled, and the set where it also lives, outlined — one row */
export function PhonePlayRow({ playAll, fullSeries }: { playAll: boolean; fullSeries?: string | null }) {
  if (!playAll && !fullSeries) return null;
  return (
    <div className="mt-3 flex gap-2.5 lg:hidden">
      {playAll && (
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(PLAY_ALL))}
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-control px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--ws-color)" }}
        >
          <PlayIcon className="h-3.5 w-3.5" />
          Play all
        </button>
      )}
      {fullSeries && (
        <a
          href={fullSeries}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-control border border-rule bg-card px-4 text-sm font-semibold text-ink transition-colors hover:bg-ink/[.03]"
        >
          Full series
          <span aria-hidden>↗</span>
        </a>
      )}
    </div>
  );
}

/** every file a reader would save, at the list's foot, with what it comes to */
export function PhoneDownloadAll({
  files,
  large,
}: {
  files: { url: string; title: string; file_size: number | null }[];
  /** a file in the list wears the Large tag, so the tag gets its footnote */
  large: boolean;
}) {
  const bytes = files.reduce((n, f) => n + (f.file_size ?? 0), 0);
  return (
    <div className="mt-4 lg:hidden">
      <button
        type="button"
        onClick={() => downloadFiles(files)}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-control border border-rule bg-card px-4 text-sm font-semibold text-ink transition-colors hover:bg-ink/[.03]"
      >
        <DownloadIcon className="h-4 w-4" />
        Download all
        {bytes > 0 && <span className="tabular-nums">· {formatBytes(bytes)}</span>}
      </button>
      {large && (
        <p className="mt-2.5 text-center text-xs text-ink-soft">
          Files marked Large are slow to open on mobile data.
        </p>
      )}
    </div>
  );
}
