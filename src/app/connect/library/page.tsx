import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConnectNav } from "@/components/connect/ConnectNav";
import { FileList } from "@/components/library/FileList";
import { NodeCardView } from "@/components/library/NodeCard";
import { EmptyState, PageContainer } from "@/components/ui";
import { getNode, getWorkspaces, nodeChildren } from "@/lib/api";
import { shelfMap } from "@/lib/library";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Connect · सामग्री",
  description: "केंद्र, कार्यक्रम, संपर्क सूत्र और सहभागिता — Connect's own material.",
};

/**
 * The संपर्क shelf — the Connect workspace root, rendered as its contents.
 *
 * Same shape as `/resources`, on purpose: one library renderer, one card, one
 * `/library/[id]` behind every door (Content Model v3 D8). Connect got no
 * model of its own for this — a centre's material *is* a folder with a
 * description and a file or two — so nothing here special-cases a Connect
 * folder, and the doors link straight into the shared tree.
 *
 * This is a section rather than the workspace home because Connect's home is
 * the upcoming-events feed (PRD §8). Resources opens onto its doors because
 * Resources is nothing but its shelf.
 */
export default async function ConnectLibraryPage() {
  const workspaces = await getWorkspaces().catch(() => []);
  const rootId = workspaces.find((w) => w.code === "connect")?.root_node_id ?? null;

  // `root_node_id` is null when the root is unpublished — the whole shelf is
  // then hidden by the same rule that hides any branch (§13.3), the segment
  // that leads here is not drawn, and a direct visit gets the honest 404
  // rather than a page pretending to be empty.
  if (rootId === null) notFound();

  const [root, shelves] = await Promise.all([getNode(rootId).catch(() => null), shelfMap()]);
  if (!root) notFound();

  const doors = nodeChildren(root);
  const files = [...root.items, ...root.linked_items];

  return (
    <PageContainer size="shelf">
      <h1 className="font-display text-2xl font-medium">
        Connect · <span lang="hi" className="hi">सामग्री</span>
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Material that belongs to the centres and the work around them.
      </p>
      <div className="mt-3">
        <ConnectNav active="library" />
      </div>

      {doors.length > 0 ? (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {doors.map((door) => (
            <li key={door.id}>
              {/* Empty doors are shown, not hidden — the four ship published
                  and empty so that content published inside them is visible
                  (§13.3), and the card says "अभी कुछ नहीं" rather than a bare
                  0. Hiding them would make the shelf appear and disappear
                  under readers as managers file the first folder. */}
              <NodeCardView card={door} variant="door" shelves={shelves} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5">
          <EmptyState
            title="सामग्री अभी आ रही है"
            hint="Centre material appears here as it is published."
          />
        </div>
      )}

      {/* A file filed directly on the root — a lone notice needs no wrapper. */}
      {files.length > 0 && (
        <FileList files={root.items} linked={root.linked_items} albumTitle={root.name} />
      )}

      {/* केंद्र the folder and the centres directory are two different things:
          the directory carries an address and a map pin, this folder carries a
          centre's material. The line below points at the other one by name so
          neither page has to imply it is both. */}
      <p className="mt-6 text-sm text-ink-soft">
        Looking for addresses and directions?{" "}
        <Link href="/connect/centers" className="font-medium underline" style={{ color: "var(--ws-ink)" }}>
          The centres directory
        </Link>{" "}
        has contacts and map pins.
      </p>
    </PageContainer>
  );
}
