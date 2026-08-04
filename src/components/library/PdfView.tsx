"use client";

import { useState } from "react";
import { DownloadIcon } from "@/components/shell/icons";

/**
 * A PDF, read **in the app** — download offered, never forced (contract §13.4,
 * §13.9).
 *
 * The frame is the happy path and the links under it are the one that always
 * works. An embedded PDF is a mobile browser's weakest spot: some hand it to a
 * plugin, some render a blank box, and iOS Safari has historically shown only
 * the first page inside an iframe. So the fallback is *stated* rather than
 * hidden behind a failure we cannot detect from inside the frame.
 *
 * `mounted` gates the iframe on a tap for a collection's items: a shivir
 * bundle holding six PDFs would otherwise start six multi-megabyte downloads
 * on a phone the moment the page opened. A PDF-only book is the page itself,
 * so it opens expanded.
 */
export function PdfView({
  url,
  title,
  expanded = false,
}: {
  url: string;
  title: string;
  /** open the viewer immediately — for a page that *is* the document */
  expanded?: boolean;
}) {
  const [open, setOpen] = useState(expanded);

  return (
    <div>
      {open ? (
        <iframe
          src={url}
          title={title}
          className="h-[75vh] w-full rounded-xl border border-rule bg-white"
        />
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-xl border border-rule bg-white px-4 py-3 text-sm font-semibold"
          style={{ color: "var(--ws-ink)" }}
        >
          Read here
        </button>
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
