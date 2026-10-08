"use client";

import { useState } from "react";
import { FileList } from "@/components/library/FileList";
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
}: {
  files: LibraryFile[];
  linked: LocatedFile[];
  searchable: boolean;
  albumTitle?: string;
  coverUrl?: string | null;
  audioArt?: "portrait" | "glyph";
  folderProvenance?: Provenance;
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
            placeholder="Search this folder by name"
            aria-label="Search this folder"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-soft"
          />
        </label>
      )}
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
    </>
  );
}
