"use client";

import { Sheet as BaseSheet } from "@/components/ui/Sheet";

/**
 * A sheet that belongs to the book.
 *
 * There is only one sheet in this app now — see `ui/Sheet` — and this is it
 * with the surface already chosen. The distinction exists because the book's
 * paper and the app's theme became separate settings: Contents, Theme &
 * Settings and Paribhasha are furniture inside the chapter and must be printed
 * on the same paper as it, while Display and Feedback belong to the shell and
 * would look broken in a book's colours.
 *
 * Kept as its own name rather than made a prop at every call site, because
 * "which world is this sheet in" is a fact about the component that opens it,
 * not a decision it should be re-making each time.
 */
export function Sheet(props: Omit<React.ComponentProps<typeof BaseSheet>, "surface">) {
  return <BaseSheet surface="reader" {...props} />;
}
