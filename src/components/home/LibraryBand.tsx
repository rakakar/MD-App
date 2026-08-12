import { hidesDoor } from "@/components/library/WorkspaceShelf";
import { SectionHeading, SeeAll, StatTile } from "@/components/ui";
import type { TileKind } from "@/components/ui/KindTile";
import { nodeHref } from "@/lib/library";
import { findLibrary, getNode, getWorkspaces, nodeChildren } from "@/lib/api";
import { EMPTY_FIND } from "@/lib/find";
import { shelfMap } from "@/lib/library";
import type { FileKind } from "@/lib/types";

/** How many doors the home band shows before it defers to the shelf. */
const SHOWN = 3;

/**
 * What the Audio/Video tab is showing instead, so this band does not offer it
 * again — the same list `/originals` passes to `WorkspaceShelf`.
 */
const ON_THE_AV_TAB: FileKind[] = ["audio", "video"];

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

  const [root, shelves, find] = await Promise.all([
    getNode(rootId).catch(() => null),
    shelfMap(),
    // Only for the rollup. `nodes/` answers what the children *are*, but its
    // counts are shallow by contract — a folder holding folders reports
    // folders — and "is everything under this one a recording?" is a question
    // about the whole subtree. This is the same call `/originals` already makes
    // for its tiles, so the shelf and this band read one number.
    findLibrary({ workspace: "originals", state: EMPTY_FIND }).catch(() => null),
  ]);
  if (!root) return null;

  // Recordings have their own tab; showing their collections here as well would
  // put the same two folders on two tabs a thumb apart. A mixed folder stays —
  // see `hidesDoor`, which is where that rule lives for both surfaces.
  //
  // Without the rollup nothing is hidden, which is the safe way round: a band
  // briefly showing one folder too many beats one that silently drops content
  // whenever a request fails.
  const rollup = find?.rollup ?? {};
  const doors = nodeChildren(root).filter(
    (door) => !hidesDoor(rollup[String(door.id)]?.kinds, ON_THE_AV_TAB)
  );
  if (doors.length === 0) return null;

  return (
    <>
      <SectionHeading tier="title" action={<SeeAll href="/originals">Open</SeeAll>}>
        Library
      </SectionHeading>
      {/*
        Three tiles across, as the finished comps draw them — a number and what
        it counts, rather than the full folder cards this band used to show.
        On Home the Library is a signpost: the reader is deciding whether to go
        in, not choosing which folder, and three cards' worth of descriptions
        was answering the second question at the cost of the first.

        The comps' first tile counts a *kind* ("PDFs 64") and the other two
        count folders. We count folders only. A kind tile would have to promise
        a filtered view of the whole shelf that nothing on this shelf opens, and
        mixing the two units in one row of three is how a reader learns that
        numbers here cannot be compared. The rule this band has always kept
        holds: it draws folders that exist, so it can never promise an empty
        shelf.
      */}
      <ul className="grid grid-cols-3 gap-2.5">
        {doors.slice(0, SHOWN).map((door) => (
          <li key={door.id}>
            <StatTile
              href={nodeHref(door.id, shelves)}
              kind={tileKind(door.kinds)}
              // The comps' three tiles carry pictures, not glyphs — that is
              // a cover the manager set on the folder, not a hue anyone chose.
              cover={door.cover_url}
              label={door.name}
              // Deep, not shallow: the shallow count on a folder of folders is
              // the number of folders, which is the one number nobody wants
              // here. Falls back to what the card itself carries when the
              // rollup did not arrive.
              count={countLine(
                rollup[String(door.id)]?.items ?? door.item_count,
                door.child_count
              )}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

/** A tile takes the kind of what is inside it, when that is one thing. A mixed
 *  folder is a folder — there is no one true glyph for it. */
function tileKind(kinds: FileKind[]): TileKind {
  return kinds.length === 1 ? kinds[0] : "folder";
}

/** "64" where a folder holds files, "2 folders" where it holds only folders. */
function countLine(items: number, folders: number): string {
  if (items > 0) return String(items);
  return `${folders} ${folders === 1 ? "folder" : "folders"}`;
}
