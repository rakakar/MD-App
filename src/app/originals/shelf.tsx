import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContinueDocument } from "@/components/library/ContinueDocument";
import { WorkspaceShelf } from "@/components/library/WorkspaceShelf";
import { WorkspaceScope } from "@/components/shell/WorkspaceProvider";
import { PageContainer } from "@/components/ui";
import { getNode, getTopics, getWorkspaces } from "@/lib/api";
import { readFind, type RawParams } from "@/lib/find";
import { shelfMap } from "@/lib/library";
import type { Topic } from "@/lib/types";

export const SHELF_METADATA: Metadata = {
  title: "Library · Originals",
  description:
    "A. Nagraj ji's recordings, photographs, letters and papers — everything in Originals that is not a book.",
};

/**
 * The Library shelf's body, shared by its two routes:
 *
 * - `page.tsx`, the bare `/originals` — prerendered with no query, served from the
 *   CDN. This is the address the tab bar opens, so nearly every visit.
 * - `find/page.tsx`, which `/originals?…` is rewritten to (next.config.ts) whenever
 *   the address carries a filter or a search — rendered on request, as the
 *   whole page used to be on every visit.
 *
 * Reading `searchParams` anywhere in a route makes all of it dynamic, so the
 * query-reading half had to be a route of its own rather than a branch here.
 */
/**
 * The Originals library shelf — its folders and files.
 *
 * Books are not here, and that is the point of it being its own page. Originals
 * has always had a books shelf at `/books`; what it never had was anywhere to
 * put a recording, a photograph or a letter, so those either went to Resources —
 * where they read as students' material rather than his own — or stayed on
 * pCloud. Content Model v3 §5 gave the workspace room for both; this is the
 * half that was missing.
 *
 * **Recordings are not here — they are on `/av`**, and this shelf is the rest of
 * the tree. Not because audio is a different kind of thing (it is an Item in
 * this same tree, and `/av` is a sieve over it, not a second home), but because
 * forty hours of his voice outgrew a tile on a grid. What leaves is decided by
 * what is actually inside each collection rather than by a list of ids — see
 * `hideKinds` — so a folder holding recordings *and* a transcript stays right
 * here, where the transcript can still be found.
 */
export async function OriginalsShelfPage({ params }: { params: RawParams }) {
  const state = readFind(params);

  // Started before the workspace list is awaited, not inside the Promise.all
  // below. Only `getNode` needs the root id; topics do not, and topics is the
  // slowest call the API has — so awaiting the workspace list first put its
  // whole round trip in front of the one request that was going to decide when
  // this page could render. `shelfMap()` asks for the workspace list again and
  // Next memoizes that within a render, so it costs nothing to start here too.
  const topicsPromise = getTopics().catch(() => [] as Topic[]);
  const shelvesPromise = shelfMap();

  const workspaces = await getWorkspaces().catch(() => []);
  const rootId = workspaces.find((w) => w.code === "originals")?.root_node_id ?? null;
  // Null while the root is unpublished, and then the whole shelf is hidden by
  // the same ancestor rule that hides any branch (§13.3).
  if (rootId === null) notFound();

  const [root, topics, shelves] = await Promise.all([
    getNode(rootId).catch(() => null),
    topicsPromise,
    shelvesPromise,
  ]);
  if (!root) notFound();

  return (
    <PageContainer size="shelf">
      <WorkspaceScope ws="originals" />
      {/* No "Originals" eyebrow, matching Audio/Video. It was here because
          "Library" alone does not say which shelf this is — but the app bar at
          the top of the screen says it, and the switcher inside that bar says
          it again, so this was the third telling on the way to a page chosen
          from the tab bar. */}
      {/* Above the shelf, for the same reason the Audio/Video tab puts its own
          there: it is the shortest path to the thing a returning reader came
          for. Drawn client-side from saved places, so it is simply absent for
          anyone who has not started a document.

          Documents read *as text* resume here too, and only here. This is the
          tab their editions live on, and the shelf's own rail is for the
          shelf's own books — see `ContinueDocument`. */}
      <WorkspaceShelf
        root={root}
        title="Library"
        description="Compilations, diaries, letters, articles and photos of Shri A. Nagraj."
        lead={<ContinueDocument />}
        state={state}
        topics={topics}
        shelves={shelves}
        basePath="/originals"
        hideKinds={["audio", "video"]}
        /* No Topic filter on this shelf. Type, Year and Place describe what a
           document *is*; topic is what somebody filed it under, and on a shelf
           of A. Nagraj's own papers it was a group the reader had to read past
           to reach the three that answer their question. It stays an axis the
           endpoint counts and a row every other shelf still draws. */
        hideAxes={["topic", "kind"]}
        /* Originals · Compilations under the box instead of PDFs · Images,
           and no Filters button (designer, 23 Oct 2026). Type goes from the
           rail too, so PDF-or-photo is not offered from the side after being
           taken out of the row. */
        chipAxis="provenance"
        filtersButton={false}
        emptyTitle="The library is on its way"
        emptyHint="Photographs, letters and documents appear here as they are published."
      />
    </PageContainer>
  );
}
