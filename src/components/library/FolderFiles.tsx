"use client";

import { useRef, useState } from "react";
import { SearchField } from "@/components/SearchField";
import { FileList } from "@/components/library/FileList";
import { FOLDER_PLACEHOLDER } from "@/components/library/FindBar";
import { PhonePlayRow } from "@/components/library/FolderHeroActions";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const needle = q.trim().toLowerCase();
  const match = (f: LibraryFile) =>
    !needle ||
    f.title.toLowerCase().includes(needle) ||
    (f.description ?? "").toLowerCase().includes(needle);
  const shown = files.filter(match);
  const shownLinked = linked.filter(match);
  const none = needle && shown.length + shownLinked.length === 0;

  // The files a reader would save — not a link to somewhere else, and not a
  // video, which streams — for the Large footnote below the list.
  const downloadable = [...files, ...linked].filter(
    (f) => f.kind !== "link" && f.kind !== "video"
  );
  const large = downloadable.some((f) => (f.file_size ?? 0) >= LARGE_BYTES);

  return (
    <>
      {/* The folder box — the same one a folder with sub-folders searches
          with (`FindBar`'s `folder`), so every folder's search looks alike.
          This one narrows as the reader types: every file is already here. */}
      {searchable && (
        <div className="mt-4">
          <SearchField
            inputRef={inputRef}
            value={q}
            onChange={setQ}
            onSubmit={() => {}}
            onClear={() => {
              setQ("");
              inputRef.current?.focus();
            }}
            placeholder={FOLDER_PLACEHOLDER}
            label="Search this folder"
            roomy
          />
        </div>
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
      {/* The footnote for the Large tags in the list above it. */}
      {large && (
        <p className="mt-4 text-center text-xs text-ink-soft lg:hidden">
          Files marked Large are slow to open on mobile data.
        </p>
      )}
    </>
  );
}
