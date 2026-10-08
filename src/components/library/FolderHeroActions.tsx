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
