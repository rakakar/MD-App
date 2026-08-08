import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContinueDocument } from "@/components/library/ContinueDocument";
import { WorkspaceShelf } from "@/components/library/WorkspaceShelf";
import { WorkspaceScope } from "@/components/shell/WorkspaceProvider";
import { PageContainer } from "@/components/ui";
import { getNode, getTopics, getWorkspaces } from "@/lib/api";
import { readFind } from "@/lib/find";
import { shelfMap } from "@/lib/library";
import type { Topic } from "@/lib/types";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Library · Originals",
  description:
    "A. Nagraj ji's recordings, photographs, letters and papers — everything in Originals that is not a book.",
};

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
export default async function OriginalsLibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const state = readFind(await searchParams);

  const workspaces = await getWorkspaces().catch(() => []);
  const rootId = workspaces.find((w) => w.code === "originals")?.root_node_id ?? null;
  // Null while the root is unpublished, and then the whole shelf is hidden by
  // the same ancestor rule that hides any branch (§13.3).
  if (rootId === null) notFound();

  const [root, topics, shelves] = await Promise.all([
    getNode(rootId).catch(() => null),
    getTopics().catch(() => [] as Topic[]),
    shelfMap(),
  ]);
  if (!root) notFound();

  return (
    <PageContainer size="shelf">
      <WorkspaceScope ws="originals" />
      {/* The design's eyebrow. "Library" alone does not say which shelf this
          is; the tab that got here is four rows away at the foot of the
          screen, so the workspace is named above the title. */}
      <p className="text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
        Originals
      </p>
      <h1 className="mt-0.5 font-display text-[1.625rem] font-medium tracking-[-0.015em] lg:text-4xl">
        Library
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Photographs, letters and documents — A. Nagraj ji&apos;s own material,
        beyond the books. Recordings have a tab of their own.
      </p>

      {/* Above the shelf, for the same reason the Audio/Video tab puts its own
          there: it is the shortest path to the thing a returning reader came
          for. Drawn client-side from saved places, so it is simply absent for
          anyone who has not started a document.

          Documents read *as text* resume here too, and only here. This is the
          tab their editions live on, and the shelf's own rail is for the
          shelf's own books — see `ContinueDocument`. */}
      <ContinueDocument />

      <WorkspaceShelf
        root={root}
        state={state}
        topics={topics}
        shelves={shelves}
        basePath="/originals"
        hideKinds={["audio", "video"]}
        emptyTitle="The library is on its way"
        emptyHint="Photographs, letters and documents appear here as they are published."
      />
    </PageContainer>
  );
}
