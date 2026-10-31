"use client";

import { DownloadIcon } from "@/components/shell/icons";
import { useDownloadedBooks } from "@/lib/offline";

/**
 * A green download badge in the corner of a downloaded book's cover, so a
 * reader can tell from the shelf which books open offline. The glyph carries
 * the meaning, not the green alone, and screen readers hear "Downloaded".
 * A solid disc with the glyph in the card colour — white on the deep green
 * of the light themes, dark on the lifted green of dark — over any cover.
 */
export function DownloadedMark({ code }: { code: string }) {
  const downloaded = useDownloadedBooks();
  if (!downloaded.has(code)) return null;
  return (
    <span className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-success text-card shadow-sm ring-2 ring-card">
      <DownloadIcon className="h-4 w-4" />
      <span className="sr-only">Downloaded</span>
    </span>
  );
}
