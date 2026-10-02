import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PdfScreen } from "@/components/library/PdfScreen";
import { ApiError, getNode } from "@/lib/api";
import { journeyFolderHref } from "@/lib/routes";
import type { LibraryFile } from "@/lib/types";

export const revalidate = 900;
export const dynamicParams = true;

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** The file, found through the folder that holds it — see the library's own route. */
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
  return { title: `${found.file.title} · ${found.nodeName}` };
}

const one = (raw: string | string[] | undefined): string | undefined =>
  Array.isArray(raw) ? raw[0] : raw;

/**
 * **One PDF of a stage's folder, read inside My Journey.**
 *
 * The library's reader (`/library/[id]/read/[fileId]`) with the one thing that
 * differs: Back returns to the folder *under `/me`*, so the reader never
 * leaves the workspace. `PDF_READER_ROUTE` covers this path, which is what
 * drops the app chrome as it does there. Pages only — the text edition's
 * reader is the library's and its way back would be too.
 */
export default async function JourneyPdfPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; fileId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id, fileId }, rawParams] = await Promise.all([params, searchParams]);
  const found = await load(id, fileId);
  if (!found) notFound();

  const page = Number(one(rawParams.page));
  const openAt = Number.isSafeInteger(page) && page > 0 ? page : null;

  return (
    <PdfScreen
      file={{ ...found.file, reading: null }}
      backHref={journeyFolderHref(found.nodeId)}
      openAt={openAt}
    />
  );
}
