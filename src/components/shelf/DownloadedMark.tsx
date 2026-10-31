"use client";

import { DownloadIcon } from "@/components/shell/icons";
import { useDownloadedBooks } from "@/lib/offline";

/**
 * A download icon in green on a card-coloured disc, in the corner of a
 * downloaded book's cover, so a reader can tell from the shelf which books
 * open offline. The glyph carries the meaning, not the green alone, and
 * screen readers hear "Downloaded". The card disc and hairline are what make
 * it read over any cover, in any theme.
 */
export function DownloadedMark({ code }: { code: string }) {
  const downloaded = useDownloadedBooks();
  if (!downloaded.has(code)) return null;
  return (
    <span className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-rule bg-card shadow-sm">
      <DownloadIcon className="h-4 w-4 text-success" />
      <span className="sr-only">Downloaded</span>
    </span>
  );
}
