"use client";

import { PdfFallback } from "@/components/library/PdfFallback";

/**
 * A **book** that is a PDF — the whole reading experience for one, until it
 * goes through the pipeline (contract §13.9).
 *
 * All this does now is hand the file over. It once did much more: it was the
 * library's PDF row *and* its viewer, opening a reader inline inside a card.
 * Both halves moved out and were the better for it — the row became
 * `PdfCard`, one tappable object per document, and reading became a route of
 * its own that owns the screen (`routes.ts`).
 *
 * A book cannot follow them, and that is not an oversight. Those two are built
 * on a **library file**: an id to save a place against and a folder to come
 * back to. A pdf-only book is addressed by book code and has neither, so it
 * has no place to remember and nowhere to return to — it is the page it is
 * already on. `PdfFallback` is exactly right for that: the browser's viewer
 * where the browser has one, the file handed to the phone's own reader where
 * it does not.
 *
 * Nothing takes this path today — no book is `is_pdf_only` — and it keeps
 * working on the day one is.
 */
export function PdfView({ url, title }: { url: string; title: string }) {
  return <PdfFallback url={url} title={title} />;
}
