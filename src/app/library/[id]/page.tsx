import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { NodeView } from "@/components/library/NodeView";
import { WorkspaceScope } from "@/components/shell/WorkspaceProvider";
import { PageContainer } from "@/components/ui";
import { ApiError, getNode } from "@/lib/api";
import { readFind } from "@/lib/find";
import { shelfMap } from "@/lib/library";
import { libraryWorkspace } from "@/lib/workspaceConfig";

export const revalidate = 900;
export const dynamicParams = true;

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * `?file=276&page=12` — a resume card's landing.
 *
 * A file has no page of its own (§13.6), so "continue reading a document"
 * has to mean opening the folder it lives in and pointing at it. Read here, on
 * the server, and handed down: this route prerenders, and reading the query
 * from the client component that needs it would put a `useSearchParams` under
 * a prerendered tree — which builds in dev and fails in production.
 *
 * Both halves must parse or neither is used; a link with one of them is not a
 * link this wrote.
 */
function readOpenFile(
  params: Record<string, string | string[] | undefined>
): { id: number; page: number } | null {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const id = Number(one(params.file));
  const page = Number(one(params.page));
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  if (!Number.isSafeInteger(page) || page <= 0) return null;
  return { id, page };
}

/**
 * A folder is visible only while it *and every one of its ancestors* is
 * published, so a 404 here is an ordinary answer rather than a failure:
 * un-publishing one folder hides its whole branch and links into it start
 * 404ing, which is the intended safety net (contract §13.3).
 */
async function load(raw: string) {
  const id = parseId(raw);
  if (id === null) return null;
  try {
    return await getNode(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const node = await load(id).catch(() => null);
  if (!node) return { title: "Library" };
  const trail = node.breadcrumb.map((s) => s.name).join(" · ");
  return {
    title: trail ? `${node.name} · ${trail}` : node.name,
    description: node.description || undefined,
    alternates: { canonical: `/library/${node.id}` },
    openGraph: {
      title: node.name,
      description: node.description || undefined,
      images: node.cover_url ? [node.cover_url] : undefined,
    },
  };
}

/**
 * One folder of the library, at any depth.
 *
 * The URL is workspace-neutral on purpose (§13.2): one tree spans four
 * workspaces, and a Connect brochure sitting at a `/resources/…` address would
 * be a URL that lies. The chrome still follows the shelf, because the node
 * says which workspace it belongs to.
 */
export default async function LibraryNodePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, rawParams, shelves] = await Promise.all([
    params,
    searchParams,
    shelfMap(),
  ]);
  const state = readFind(rawParams);

  const node = await load(id);
  if (!node) notFound();

  // A workspace root has a shelf of its own and that is its address; two URLs
  // for one folder would split its links and its cache for nothing. Permanent,
  // because it is a canonical-URL rule rather than a condition that may change
  // — a crawler should file the shelf, not this.
  const shelf = shelves[node.id];
  if (shelf) permanentRedirect(shelf);

  return (
    <PageContainer size="shelf">
      <WorkspaceScope ws={libraryWorkspace(node.workspace)} />
      <NodeView
        node={node}
        state={state}
        basePath={`/library/${node.id}`}
        shelves={shelves}
        openFile={readOpenFile(rawParams)}
      />
    </PageContainer>
  );
}
