import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Kitchen } from "@/components/design/Kitchen";

/**
 * **The design system, on one screen.**
 *
 * This exists so that agreeing a token with the designer takes a minute
 * instead of a screenshot round-trip: every colour, radius, shadow, type step
 * and shared component in the app is on this page, in every state, with a
 * control at the top for flipping the app theme and the book's paper
 * underneath them all.
 *
 * It is also the regression surface. A seventh reading surface, or a fifth
 * kind accent, is checked here once — rather than on nine screens, which is
 * how the four different lavenders happened.
 *
 * Development only. It has no place in the sitemap, in search, or in front of
 * a reader: nothing here is content, and half of it is deliberately drawn in
 * states the app never reaches.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function DesignPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Kitchen />;
}
