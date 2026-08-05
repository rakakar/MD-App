"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PdfFallback } from "@/components/library/PdfFallback";
import { formatBytes } from "@/components/library/format";
import { DownloadIcon } from "@/components/shell/icons";
import { getPdfPlace } from "@/lib/storage";

/**
 * A PDF **as a row in its folder** — the door to it, not the reading of it.
 *
 * This once tried to be both, and that was the mistake. It opened a viewer
 * inline: 75vh of document inside a card, inside a page carrying a header, a
 * bottom nav and five other files. It saved the reader's place, which was the
 * whole point, and it made reading worse than the browser's own full-screen
 * viewer it had replaced — a trade no reader would take. Reading moved to a
 * route that owns the screen (`/library/<node>/read/<file>`, see `routes.ts`),
 * and what is left here is the job this row always had: say what the document
 * is, say what it weighs, and open it.
 *
 * The weight matters before the tap, not after. The old button pulled 97 MB on
 * whatever connection the reader happened to be on and said nothing about it.
 *
 * Download is still offered and never forced (contract §13.4, §13.9).
 */

/**
 * Above this, the row warns before it costs anything.
 *
 * Measured rather than chosen: across the library's PDFs, time to first page
 * stays under 250 ms to 13.5 MB and jumps roughly fifteenfold at 24.9 MB. The
 * threshold sits in the empty gap between, so no file is near enough to the
 * line for a re-export to flip it. It changes what the reader is *told* and
 * nothing else — which viewer they get is decided by whether ours runs.
 */
const HEAVY_BYTES = 20 * 1024 * 1024;

export function PdfView({
  url,
  title,
  readHref = null,
  expanded = false,
  pageCount = null,
  fileSize = null,
  itemId = null,
}: {
  url: string;
  title: string;
  /**
   * The reading route for this file. Null for a book's own PDF, which is
   * addressed by book code and has no library file behind it — that one has no
   * place to save and opens the way it always did.
   */
  readHref?: string | null;
  /** open the document here and now — for a page that *is* the document */
  expanded?: boolean;
  pageCount?: number | null;
  fileSize?: number | null;
  /** the library file's id, for the saved place this row advertises */
  itemId?: number | null;
}) {
  const [place, setPlace] = useState(1);
  const heavy = (fileSize ?? 0) >= HEAVY_BYTES;

  useEffect(() => {
    if (itemId === null) return;
    setPlace(getPdfPlace(`library-file:${itemId}`)?.page ?? 1);
  }, [itemId]);

  const facts = [
    pageCount ? `${pageCount} ${pageCount === 1 ? "page" : "pages"}` : null,
    formatBytes(fileSize) || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      {/* A book that *is* a PDF has no folder to read it in, so it still opens
          in place. Nothing in the library takes this path — it is `is_pdf_only`
          on a book, which no book currently is — and it keeps working the day
          one does. */}
      {expanded && !readHref ? (
        <PdfFallback url={url} title={title} />
      ) : (
        readHref && (
          <Link
            href={place > 1 ? `${readHref}?page=${place}` : readHref}
            className="block w-full rounded-xl border border-rule bg-card px-4 py-3 text-left"
            style={{ color: "var(--ws-ink)" }}
          >
            <span className="block text-sm font-semibold">
              {place > 1 ? `Resume on page ${place}` : "Read here"}
            </span>
            {facts && (
              <span className="mt-0.5 block text-xs font-medium text-ink-soft">
                {facts}
                {heavy && " · large file, slow on mobile data"}
              </span>
            )}
          </Link>
        )
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
          style={{ color: "var(--ws-ink)" }}
        >
          Open in a new tab
        </a>
        <a
          href={url}
          download
          className="inline-flex items-center gap-1 underline underline-offset-2"
          style={{ color: "var(--ws-ink)" }}
        >
          <DownloadIcon className="h-3.5 w-3.5" />
          <span>Download</span>
        </a>
      </div>
    </div>
  );
}
