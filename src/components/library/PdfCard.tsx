"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BreadcrumbLine } from "@/components/library/NodeCard";
import { FileCover } from "@/components/library/FileCover";
import { ProvenanceBadge } from "@/components/library/ProvenanceBadge";
import { ReadingCard } from "@/components/library/ReadingCard";
import { formatBytes } from "@/components/library/format";
import { ChevronRight, DownloadIcon, ExternalLinkIcon } from "@/components/shell/icons";
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

  // Named as a PDF here, where the other species names chapters and reflow
  // instead. The two vocabularies are the difference the reader is actually
  // being asked to see, and stating the format is what makes "Text edition"
  // over there mean something.
  const facts = [
    "PDF",
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
    // `relative` so the primary link can be stretched across the whole card.
    // The alternative — wrapping everything in one anchor — cannot hold the
    // download link, because an anchor inside an anchor is not a thing.
    <div className="group relative rounded-2xl border border-rule bg-card p-4 transition-shadow hover:shadow-md">
      {"breadcrumb" in file && file.breadcrumb.length > 0 && (
        <BreadcrumbLine steps={file.breadcrumb} />
      )}

      <div className="flex items-start gap-3.5">
        {/* The document's own first page, which for these scans and exports is
            usually the printed cover — and when it is a wall of body text
            instead, an operator can upload a real one or clear it, in which
            case `FileCover` draws a title card. A folder of ten identical grey
            icons is a list of filenames, something you read; the same folder
            with its covers is a shelf, something you scan.

            Squarer than the reading card's portrait frame on purpose: this one
            is a document, that one is a book, and the silhouette is the part of
            the difference that survives being read at arm's length. */}
        <FileCover
          src={file.thumbnail_url}
          title={file.title}
          id={file.id}
          className="h-[3.75rem] w-[3.25rem] rounded-lg"
        />

        <div className="min-w-0 flex-1">
          <Link
            href={href}
            // The stretch is the card: `after` covers every pixel of the
            // parent, so a tap anywhere that is not one of the quiet links
            // below opens the document.
            className="after:absolute after:inset-0 after:content-['']"
          >
            <span
              {...contentLang(file.title)}
              className={`${contentLang(file.title).className} block text-[0.9375rem] font-semibold leading-snug group-hover:underline`}
            >
              {file.title}
            </span>
          </Link>

          {/* Said once. The old card printed this here and again inside the
              button under it, which is how a reader learns to stop reading
              either of them. */}
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
            {facts && <span className="tabular-nums">{facts}</span>}
            {/* Only when this file disagrees with its folder, which is what the
                field means — it is an override, blank meaning "inherit". A
                folder of ten files all saying the same word ten times is not
                ten pieces of information, it is one piece of chrome, and it was
                colliding with the other vocabulary on this screen besides:
                "Compilation" as a provenance and a text edition are different
                claims that happened to share an English word. Said once in the
                folder's own header now, and here only where it differs. */}
            {file.provenance !== folderProvenance && (
              <ProvenanceBadge provenance={file.provenance} />
            )}
          </span>

          {file.description && (
            <span
              {...contentLang(file.description)}
              className={`${contentLang(file.description).className} mt-1 block text-xs text-ink-soft`}
            >
              {file.description}
            </span>
          )}
        </div>

        {/* The affordance, and the only thing on the card that needs to say
            "this opens": an arrow where a thumb already expects one. */}
        <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5" />
      </div>

      {percent !== null && place && (
        <div className="mt-3">
          <span className="block h-1.5 overflow-hidden rounded-full bg-canvas">
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
                // underneath, so nothing here is doing the lying.
                width: `${Math.max(percent, 4)}%`,
                background: "linear-gradient(90deg, var(--color-accent), var(--ws-color))",
              }}
            />
          </span>
          <span
            className="mt-1.5 block text-xs font-semibold tabular-nums"
            style={{ color: "var(--ws-ink)" }}
          >
            Resume on page {place.page}
            {place.pageCount > 0 && ` of ${place.pageCount}`}
          </span>
        </div>
      )}

      {heavy && (
        // Before a byte moves, and worth its own line rather than a clause on
        // the end of the facts: on mobile data this is the difference between
        // a tap and a decision.
        <p className="mt-2 text-xs text-ink-soft">
          Large file — slow to open on mobile data.
        </p>
      )}

      {/* The ways *round* the reader, drawn as such: a hairline below the
          document, muted, and last. `relative z-10` lifts them clear of the
          stretched link so they stay tappable. */}
      <div className="relative z-10 mt-3 flex items-center gap-4 border-t border-rule pt-2.5">
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
        >
          <ExternalLinkIcon className="h-3.5 w-3.5" />
          <span>Open in a new tab</span>
        </a>
        <a
          href={file.url}
          download
          className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
        >
          <DownloadIcon className="h-3.5 w-3.5" />
          <span>Download</span>
        </a>
      </div>
    </div>
  );
}
