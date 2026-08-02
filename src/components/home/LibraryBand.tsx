import { NodeCardView } from "@/components/library/NodeCard";
import { SectionHeading, SeeAll } from "@/components/ui";
import { getNode, getWorkspaces, nodeChildren } from "@/lib/api";
import { shelfMap } from "@/lib/library";

/** How many doors the home band shows before it defers to the shelf. */
const SHOWN = 3;

/**
 * What Originals holds besides books, on the home page.
 *
 * The spec ran a pair of media cards here, pointing at the audio and video
 * shelves. Content Model v3 dissolved those — a recording is a file in a
 * folder now — and they were pulled rather than left pointing at nothing,
 * with the reason recorded on the page: a card promising "Discourse audio"
 * that opens an empty library is a worse home page than one card fewer.
 *
 * This is that slot filled, on the terms it was left on. It renders the
 * folders that actually exist rather than named kinds, so it can never promise
 * a shelf that is not there — and when Originals holds no folders at all it
 * draws nothing, which is the same rule that took the media cards away.
 */
export async function LibraryBand() {
  const workspaces = await getWorkspaces().catch(() => []);
  const rootId = workspaces.find((w) => w.code === "originals")?.root_node_id ?? null;
  if (rootId === null) return null;

  const [root, shelves] = await Promise.all([
    getNode(rootId).catch(() => null),
    shelfMap(),
  ]);
  if (!root) return null;

  const doors = nodeChildren(root);
  if (doors.length === 0) return null;

  return (
    <>
      <SectionHeading
        tier="title"
        action={
          doors.length > SHOWN ? <SeeAll href="/originals">All {doors.length}</SeeAll> : undefined
        }
      >
        <span lang="hi" className="hi">सामग्री</span>
      </SectionHeading>
      <ul className="flex flex-col gap-2">
        {doors.slice(0, SHOWN).map((door) => (
          <li key={door.id}>
            {/* `row`, not `door`: on home this sits under a book rail in a
                narrow column, where the large door card is a different page's
                furniture. */}
            <NodeCardView card={door} shelves={shelves} />
          </li>
        ))}
      </ul>
    </>
  );
}
