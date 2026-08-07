"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BreadcrumbLine } from "@/components/library/NodeCard";
import { ProvenanceBadge } from "@/components/library/ProvenanceBadge";
import { formatBytes } from "@/components/library/format";
import {
  ChevronRight,
  DocumentIcon,
  DownloadIcon,
  ExternalLinkIcon,
} from "@/components/shell/icons";
import { contentLang } from "@/lib/script";
import { getPdfPlace } from "@/lib/storage";
import type { LibraryFile, LocatedFile } from "@/lib/types";

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
 */

/** Matches the tint the folder tiles use for a PDF, so a document looks the same everywhere. */
const PDF_TINT = { bg: "#E7E4F1", ink: "#4C4878" };

/** Above this the row warns before the reader spends the data. See `PdfView`. */
const HEAVY_BYTES = 20 * 1024 * 1024;

export function PdfCard({ file }: { file: LibraryFile | LocatedFile }) {
  const [place, setPlace] = useState<{ page: number; pageCount: number } | null>(null);

  useEffect(() => {
    const saved = getPdfPlace(`library-file:${file.id}`);
    // A place on page one is where the document opens anyway — saying "resume"
    // for it would be a promise about nothing.
    if (saved && saved.page > 1) {
      setPlace({ page: saved.page, pageCount: saved.page_count || file.page_count || 0 });
    }
  }, [file.id, file.page_count]);

  const readHref = `/library/${file.node}/read/${file.id}`;
  const href = place ? `${readHref}?page=${place.page}` : readHref;
  const heavy = (file.file_size ?? 0) >= HEAVY_BYTES;

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
    // `relative` so the primary link can be stretched across the whole card.
    // The alternative — wrapping everything in one anchor — cannot hold the
    // download link, because an anchor inside an anchor is not a thing.
    <div className="group relative rounded-2xl border border-rule bg-card p-4 transition-shadow hover:shadow-md">
      {"breadcrumb" in file && file.breadcrumb.length > 0 && (
        <BreadcrumbLine steps={file.breadcrumb} />
      )}

      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ background: PDF_TINT.bg, color: PDF_TINT.ink }}
        >
          <DocumentIcon className="h-5 w-5" />
        </span>

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
            <ProvenanceBadge provenance={file.provenance} />
            {/* The whole reason compilations exist, said where the decision is
                actually made (Compilations.md §1). A reader on a phone has
                learned that a PDF means pinching at a page that will not
                reflow, and that lesson is exactly why they skip this card. If
                the one document that *does* reflow only says so after they
                open it, it is offered to the people who needed it least.

                A link rather than a badge, because it is the better read for
                most people here and should cost one tap, not two. `z-10`
                lifts it clear of the stretched card link above. */}
            {file.reading_book_code && (
              <Link
                href={`${readHref}?text=1`}
                className="relative z-10 rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{ background: PDF_TINT.bg, color: PDF_TINT.ink }}
              >
                <span lang="hi" className="hi">पाठ में पढ़ें</span>
              </Link>
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
