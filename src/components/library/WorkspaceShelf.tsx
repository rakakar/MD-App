import { FileList } from "./FileList";
import { FilterCards } from "./FilterCards";
import { FindBar } from "./FindBar";
import { FindResults } from "./FindResults";
import { shelfTotals } from "./format";
import { NodeCardView } from "./NodeCard";
import { PhotoStrip } from "./PhotoStrip";
import { RailFacets } from "./RailFacets";
import { RailSlot } from "@/components/shell/Rail";
import { EmptyState } from "@/components/ui";
import { findLibrary, nodeChildren } from "@/lib/api";
import { isAsked, scopeSize, type FindState } from "@/lib/find";
import type {
  LibraryFindResponse,
  LibraryNode,
  LibraryRollup,
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
}: {
  root: LibraryNode;
  state: FindState;
  topics: Topic[];
  shelves: Record<number, string>;
  /** where the box and the chips write their query — this shelf's own address */
  basePath: string;
  emptyTitle: string;
  emptyHint: string;
}) {
  const doors = nodeChildren(root);
  const files = [...root.items, ...root.linked_items];
  const scope = { workspace: root.workspace };

  // Losing the find must not lose the shelf: a failed request drops back to
  // the browse, which needs nothing from it.
  const find: LibraryFindResponse | null = await findLibrary({ ...scope, state }).catch(
    () => null
  );
  const finding = isAsked(state) && find !== null;

  const rollup: LibraryRollup = find?.rollup ?? {};
  // How much is in scope right now: the match count once something has been
  // asked, and the size of the shelf before that. Both are the number the
  // filter panels print in their footer, and neither is a count the browse can
  // produce — `child_count` is shallow by contract.
  const itemCount = finding ? find.count : scopeSize(find?.facets ?? {});

  if (finding) {
    return (
      <>
        {/* Two copies of one set of controls, and only ever one of them on
            screen: `lg:hidden` here, and the rail itself `display:none` below
            `lg`. It buys the breakpoint back from JavaScript — no media query
            hook, no measuring, nothing to be wrong about between the server's
            HTML and the client's first paint — and it keeps every facet link in
            the document even before hydration moves the desktop copy. */}
        <FindBar basePath={basePath} state={state} scope={root.name} dense />
        <div className="lg:hidden">
          <FilterCards
            topics={topics}
            facets={find.facets}
            state={state}
            basePath={basePath}
            itemCount={itemCount}
          />
        </div>
        <RailSlot>
          <RailFacets
            facets={find.facets}
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
    // **The controls head the shelf on every screen, and the filters are shut.**
    //
    // They were below the grid on a phone, and the reason was real: counted
    // over a whole shelf, six axes of chips ran to some five hundred pixels,
    // and open above the tiles that put the second collection off the bottom of
    // the screen. Moving the block to the foot fixed the fold and took the
    // search box with it — to the one place nobody looks for a search box, past
    // six collections, where a reader has no reason to believe one exists.
    //
    // The designer's shape keeps both: the box sits under the title where a
    // hand expects it, and the filters are two closed rows that say what is
    // behind them rather than five hundred pixels that show it. See
    // `FilterCards`. The desktop's copy of the filters is standing chrome in
    // the left rail, so this block is only ever the box there.
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
          <FindBar basePath={basePath} state={state} scope={root.name} dense />
        </div>
      </div>

      <div className="lg:hidden">
        {find && (
          <FilterCards
            topics={topics}
            facets={find.facets}
            state={state}
            basePath={basePath}
            itemCount={itemCount}
          />
        )}
      </div>

      <div>
        {doors.length > 0 ? (
          <>
            <ShelfHeading doors={doors} rollup={rollup} />
            {/* Two per row from the smallest phone up. A tile carries an icon,
                a name and a weight — all of which survive half a screen — and
                the shelf a reader came to browse fits on one screen instead of
                scrolling past its own controls. */}
            <ul className="mt-2 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
              {doors.map((door) => (
                <li key={door.id} className="contents">
                  <NodeCardView
                    card={door}
                    variant="tile"
                    shelves={shelves}
                    rollup={rollup[String(door.id)]}
                  />
                </li>
              ))}
            </ul>
          </>
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
        basePath={basePath}
        state={state}
      />

      {/* The desktop's copy of the filters, drawn for a 232px column and living
          in the rail. */}
      {find && (
        <RailSlot>
          <RailFacets
            facets={find.facets}
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
  doors: { id: number }[];
  rollup: LibraryRollup;
}) {
  const total = shelfTotals(doors.map((d) => rollup[String(d.id)]));
  const hours = Math.round(total.duration / 3600);
  return (
    <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">Collections</p>
      {total.items > 0 && (
        <p className="text-xs tabular-nums text-ink-soft">
          {total.items} {total.items === 1 ? "item" : "items"}
          {hours > 0 && ` · ${hours} ${hours === 1 ? "hour" : "hours"}`}
        </p>
      )}
    </div>
  );
}
