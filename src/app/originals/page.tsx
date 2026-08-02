import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkspaceShelf } from "@/components/library/WorkspaceShelf";
import type { SieveSelection } from "@/components/library/Sieve";
import { WorkspaceScope } from "@/components/shell/WorkspaceProvider";
import { PageContainer } from "@/components/ui";
import { getNode, getTopics, getWorkspaces } from "@/lib/api";
import { shelfMap } from "@/lib/library";
import type { Topic } from "@/lib/types";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "सामग्री · मूल ग्रंथ",
  description:
    "A. Nagraj ji's recordings, photographs, letters and papers — everything in Originals that is not a book.",
};

/**
 * The मूल ग्रंथ library shelf — Originals' folders and files.
 *
 * Books are not here, and that is the point of it being its own page. Originals
 * has always had a books shelf at `/books`; what it never had was anywhere to
 * put a recording, a photograph or a letter, so those either went to संसाधन —
 * where they read as students' material rather than his own — or stayed on
 * pCloud. Content Model v3 §5 gave the workspace room for both; this is the
 * half that was missing.
 *
 * No format tabs. संसाधन draws them because one shelf holds its tree *and* its
 * books; here the books already have `/books` with its own genre chips and
 * resume rows, and a tab that merely jumps between two finished pages is a
 * worse control than the nav slot that already does it.
 */
export default async function OriginalsLibraryPage({
  searchParams,
}: {
  searchParams: Promise<SieveSelection>;
}) {
  const selection = await searchParams;

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
      <h1 className="font-display text-[26px] font-medium tracking-[-0.015em] lg:text-4xl">
        <span lang="hi" className="hi">सामग्री</span>
      </h1>
      <p lang="hi" className="hi mt-1 text-sm text-ink-soft">
        प्रवचन, चित्र, पत्र व दस्तावेज़ — ए. नागराज जी की अपनी सामग्री, ग्रंथों के अलावा।
      </p>

      <WorkspaceShelf
        root={root}
        selection={selection}
        topics={topics}
        shelves={shelves}
        basePath="/originals"
        emptyTitle="सामग्री अभी आ रही है"
        emptyHint="Recordings, photographs and documents appear here as they are published."
      />
    </PageContainer>
  );
}
