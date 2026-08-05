"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BackIcon, DownloadIcon } from "@/components/shell/icons";

/**
 * What a reader gets when the in-app reader cannot run.
 *
 * **An `<iframe>` is not a universal fallback.** Desktop Chrome, Firefox and
 * Safari render a PDF inline; **Chrome on Android has no inline PDF viewer at
 * all** and draws a grey placeholder, a percent-encoded URL and a Download
 * button. The first version of this shipped that to the platform most of these
 * readers use. `navigator.pdfViewerEnabled` is the standard answer to exactly
 * that question and is what decides here; where it says no, the file is handed
 * to the phone's own document app, which opens it properly.
 *
 * `detail` is the failure in the machine's own words, shown small. It is not
 * for the reader — it is for the screenshot. A PDF that dies instantly on one
 * make of phone and works on every desk is otherwise unreproducible, and
 * `ChunkLoadError` in a photo names the cause in one round trip instead of ten.
 */
export function PdfFallback({
  url,
  title,
  detail = null,
  backHref = null,
}: {
  url: string;
  title: string;
  detail?: string | null;
  /** shown as a way out when this is the whole screen rather than a card */
  backHref?: string | null;
}) {
  // Resolved in an effect: the server has no `navigator`, and guessing before
  // hydration would flash the wrong one.
  const [canFrame, setCanFrame] = useState<boolean | null>(null);
  useEffect(() => {
    setCanFrame(navigator.pdfViewerEnabled ?? false);
  }, []);

  if (canFrame === null) return null; // one paint, not two

  return (
    <div className={backHref ? "flex h-dvh flex-col bg-canvas" : undefined}>
      {backHref && (
        <div
          className="flex items-center gap-1 border-b border-rule bg-card px-2 py-2"
          style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top))" }}
        >
          <Link
            href={backHref}
            aria-label="Back"
            className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ color: "var(--ws-ink)" }}
          >
            <BackIcon />
          </Link>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</span>
        </div>
      )}

      <div className={backHref ? "flex-1 overflow-y-auto p-4" : undefined}>
        {canFrame ? (
          <iframe
            src={url}
            title={title}
            className={
              backHref
                ? "h-full w-full rounded-xl border border-rule bg-card"
                : "h-[75vh] w-full rounded-xl border border-rule bg-card"
            }
          />
        ) : (
          <div className="rounded-2xl border border-rule bg-card p-4">
            <p className="text-sm font-semibold">Opening this outside the app</p>
            <p className="mt-1 text-xs text-ink-soft">
              Your browser can&apos;t show a PDF inside a page, so this one opens
              in whichever app your phone uses for documents.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
                style={{ background: "var(--ws-color)" }}
              >
                Open the document
              </a>
              <a
                href={url}
                download
                className="inline-flex items-center gap-1.5 rounded-xl border border-rule px-4 py-2.5 text-sm font-semibold"
                style={{ color: "var(--ws-ink)" }}
              >
                <DownloadIcon className="h-4 w-4" />
                <span>Download</span>
              </a>
            </div>
          </div>
        )}

        <p className="mt-2 text-xs text-ink-soft">
          Read this way, your page isn&apos;t remembered and the app&apos;s theme
          doesn&apos;t apply. Reload to try the in-app reader again.
        </p>
        {detail && (
          <p className="mt-1 break-words font-mono text-[0.6875rem] leading-relaxed text-ink-soft opacity-70">
            {detail}
          </p>
        )}
      </div>
    </div>
  );
}
