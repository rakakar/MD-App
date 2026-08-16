import { DoorCard } from "@/components/library/CollectionShell";
import { hidesDoor } from "@/components/library/WorkspaceShelf";
import { SectionHeading, SeeAll } from "@/components/ui";
import { findLibrary, getNode, getWorkspaces, nodeChildren } from "@/lib/api";
import { EMPTY_FIND } from "@/lib/find";
import { shelfMap } from "@/lib/library";
import type { FileKind } from "@/lib/types";

/**
 * How many doors the home band shows before it defers to the shelf.
 *
 * Two, and they are the two the shelf itself leads with — the compilations and
 * the recorded conversations, which between them are what a reader coming to
 * this library is looking for. Three tiles filled the row and made the third
 * one a decision nobody was asking to make on a home page; the band is a
 * signpost, and "Open" beside the heading is where the rest is.
 */
const SHOWN = 2;

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
        The shelf's own card, not a tile of this band's design. It was three
        stat tiles — a picture, a name and a bare number — which meant the
        first thing a reader ever saw of the library looked nothing like the
        library they arrived in one tap later. Same card, same counts, same
        two-up grid: crossing from here to `/originals` should feel like
        scrolling, not like changing app.

        The rule this band has always kept holds either way: it draws folders
        that exist, so it can never promise an empty shelf.
      */}
      <ul className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {doors.slice(0, SHOWN).map((door) => (
          <li key={door.id} className="contents">
            <DoorCard door={door} rollup={rollup} shelves={shelves} />
          </li>
        ))}
      </ul>
    </>
  );
}
