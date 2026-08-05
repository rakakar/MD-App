import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PdfScreen } from "@/components/library/PdfScreen";
import { ApiError, getNode } from "@/lib/api";
import type { LibraryFile } from "@/lib/types";

export const revalidate = 900;
export const dynamicParams = true;

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * The file, found through the folder that holds it.
 *
 * There is no endpoint for a single file (§13.1) — a file is only ever
 * returned as part of its folder — so the folder is the address and the id is
 * the row within it. That is also why the URL carries both: it makes Back a
 * fact rather than a guess, and it inherits the publish rule for free, since a
 * folder that goes unpublished takes its files' URLs down with it.
 *
 * Cross-posted files count. A `linked_item` opens and reads in place exactly
 * like a native one (§13.6), and a reader who reached it through the folder it
 * was borrowed into should be able to read it there.
 */
async function load(
  rawId: string,
  rawFileId: string
): Promise<{ file: LibraryFile; nodeId: number; nodeName: string } | null> {
  const id = parseId(rawId);
  const fileId = parseId(rawFileId);
  if (id === null || fileId === null) return null;

  let node;
  try {
    node = await getNode(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }

  const file = [...node.items, ...node.linked_items].find((f) => f.id === fileId);
  // Anything but a PDF has no reader to open it in — a recording plays in its
  // folder, a photograph opens in the gallery there.
  if (!file || file.kind !== "pdf") return null;
  return { file, nodeId: node.id, nodeName: node.name };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; fileId: string }>;
}): Promise<Metadata> {
  const { id, fileId } = await params;
  const found = await load(id, fileId).catch(() => null);
  if (!found) return { title: "Document" };
  return {
    title: `${found.file.title} · ${found.nodeName}`,
    description: found.file.description || undefined,
    alternates: { canonical: `/library/${found.nodeId}/read/${found.file.id}` },
    // A reading screen is not a landing page — it is one file of a folder that
    // has its own, and two competing entries for the same document help nobody.
    robots: { index: false, follow: true },
  };
}

/**
 * One document, on the whole screen.
 *
 * `AppShell` drops the header and the bottom nav here, matched by
 * `PDF_READER_ROUTE` — see `lib/routes.ts` for why that is the rule rather
 * than a boxed viewer inside the library page.
 */
export default async function PdfReadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; fileId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id, fileId }, rawParams] = await Promise.all([params, searchParams]);

  const found = await load(id, fileId);
  if (!found) notFound();

  // `?page=` from a resume card. Read on the server and handed down: this
  // route prerenders, and a client component calling `useSearchParams` under a
  // prerendered tree builds in dev and fails in production.
  const raw = rawParams.page;
  const page = Number(Array.isArray(raw) ? raw[0] : raw);
  const openAt = Number.isSafeInteger(page) && page > 0 ? page : null;

  return (
    <PdfScreen
      file={found.file}
      backHref={`/library/${found.nodeId}`}
      openAt={openAt}
    />
  );
}
