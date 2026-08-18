import { FileList } from "./FileList";
import { ActiveFindFilters, FindFilters } from "./FindFilters";
import { FindBar } from "./FindBar";
import { FindResults } from "./FindResults";
import { shelfTotals } from "./format";
import { CollectionViewport } from "./CollectionViewport";
import { CountedHeading, DoorCard, DoorRow } from "./CollectionShell";
import { PhotoStrip } from "./PhotoStrip";
import { RailFacets } from "./RailFacets";
import { RailSlot } from "@/components/shell/Rail";
import { EmptyState } from "@/components/ui";
import { findLibrary, nodeChildren } from "@/lib/api";
import { isAsked, scopeSize, type FindState } from "@/lib/find";
import type {
  FileKind,
  LibraryFacets,
  LibraryFindResponse,
  LibraryNode,
  LibraryRollup,
  NodeCard,
  Topic,
} from "@/lib/types";

/**
 * A workspace root, drawn as its contents.
 *
 * Lifted out of the Resources page once Originals started holding folders too
 * (Content Model v3 §5, D14): the two shelves ask the same question of the
 * same shape — the root's children as doors, over whatever files sit on the
 * root itself — and the second copy of two hundred lines is where they would
 * start to disagree.
 *
 * What stays per-workspace is only what a reader would notice: the address the
 * find writes into, and what an empty shelf says. Everything structural is the
 * same because the tree is the same tree.
 *
 * The root is never drawn as a card inside its own shelf (§10.1) — a card
 * labelled Resources sitting inside Resources is an empty step.
 *
 * **Browse and find are two different calls, and this is where the switch
 * lives** (§13.2, §13.4). With nothing typed and no chip on, the shelf is the
 * root's children — one level, cached, no breadcrumbs, exactly as before. The
 * moment anything is asked it becomes `library/search/`: the whole workspace,
 * deep, ranked, a path on every row. The sieve above is fetched either way,
 * because its counts describe the whole shelf and that is precisely what the
 * browse cannot answer.
 */
export async function WorkspaceShelf({
  root,
  state,
  topics,
  shelves,
  basePath,
  emptyTitle,
  emptyHint,
  hideKinds = [],
  searchScope = "library",
}: {
  root: LibraryNode;
  state: FindState;
  topics: Topic[];
  shelves: Record<number, string>;
  /** where the box and the chips write their query — this shelf's own address */
  basePath: string;
  emptyTitle: string;
  emptyHint: string;
  /**
   * Kinds this workspace has a tab of its own for, so the shelf does not offer
   * the same collections twice. Originals passes audio and video; nothing else
   * passes anything.
   *
   * **Opt-in per shelf, deliberately.** Applied everywhere, the day Resources
   * gained a folder of recordings it would vanish from Resources — and there is
   * no Audio/Video tab over there to catch it. A shelf may only hide what
   * something else in the same workspace is showing.
   *
   * See `hidesDoor` for why a *mixed* folder is never hidden.
   */
  hideKinds?: FileKind[];
  /**
   * What the box says it is looking inside — "Search {this}…".
   *
   * "library" everywhere by default, which is the interface's word for the
   * tree rather than the root folder's own name (see the note at the call
   * site below). Resources overrides it with the shelf's name, because there
   * the reader arrived by tapping a tab called Resources and a box offering to
   * search "library" reads as a different, larger place.
   */
  searchScope?: string;
}) {
  const files = [...root.items, ...root.linked_items];
  const scope = { workspace: root.workspace };

  // Losing the find must not lose the shelf: a failed request drops back to
  // the browse, which needs nothing from it.
  const find: LibraryFindResponse | null = await findLibrary({ ...scope, state }).catch(
    () => null
  );
  const finding = isAsked(state) && find !== null;

  const rollup: LibraryRollup = find?.rollup ?? {};

  // The doors, minus any whose whole contents belong to another tab. Done here
  // rather than on the endpoint because the answer is already in hand: `rollup`
  // says which kinds live under each card, all the way down.
  const doors = nodeChildren(root).filter(
    (door) => !hidesDoor(rollup[String(door.id)]?.kinds, hideKinds)
  );

  // How much is in scope right now: the match count once something has been
  // asked, and the size of the shelf before that. Both are the number the
  // filter panels print in their footer, and neither is a count the browse can
  // produce — `child_count` is shallow by contract.
  //
  // Counted off the Type facet where the shelf hides a kind, and by
  // `scopeSize`'s widest-axis estimate where it does not. Type is the one axis
  // every file answers exactly once, which makes its total the true file count
  // — and the only way to subtract what has moved to another tab without the
  // estimate's slack turning the difference into a number that is wrong rather
  // than merely cautious. A find is left alone either way: its `count` is of
  // rows actually returned.
  const kindCounts = find?.facets.kind ?? [];
  const countable = kindCounts.filter(
    (chip) => !hideKinds.includes(chip.value as FileKind)
  );

  // The sieve is offered the same shelf the tiles are. A Category row listing
  // "Audio 35" directly under a page that has just said recordings have a tab
  // of their own is the page contradicting itself in the same eyeful — and the
  // chip would drop the reader into a filtered Library showing exactly what the
  // Library is no longer for. Only these *values* go; the axis itself stays, so
  // PDFs and photographs are still siftable, and the search box is untouched
  // and still reaches every word in the workspace.
  const facets: LibraryFacets =
    hideKinds.length > 0 && find
      ? { ...find.facets, kind: countable }
      : (find?.facets ?? {});
  const inScope =
    hideKinds.length > 0 && kindCounts.length > 0
      ? countable.reduce((n, chip) => n + chip.count, 0)
      : scopeSize(find?.facets ?? {});
  const itemCount = finding ? find.count : inScope;

  if (finding) {
    return (
      <>
        {/* Two copies of one set of controls, and only ever one of them on
            screen: `lg:hidden` here, and the rail itself `display:none` below
            `lg`. It buys the breakpoint back from JavaScript — no media query
            hook, no measuring, nothing to be wrong about between the server's
            HTML and the client's first paint — and it keeps every facet link in
            the document even before hydration moves the desktop copy. */}
        <FindBar
          basePath={basePath}
          state={state}
          scope={searchScope}
          dense
          filters={
            <FindFilters
              topics={topics}
              facets={facets}
              state={state}
              basePath={basePath}
              itemCount={itemCount}
            />
          }
        />
        <div className="lg:hidden">
          <ActiveFindFilters
            topics={topics}
            facets={facets}
            state={state}
            basePath={basePath}
          />
        </div>
        <RailSlot>
          <RailFacets
            facets={facets}
            topics={topics}
            state={state}
            basePath={basePath}
          />
        </RailSlot>
        <FindResults
          find={find}
          state={state}
          basePath={basePath}
          scope={scope}
          shelves={shelves}
        />
      </>
    );
  }

  return (
    // **The controls head the shelf on every screen, and they are one row.**
    //
    // They were below the grid on a phone, and the reason was real: counted
    // over a whole shelf, six axes of chips ran to some five hundred pixels,
    // and open above the tiles that put the second collection off the bottom of
    // the screen. Moving the block to the foot fixed the fold and took the
    // search box with it — to the one place nobody looks for a search box, past
    // six collections, where a reader has no reason to believe one exists.
    //
    // The finished comps keep both and cost less than either: the box sits
    // under the title where a hand expects it, the Filters button sits beside
    // it, and everything the filters have to say is in a sheet that is not on
    // the page until it is asked for. See `FindFilters`. The desktop's copy of
    // the filters is standing chrome in the left rail, so this block is only
    // ever the box there.
    <div className="flex flex-col">
      {/* On a desktop the box joins the page's own header line, right-aligned
          against the shelf's weight, as the design draws it — a full-width
          search field over a 3-up grid is a form, not a page header. */}
      <div className="lg:mb-1 lg:flex lg:items-center lg:justify-between lg:gap-6 lg:border-b lg:border-rule lg:pb-4">
        <p className="hidden shrink-0 text-xs text-ink-soft lg:block">
          {itemCount > 0 && <span className="tabular-nums">{itemCount} items</span>}
          {itemCount > 0 && doors.length > 0 && " · "}
          {doors.length > 0 && (
            <span className="tabular-nums">{doors.length} collections</span>
          )}
        </p>
        <div className="lg:w-80 lg:shrink-0">
          <FindBar
            basePath={basePath}
            state={state}
            /* Not the root's own name. The box is scoped to this shelf either
               way; what changed is that it says so in the interface's language
               rather than printing मूल ग्रंथ at a reader who is standing on a
               tab labelled Library. */
            scope={searchScope}
            dense
            /* No facets, no filters: a failed find leaves the shelf standing and
               the browse needs nothing from it, but a button that opened onto an
               empty sheet would be worse than no button. */
            filters={
              find && (
                <FindFilters
                  topics={topics}
                  facets={facets}
                  state={state}
                  basePath={basePath}
                  itemCount={itemCount}
                />
              )
            }
          />
        </div>
      </div>

      <div className="lg:hidden">
        {find && (
          <ActiveFindFilters
            topics={topics}
            facets={facets}
            state={state}
            basePath={basePath}
          />
        )}
      </div>

      <div>
        {doors.length > 0 ? (
          /* The same switch the Audio/Video tab has, over the same two shapes.
             These are shelves of the same object — a folder, its name and how
             much is in it — and a reader crosses between the two tabs in one
             tap; the grid is right when the tiles differ from one another, and
             the list is right when the names are what is being scanned. */
          <CollectionViewport
            summary={<ShelfHeading doors={doors} rollup={rollup} />}
            grid={
              /* Two per row from the smallest phone up. A tile carries an icon,
                 a name and a weight — all of which survive half a screen — and
                 the shelf a reader came to browse fits on one screen instead of
                 scrolling past its own controls. */
              <ul className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
                {doors.map((door) => (
                  <li key={door.id} className="contents">
                    <DoorCard door={door} rollup={rollup} shelves={shelves} />
                  </li>
                ))}
              </ul>
            }
            list={
              <ul className="flex flex-col gap-2.5">
                {doors.map((door) => (
                  <li key={door.id}>
                    <DoorRow door={door} rollup={rollup} shelves={shelves} />
                  </li>
                ))}
              </ul>
            }
          />
        ) : (
          <div className="mt-5">
            <EmptyState title={emptyTitle} hint={emptyHint} />
          </div>
        )}

        {/* A file filed directly on the root — a lone PDF needs no wrapper
            now, so the shelf has to be able to hold one. */}
        {files.length > 0 && (
          <FileList files={root.items} linked={root.linked_items} albumTitle={root.name} />
        )}
      </div>

      {/* Below the grid, where the design puts it: a shelf's photographs are
          worth *seeing* rather than counting, and a folder named for them says
          nothing about what is in it. */}
      <PhotoStrip
        scope={scope}
        facets={find?.facets}
      />

      {/* The desktop's copy of the filters, drawn for a 232px column and living
          in the rail. */}
      {find && (
        <RailSlot>
          <RailFacets
            facets={facets}
            topics={topics}
            state={state}
            basePath={basePath}
          />
        </RailSlot>
      )}
    </div>
  );
}

/**
 * Whether a door belongs to another tab entirely — **all of it, or none of it**.
 *
 * `every`, never `some`, and that is the rule the whole split rests on. A
 * folder holding only recordings is the Audio/Video tab's, and showing it here
 * too would be the same collection on two tabs. A folder holding recordings
 * *and* a transcript *and* photographs belongs to both and stays: its
 * recordings surface on the other tab by kind, while the folder itself remains
 * where the rest of it can be found. That is the case the library is about to
 * be full of — a shivir arrives as one folder of mixed material — and hiding it
 * would put its transcript and its photographs nowhere.
 *
 * An unknown rollup means an unanswered question, and the safe answer to an
 * unanswered question is to show the folder.
 */
export function hidesDoor(kinds: FileKind[] | undefined, hidden: FileKind[]): boolean {
  if (hidden.length === 0 || !kinds || kinds.length === 0) return false;
  return kinds.every((kind) => hidden.includes(kind));
}

/**
 * What the grid below is, and how much of it there is.
 *
 * The total is summed from the rollups rather than taken from `count`, which
 * counts folders and files together: a reader reading "247 items" means
 * files, and folders are the furniture they are filed in.
 */
function ShelfHeading({
  doors,
  rollup,
}: {
  doors: NodeCard[];
  rollup: LibraryRollup;
}) {
  const total = shelfTotals(doors.map((d) => rollup[String(d.id)]));
  const hours = Math.round(total.duration / 3600);
  return (
    <CountedHeading>
      {total.items > 0 && (
        <>
          <span className="tabular-nums">{total.items}</span>{" "}
          {total.items === 1 ? "item" : "items"}
        </>
      )}
      {total.items > 0 && doors.length > 0 && " · "}
      {doors.length > 0 && (
        <>
          <span className="tabular-nums">{doors.length}</span> collections
        </>
      )}
      {hours > 0 && ` · ${hours} ${hours === 1 ? "hour" : "hours"}`}
    </CountedHeading>
  );
}

/**
 * One door, in the two shapes the switch offers — the Audio/Video tab's card
 * and row exactly, filled from what a library card knows.
 *
 * The **kind** decides the tile, and a folder holding more than one kind takes
 * the folder mark: there is no true glyph for a mixed collection, and the
 * folder icon on every tile is the folder icon on no tile. A cover a manager
 * chose wins over the glyph either way.
 *
 * The **chip** is the shallow summary a card already carries — "10 PDFs", "15
 * PDFs · 2 folders" — and the **note** beside it is the hours where the rollup
 * knows them, which on this shelf is a shivir's recordings seen from the
 * outside.
 */
