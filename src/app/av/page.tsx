import type { Metadata } from "next";
import { SHELF_METADATA, AvShelfPage } from "./shelf";

export const revalidate = 900;

export const metadata: Metadata = SHELF_METADATA;

/**
 * `/av` with no query: prerendered. An address with a filter or a search in
 * it never reaches this file — it is rewritten to `find/` (see `shelf.tsx`).
 */
export default function Page() {
  return <AvShelfPage params={{}} />;
}
