import Link from "next/link";
import { FileList } from "./FileList";
import { FindBar } from "./FindBar";
import { FindResults } from "./FindResults";
import { shelfTotals } from "./format";
import { NodeCardView } from "./NodeCard";
import { RailFacets } from "./RailFacets";
import { Sieve } from "./Sieve";
import { RailSlot } from "@/components/shell/Rail";
import { EmptyState } from "@/components/ui";
import { findLibrary, nodeChildren } from "@/lib/api";
import { isAsked, type FindState } from "@/lib/find";
import type {
  FacetValue,
  LibraryFindResponse,
  LibraryNode,
  LibraryRollup,
  Topic,
} from "@/lib/types";

/**
 * A workspace root, drawn as its contents.
 *
 * Lifted out of the संसाधन page once Originals started holding folders too
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
 * labelled संसाधन sitting inside संसाधन is an empty step.
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

  /**
   * Do the tiles already *are* the प्रकार axis?
   *
   * True only when every collection holding anything holds exactly one kind
   * and no two share one — on मूल ग्रंथ that is the case, and there the chip
   * row is five buttons that duplicate five tiles a thumb-width above them.
   * A shelf whose collections mix formats keeps the chips, because there the
   * two controls genuinely answer different questions.
   */
  const withItems = doors
    .map((d) => rollup[String(d.id)])
    .filter((r): r is NonNullable<typeof r> => (r?.items ?? 0) > 0);
  const kindsShown = withItems.flatMap((r) => r.kinds);
  const tilesAreTheKinds =
    withItems.length > 0 &&
    withItems.every((r) => r.kinds.length === 1) &&
    new Set(kindsShown).size === kindsShown.length;

  if (finding) {
    return (
      <>
        {/* Two copies of one set of controls, and only ever one of them on
            screen: `lg:hidden` here, and the rail itself `display:none` below
            `lg`. It buys the breakpoint back from JavaScript — no media query
            hook, no measuring, nothing to be wrong about between the server's
            HTML and the client's first paint — and it keeps every facet link in
            the document even before hydration moves the desktop copy. */}
        <div className="lg:hidden">
          <TopicDoors topics={topics} facets={find.facets.topic} />
        </div>
        <FindBar basePath={basePath} state={state} scope={root.name} />
        <div className="lg:hidden">
          <Sieve facets={find.facets} state={state} basePath={basePath} />
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
    // **The controls sit below the shelf on a phone and above it on a
    // desktop, and the reason is height rather than taste.** They used to be
    // above everywhere: roughly four hundred pixels of find and filter in
    // front of a reader who had asked for none of it, which on a phone put
    // the second collection below the fold. A reader arriving at a shelf is
    // browsing; find is what they reach for after looking.
    //
    // A desktop has no such scarcity — the whole grid clears in half a screen
    // — and there the same move backfires: it buries the filters *past* the
    // fold instead, where a reader has no reason to scroll looking for them.
    // So the order flips at `lg` rather than one placement losing somewhere.
    // Ordered in CSS and not in the markup, so the document still reads
    // shelf-then-controls for a screen reader on both.
    //
    // **Since the rail, this flip only governs the box.** छाँटें and विषय no
    // longer head the desktop page at all — they are standing chrome in the
    // left rail, where they cost the grid no height and stay put while the
    // reader moves down it. What is left in the flip is the find box, which
    // has nowhere else to be: the rail is 232px and this box takes a sentence.
    <div className="flex flex-col">
      <div className="order-1 lg:order-2">
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

      {/* The rule follows the block: a divider *above* the controls on a phone,
          where they trail the shelf, and *below* them on a desktop, where they
          head it. */}
      <div className="order-2 mt-7 border-t border-rule pt-5 lg:order-1 lg:mt-1 lg:mb-2 lg:border-t-0 lg:border-b lg:pt-0 lg:pb-5">
        <FindBar basePath={basePath} state={state} scope={root.name} />
        {/* The phone's copy. Hidden rather than moved at `lg` — see the note in
            the find branch above for why the breakpoint stays in CSS. */}
        <div className="lg:hidden">
          {find && (
            <Sieve
              facets={find.facets}
              state={state}
              basePath={basePath}
              hideAxes={tilesAreTheKinds ? ["kind"] : undefined}
            />
          )}
          <TopicDoors topics={topics} facets={find?.facets.topic} />
        </div>
      </div>

      {/* The desktop's copy, drawn for a 232px column and living in the rail.
          `tilesAreTheKinds` is deliberately not passed on: it suppressed प्रकार
          because five chips sat a thumb-width under five identical tiles, and in
          the rail they no longer do — see `RailFacets`. */}
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
 * counts folders and files together: a reader reading "247 सामग्री" means
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
      <p lang="hi" className="hi text-[11px] font-bold uppercase tracking-wide text-ink-soft">
        संग्रह
      </p>
      {total.items > 0 && (
        <p lang="hi" className="hi text-[11.5px] tabular-nums text-muted">
          {total.items} सामग्री
          {hours > 0 && ` · ${hours} घंटे`}
        </p>
      )}
    </div>
  );
}

/**
 * The विषय chips — a **door onto the whole library**, which is why tapping one
 * navigates away rather than narrowing what is on screen (contract §13.4).
 *
 * Kept outside the sieve for that reason, even though the find endpoint will
 * happily filter on विषय too: these leave the shelf, while a sieve chip stays.
 * One row that navigates, one block that narrows.
 *
 * **The counts come from the facets, not from `topics/`.** `node_count` counts
 * the folders a manager tagged *directly*, and every axis in this library is
 * inherited — so a शिविर branch tagged once at its root counted as one, and
 * this row read "अस्तित्व दर्शन 3" over a shelf where the chip actually
 * reaches fifty-nine. Two numbers for the same word, from two endpoints, on
 * one screen. `topics/` still supplies the row: it is the only thing that
 * knows the labels and the order a manager set, and it can add a विषय without
 * a deploy.
 *
 * Zero-count chips are hidden either way: a chip that filters to nothing is a
 * dead control, so a shelf whose विषय are all empty draws no row.
 */
function TopicDoors({ topics, facets }: { topics: Topic[]; facets?: FacetValue[] }) {
  const counts = new Map((facets ?? []).map((f) => [f.value, f.count]));
  const live = topics
    // Before the facets arrive there is nothing honest to show, so the row
    // falls back to "is this topic used anywhere at all" rather than printing
    // a number it cannot stand behind.
    .map((t) => ({ topic: t, count: counts.get(t.code) ?? 0 }))
    .filter(({ topic, count }) => (facets ? count > 0 : topic.node_count > 0))
    .sort((a, b) => a.topic.ordering - b.topic.ordering);
  if (live.length === 0) return null;

  return (
    <div className="mt-5">
      <p lang="hi" className="hi mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-soft">
        विषय — पूरी लाइब्रेरी में
      </p>
      <div className="flex flex-wrap gap-1.5">
        {live.map(({ topic, count }) => (
          <Link
            key={topic.code}
            href={`/library?topic=${encodeURIComponent(topic.code)}`}
            className="rounded-full border border-rule bg-white px-3 py-1 text-xs font-medium text-ink transition-colors hover:bg-black/[.03]"
          >
            {/* The one taxonomy label that arrives in Hindi and is shown as a
                manager typed it — they add topics without a deploy, so the FE
                cannot hold a label it has never seen. */}
            <span lang="hi" className="hi">
              {topic.name}
            </span>
            {count > 0 && <span className="ms-1 tabular-nums opacity-70">{count}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
