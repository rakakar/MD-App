"use client";

import { usePathname } from "next/navigation";

/**
 * The extra line a v2 resources link deserves.
 *
 * Client-side because the 404 page is static and only the browser knows which
 * URL was attempted. Without this, someone opening a shared collection link
 * from a WhatsApp group a month ago is told "not found" and has no idea the
 * library is still there under a different address.
 */
export function MovedNote() {
  const path = usePathname() ?? "";
  const wasCollection =
    path.startsWith("/resources/collections/") || path.startsWith("/resources/doors/");
  const wasFolder = path.startsWith("/resources/files");
  if (!wasCollection && !wasFolder) return null;

  return (
    <p className="mt-4 rounded-2xl border border-rule bg-card p-4 text-sm leading-relaxed">
      This link points into the library&apos;s old structure. Everything lives in
      one place now — open it from Resources, or search above.
      <span className="mt-1 block text-xs text-ink-soft">
        The library was reorganised into one folder tree; the old collection and
        door addresses do not map onto the new folders.
      </span>
    </p>
  );
}
