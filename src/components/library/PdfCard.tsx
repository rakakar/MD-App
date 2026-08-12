"use client";

import { useEffect, useState } from "react";
import { BreadcrumbLine } from "@/components/library/NodeCard";
import { ProvenanceBadge } from "@/components/library/ProvenanceBadge";
import { ReadingCard } from "@/components/library/ReadingCard";
import { formatBytes } from "@/components/library/format";
import { ChevronRight, DownloadIcon, ExternalLinkIcon } from "@/components/shell/icons";
import { KindTile, ListRow, RowAction, RowCard } from "@/components/ui";
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
    <div className="group relative">
      <RowCard
        footer={
          /* The ways *round* the reader, drawn as such: under a hairline,
             quiet, and last. `relative z-10` lifts them clear of the stretched
             link so they stay tappable. */
          <span className="relative z-10 flex flex-wrap items-center gap-x-6">
            <RowAction href={file.url} icon={<ExternalLinkIcon className="h-4 w-4" />}>
              Open in a new tab
            </RowAction>
            <RowAction href={file.url} download icon={<DownloadIcon className="h-4 w-4" />}>
              Download
            </RowAction>
          </span>
        }
      >
        {"breadcrumb" in file && file.breadcrumb.length > 0 && (
          <BreadcrumbLine steps={file.breadcrumb} />
        )}

        <ListRow
          href={href}
          // The stretch is the card: `after` covers every pixel of the
          // positioned parent, so a tap anywhere that is not one of the quiet
          // links in the footer opens the document.
          className="items-start after:absolute after:inset-0 after:content-['']"
          /* The document's own first page, which for these scans and exports is
             usually the printed cover. A folder of ten identical glyphs is a
             list of filenames, something you read; the same folder with its
             covers is a shelf, something you scan — so the cover wins where
             there is one, and the comps' violet document tile is what stands in
             where there is not. */
          leading={<KindTile kind="pdf" cover={file.thumbnail_url} size="lg" />}
          title={file.title}
          meta={
            <>
              {/* Said once. The old card printed this here and again inside the
                  button under it, which is how a reader learns to stop reading
                  either of them. */}
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {facts && <span className="tabular-nums">{facts}</span>}
                {/* Only when this file disagrees with its folder, which is what
                    the field means — it is an override, blank meaning
                    "inherit". A folder of ten files saying the same word ten
                    times is one piece of chrome, not ten pieces of information,
                    and it collided with the other vocabulary on this screen
                    besides: "Compilation" as a provenance and a text edition
                    are different claims that share an English word. Said once
                    in the folder's own header now, and here only where it
                    differs. */}
                {file.provenance !== folderProvenance && (
                  <ProvenanceBadge provenance={file.provenance} />
                )}
              </span>
              {file.description && (
                <span
                  {...contentLang(file.description)}
                  className={`${contentLang(file.description).className} mt-1 block`}
                >
                  {file.description}
                </span>
              )}
            </>
          }
          trailing={
            <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
          }
        />

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
          <p className="mt-2 text-sm text-ink-soft">
            Large file — slow to open on mobile data.
          </p>
        )}
      </RowCard>
    </div>
  );
}
