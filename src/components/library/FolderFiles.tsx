"use client";

import { useState } from "react";
import { FileList } from "@/components/library/FileList";
import { PhoneDownloadAll, PhonePlayRow } from "@/components/library/FolderHeroActions";
import { LARGE_BYTES } from "@/components/library/folderActions";
import type { LibraryFile, LocatedFile, Provenance } from "@/lib/types";

/**
 * A folder's own files, with a box to narrow them (designer's comps, 8 Oct
 * 2026).
 *
 * The catalogue search (`FindBar`) looks *beneath* a folder, so a folder that
 * holds only files had no box at all. Here the box filters what is already on
 * screen, by name and description, as the reader types — no round trip, since
 * every file is already on the page. A folder with sub-folders keeps its
 * catalogue search instead; `searchable` is off there.
 */
export function FolderFiles({
  files,
  linked,
  searchable,
  albumTitle,
  coverUrl,
  audioArt,
  folderProvenance,
  playAll = false,
  fullSeries,
}: {
  files: LibraryFile[];
  linked: LocatedFile[];
  searchable: boolean;
  albumTitle?: string;
  coverUrl?: string | null;
  audioArt?: "portrait" | "glyph";
  folderProvenance?: Provenance;
  /** a series of recordings: Play all goes under the search on a phone */
  playAll?: boolean;
  /** where the whole set also lives — Full series, beside Play all */
  fullSeries?: string | null;
}) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const match = (f: LibraryFile) =>
    !needle ||
    f.title.toLowerCase().includes(needle) ||
    (f.description ?? "").toLowerCase().includes(needle);
  const shown = files.filter(match);
  const shownLinked = linked.filter(match);
  const none = needle && shown.length + shownLinked.length === 0;

  // What Download all takes: every file a reader would save — not a link to
  // somewhere else, and not the recordings, which play.
  const downloadable = [...files, ...linked].filter(
    (f) => f.kind !== "link" && f.kind !== "audio" && f.kind !== "video"
  );
  const large = downloadable.some((f) => (f.file_size ?? 0) >= LARGE_BYTES);

  return (
    <>
      {searchable && (
        <label className="mt-4 flex min-h-12 items-center gap-3 rounded-control border border-rule bg-card px-4 focus-within:border-(--ws-ink)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-4.5 w-4.5 shrink-0 text-ink-soft" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, topic, year or place"
            aria-label="Search this folder"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-soft"
          />
        </label>
      )}
      <PhonePlayRow playAll={playAll} fullSeries={fullSeries} />
      {none ? (
        <p className="mt-6 text-center text-sm text-ink-soft">Nothing in this folder matches “{q.trim()}”.</p>
      ) : (
        <FileList
          files={shown}
          linked={shownLinked}
          albumTitle={albumTitle}
          coverUrl={coverUrl}
          audioArt={audioArt}
          folderProvenance={folderProvenance}
        />
      )}
      {downloadable.length > 1 && <PhoneDownloadAll files={downloadable} large={large} />}
    </>
  );
}
