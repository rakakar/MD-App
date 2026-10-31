"use client";

import { CheckIcon } from "@/components/shell/icons";
import { useDownloadedBooks } from "@/lib/offline";

/**
 * A green tick on a pale green rounded square with a green edge, in the corner of a
 * downloaded book's cover, so a reader can tell from the shelf which books
 * open offline. The glyph carries the meaning, not the green alone, and
 * screen readers hear "Downloaded". Tinted and edged rather than white: on a
 * white tile with a hairline the tick read as an unticked checkbox.
 */
export function DownloadedMark({ code }: { code: string }) {
  const downloaded = useDownloadedBooks();
  if (!downloaded.has(code)) return null;
  return (
    <span className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-control border border-success bg-success-tint shadow-sm">
      <CheckIcon className="h-4 w-4 text-success" />
      <span className="sr-only">Downloaded</span>
    </span>
  );
}
