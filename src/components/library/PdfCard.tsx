"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BreadcrumbLine } from "@/components/library/NodeCard";
import { ProvenanceBadge } from "@/components/library/ProvenanceBadge";
import { ReadingCard } from "@/components/library/ReadingCard";
import { formatBytes } from "@/components/library/format";
import { AlertIcon, DownloadIcon } from "@/components/shell/icons";
import { KindTile } from "@/components/ui";
import { contentLang } from "@/lib/script";
import { getPdfPlace } from "@/lib/storage";
import type { LibraryFile, LocatedFile, Provenance } from "@/lib/types";

/**
 * A document, as a row in its folder.
 *
 * **The whole card opens it.** The previous version put a bordered "Read here"
 * box inside a bordered card, and everything wrong with it followed from that
 * one choice: a box inside a box reads as two competing objects rather than
 * one document; the inner one looks like a form control; it repeated the page
 * count and the size that the line above had just given; and on a phone it
 * made a thumb-sized target out of a card that could have been the target
 * itself. "Read **here**" was a leftover too — it meant something when the
 * viewer opened inline, and reading has had its own screen since.
 *
 * So: one object, one tap anywhere on it, the facts stated once. Opening out
 * and downloading survive as what they are — the ways round the reader, not
 * the way in — and are drawn quietly enough to say so.
 *
 * **This is one of two species**, and this one is a *file*. A document whose
 * text is through the pipeline is a work rather than a file, and gets
 * `ReadingCard` instead — that component's header explains why the difference
 * is drawn rather than badged. The branch is here, taken on `file.reading`, so
 * that exactly one place in the app decides which of the two a row is.
 */

/** Above this the row warns before the reader spends the data. See `PdfView`. */
const HEAVY_BYTES = 20 * 1024 * 1024;

export function PdfCard({
  file,
  folderProvenance,
}: {
  file: LibraryFile | LocatedFile;
  /** the folder's own, so a row can stay silent when it agrees — see below */
  folderProvenance?: Provenance;
}) {
  const [place, setPlace] = useState<{ page: number; pageCount: number } | null>(null);

  useEffect(() => {
    const saved = getPdfPlace(`library-file:${file.id}`);
    // A place on page one is where the document opens anyway — saying "resume"
    // for it would be a promise about nothing.
    if (saved && saved.page > 1) {
      setPlace({ page: saved.page, pageCount: saved.page_count || file.page_count || 0 });
    }
  }, [file.id, file.page_count]);

  if (file.reading) return <ReadingCard file={file} reading={file.reading} />;

  const readHref = `/library/${file.node}/read/${file.id}`;
  const href = place ? `${readHref}?page=${place.page}` : readHref;
  const heavy = (file.file_size ?? 0) >= HEAVY_BYTES;

  // How long it is and how heavy — the two facts a reader weighs before
  // opening one. The kind used to lead this line ("PDF · 133 pages · 12 MB")
  // and it was the one word on it nobody needed: every row in this folder is a
  // PDF, the tile beside it is the violet document mark, and the other species
  // of row says "Text edition" in its own right where that matters.
  const facts = [
    file.page_count ? `${file.page_count} ${file.page_count === 1 ? "page" : "pages"}` : null,
    formatBytes(file.file_size) || null,
  ]
    .filter(Boolean)
    .join(" · ");

  const percent =
    place && place.pageCount > 0
      ? Math.min(100, Math.round((place.page / place.pageCount) * 100))
      : null;

  return (
    /*
      **A ruled list, not a stack of cards.**

      Every row here is a file in one folder — same kind, same source, one after
      another — and a border around each drew nine boxes to say what one list
      already said. The hairline between rows is the whole of the structure a
      list of like things needs; the tile carries the identity, and the card's
      own frame was competing with the folder rows above it, which *are*
      separate objects.

      `relative` is what lets the whole row open the document while the download
      keeps its own tap: an anchor cannot hold another anchor, so the primary one
      is stretched across the row behind it rather than wrapped around it.
    */
    <div className="group relative py-3">
      <div className="flex items-start gap-3">
      {/* The document's own first page, which for these scans and exports is
          usually the printed cover — smaller than a folder's tile, because a
          file is the smaller thing. */}
      <KindTile kind="pdf" cover={file.thumbnail_url} size="md" />

      <span className="min-w-0 flex-1">
        {"breadcrumb" in file && file.breadcrumb.length > 0 && (
          <BreadcrumbLine steps={file.breadcrumb} />
        )}
        <span
          {...contentLang(file.title)}
          /* One line, truncated. Two lines of a filename pushed the facts and
             the bar down and made every row a different height, which is what
             a list of like things must not be — and the tail of these names is
             a scan artefact ("_c"), not the part that tells them apart. */
          className={`${contentLang(file.title).className} hi-tight block truncate text-sm font-semibold group-hover:underline`}
        >
          {file.title}
        </span>
        {file.description && (
          <span
            {...contentLang(file.description)}
            className={`${contentLang(file.description).className} mt-1 line-clamp-1 block text-xs text-ink-soft`}
          >
            {file.description}
          </span>
        )}
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
          {facts && <span className="tabular-nums">{facts}</span>}
          {/* Only when this file disagrees with its folder, which is what the
              field means — it is an override, blank meaning "inherit". */}
          {file.provenance !== folderProvenance && (
            <ProvenanceBadge provenance={file.provenance} />
          )}
        </span>

        {percent !== null && place && (
          <span className="mt-2 block">
            <span className="block h-1 overflow-hidden rounded-full bg-canvas">
              <span
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${percent}% read`}
                className="block h-full rounded-full"
                style={{
                  // A floor, so the bar reads as a bar. Two percent of a
                  // 220-page book is three pixels, which looks like a stray dot
                  // rather than a start — and the exact page is spelled out
                  // under it, so nothing here is doing the lying.
                  width: `${Math.max(percent, 4)}%`,
                  background: "var(--progress-fill)",
                }}
              />
            </span>
            <span
              className="mt-1 block text-xs font-semibold tabular-nums"
              style={{ color: "var(--ws-ink)" }}
            >
              Resume on page {place.page}
              {place.pageCount > 0 && ` of ${place.pageCount}`}
            </span>
          </span>
        )}

      </span>

      {/*
        The download, at the end of the row where a list puts its one action —
        the glyph alone, because the row beside it has already said what the
        file is and a second reading of "PDF" is not what the space is for. The
        name survives for anyone who cannot see the mark.

        `download` *and* `target`: browsers honour the attribute only
        same-origin, or where the server sends `Content-Disposition:
        attachment`, and these files come from an R2 bucket that sends neither.
        So where it is honoured the file saves, and where it is not the PDF
        opens in a tab of its own rather than navigating the app away.
      */}
      <a
        href={file.url}
        download=""
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Download ${file.title}`}
        title="Download PDF"
        className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-soft transition-colors hover:bg-ink/[.04] hover:text-ink"
      >
        <DownloadIcon className="h-4.5 w-4.5" />
      </a>

      </div>

      {heavy && (
        // Before a byte moves, and worth its own line rather than a clause on
        // the end of the facts: on mobile data this is the difference between a
        // tap and a decision. With the mark in front of it, because set as a
        // plain grey line it read as one more fact about the file — and across
        // the row's whole width rather than inside the text column, which is
        // what lets the sentence finish on one line.
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-soft">
          <AlertIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Large file — slow to open on mobile data.</span>
        </p>
      )}

      {/* The row is the target: this covers every pixel of the positioned
          parent, under the download above it. */}
      <Link href={href} aria-label={`Read ${file.title}`} className="absolute inset-0" />
    </div>
  );
}
