import type { Metadata } from "next";
import type { RawParams } from "@/lib/find";
import { SHELF_METADATA, AvShelfPage } from "../shelf";

export const revalidate = 900;

// Reached by rewrite, never linked: its address is `/av?…` in the bar. The
// canonical points there, and a direct visit to `/av/find` is kept out of
// search results as a duplicate.
export const metadata: Metadata = {
  ...SHELF_METADATA,
  alternates: { canonical: "/av" },
  robots: { index: false, follow: true },
};

/** `/av?…` with a filter or a search: rendered on request. See `../shelf.tsx`. */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  return <AvShelfPage params={await searchParams} />;
}
