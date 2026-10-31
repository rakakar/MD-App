"use client";

import { CheckIcon } from "@/components/shell/icons";
import { useDownloadedBooks } from "@/lib/offline";

/**
 * "Saved" in the corner of a downloaded book's cover, so a reader can tell
 * from the shelf which books will open offline. Text and a check, not a
 * colour alone; on the card colour so it reads over any cover, in any theme.
 */
export function DownloadedMark({ code }: { code: string }) {
  const downloaded = useDownloadedBooks();
  if (!downloaded.has(code)) return null;
  return (
    <span className="absolute right-1.5 top-1.5 z-10 inline-flex items-center gap-1 rounded-full border border-rule bg-card px-2 py-0.5 text-xs font-semibold text-ink shadow-sm">
      <CheckIcon className="h-3.5 w-3.5 text-success" />
      Saved
    </span>
  );
}
