import Link from "next/link";
import { FileList } from "@/components/library/FileList";
import { FindBar } from "@/components/library/FindBar";
import { FindResults } from "@/components/library/FindResults";
import { NodeCardView } from "@/components/library/NodeCard";
import { provenanceLabel } from "@/components/library/ProvenanceBadge";
import { Sieve } from "@/components/library/Sieve";
import { filesSummary, nodeFacts } from "@/components/library/format";
import { CoverTile } from "@/components/shelf/CoverTile";
import { CollectionHero, EmptyState, ShareButton } from "@/components/ui";
import { findLibrary, nodeChildren } from "@/lib/api";
import { bookHue } from "@/lib/bookHue";
import {
  EMPTY_FIND,
  FIND_MIN_ROWS,
  isAsked,
  scopeSize,
  type FindState,
} from "@/lib/find";
import { nodeHref, type ShelfMap } from "@/lib/library";
import type { LibraryFindResponse, LibraryNode } from "@/lib/types";

/**
 * One folder — **the same component at every depth**.
 *
 * `GET nodes/{id}/` returns an identical shape at depth 1 and depth 6, which
 * is what collapses the old three-screen flow (door page → collection card →
 * track list) into this. What used to be a "collection" is a folder that
 * happens to hold files; an audio series is a folder; a lone PDF needs no
 * wrapper at all.
 *
 * The recursion is by **route**, not by nesting: each level is its own URL and
 * its own fetch, which is what makes a deep link shareable and the back button
 * mean something. `children` is deliberately not enough to recurse without
 * another request.
 *
 * A large shivir folder is **searchable from inside it** (§13.8, U14): the box
 * and the chips are scoped to `under=<this folder>`, which is everything
 * beneath it, and asking anything swaps the browse below for a ranked find.
 */
export async function NodeView({
  node,
  state = EMPTY_FIND,
  basePath,
  shelves = {},
  /** the first breadcrumb step is the page's own title on a shelf, not a link */
  isShelf = false,
}: {
  node: LibraryNode;
  state?: FindState;
  /** this folder's own URL, for the box and the sieve's chip links */
  basePath: string;
  shelves?: ShelfMap;
  isShelf?: boolean;
}) {
  // Through the accessor, never `node.children` directly: when the pCloud
  // import forces `children` to be capped and paginated, that is the one place
  // it changes (§13.2).
  const children = nodeChildren(node);
  const files = [...node.items, ...node.linked_items];

  // `under` means this folder's **descendants**, so a folder holding only its
  // own files has nothing for the box to look into — the files are already on
  // screen, and a box that could never match them would be a lie. That is also
  // why an album gets no find: its whole content is the list below it.
  const scope = { under: node.id };
  const find: LibraryFindResponse | null =
    children.length > 0 ? await findLibrary({ ...scope, state }).catch(() => null) : null;
  // A folder is worth searching once there is more beneath it than a reader can
  // take in at a glance — and always while a find is already on, so a shared
  // link never hides the control that produced what is on screen.
  const searchable =
    find !== null && (scopeSize(find.facets) >= FIND_MIN_ROWS || isAsked(state));
  const finding = searchable && isAsked(state);

  // The album/index rule. A folder with no child folders and at least one file
  // is an album: a hero, a cover and the player, which is what a fourteen-part
  // shivir recording needs. A folder that holds folders is an index whatever
  // else is in it — its files list below them. Deterministic on purpose: a
  // rule that counted files against folders would flip an index into an album
  // the day someone added one more file, and the reader would experience that
  // as an app that changes its mind.
  const isAlbum = children.length + node.linked_children.length === 0 && files.length > 0;

  return (
    <>
      <Header node={node} shelves={shelves} isShelf={isShelf} isAlbum={isAlbum} />

      {searchable && find && (
        <>
          <FindBar basePath={basePath} state={state} scope={node.name} />
          <Sieve facets={find.facets} state={state} basePath={basePath} />
        </>
      )}

      {finding && find ? (
        <FindResults
          find={find}
          state={state}
          basePath={basePath}
          scope={scope}
          shelves={shelves}
        />
      ) : (
        <>
          {children.length > 0 && (
            <ul className="mt-4 flex flex-col gap-3">
              {children.map((child) => (
                <li key={child.id}>
                  <NodeCardView card={child} shelves={shelves} />
                </li>
              ))}
            </ul>
          )}

          {/*
            Cross-posted folders, kept apart from the folder's own children and
            never nested under it: a borrowed folder has exactly one home, and
            its card jumps there rather than pretending to live here (§13.6).
          */}
          {node.linked_children.length > 0 && (
            <section className="mt-7">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
                Also filed here
              </h2>
              <ul className="flex flex-col gap-3">
                {node.linked_children.map((card) => (
                  <li key={card.id}>
                    <NodeCardView card={card} shelves={shelves} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <FileList
            files={node.items}
            linked={node.linked_items}
            albumTitle={node.name}
            coverUrl={node.cover_url}
            folderProvenance={node.provenance}
          />

          {children.length === 0 && node.linked_children.length === 0 && files.length === 0 && (
            <EmptyFolder />
          )}
        </>
      )}
    </>
  );
}

/**
 * The coloured panel at the top of a folder — **one hero for both shapes**.
 *
 * The comps draw four of these screens (Audio Album, Video Album, folder list,
 * folder file list) and they are the same object: a back pill, a share button, a
 * title over its facts, a description, all on a panel in the collection's own
 * colour. What used to be here was two components with two paddings, two back
 * buttons and two ideas of how dark the gradient goes — an album got the panel
 * and an index of folders got plain text on the page, which is the one screen in
 * the library that looked like it belonged to a different app.
 *
 * The difference that survives is the **thumb**: an album has a cover and a
 * folder of folders does not. Everything else is the same slots, so
 * `ui/CollectionHero` draws it and this file only decides what goes in them.
 *
 * **The colour is the collection's own, never the workspace accent.** The comps
 * put a purple album and an orange one in the same set, which is `bookHue`'s
 * whole rule: a hue per thing, so one shivir folder does not feel like the next
 * when both are rows of Devanagari on one paper.
 */
function Header({
  node,
  shelves,
  isShelf,
  isAlbum,
}: {
  node: LibraryNode;
  shelves: ShelfMap;
  isShelf: boolean;
  isAlbum: boolean;
}) {
  const hue = bookHue(`node-${node.id}`);
  const parent = node.breadcrumb.at(-1);
  const files = [...node.items, ...node.linked_items];
  // The BE's count is over this folder's own files; a borrowed one is counted
  // where it lives. Adding the linked rows here is what makes the header match
  // the cards actually on the screen.
  //
  // `?? 0` is not defensive noise: this app deploys to Vercel and the API to a
  // VPS, so for a while a new build talks to an API that has never heard of
  // this field. Without it that window is `undefined + 0` — `NaN`, which is
  // falsy here by luck rather than by decision.
  const readingCount =
    (node.reading_count ?? 0) + node.linked_items.filter((f) => f.reading).length;

  // The path down to here, minus the step the back pill already offers. One
  // pill is the whole path on the comps' screens, which sit a level under a
  // shelf; four levels into a shivir it is the last step of six.
  const trail = node.breadcrumb.slice(0, -1);

  return (
    <CollectionHero
      tone={hue.to}
      back={
        parent && !isShelf
          ? { href: nodeHref(parent.id, shelves), label: parent.name }
          : undefined
      }
      topRight={<ShareButton title={node.name} />}
      thumb={
        isAlbum ? (
          <div className="w-24 shrink-0">
            <CoverTile
              book={{
                title_hi: node.name,
                cover_image: node.cover_url,
                code: `node-${node.id}`,
              }}
              size="grid"
            />
          </div>
        ) : undefined
      }
      eyebrow={
        trail.length > 0 ? (
          <nav aria-label="Breadcrumb" lang="hi" className="hi flex flex-wrap gap-x-1">
            {trail.map((step, i) => (
              <span key={step.id} className="flex items-center gap-x-1">
                {i > 0 && <span aria-hidden>/</span>}
                <Link href={nodeHref(step.id, shelves)} className="hover:underline">
                  {step.name}
                </Link>
              </span>
            ))}
          </nav>
        ) : undefined
      }
      title={node.name}
      meta={
        // Year · place · people · language, then what is actually inside, then
        // how much of it reads as text. That last one is stated rather than
        // left to be discovered a row at a time: a mixed folder is the normal
        // case and always will be — extraction is per file and proofreading is
        // its real cost — so a header that said nothing would imply the rows
        // are alike when the whole point is that they are not. Counted by the
        // BE over the folder, so a cross-posted text edition counts once.
        [nodeFacts(node), filesSummary(files), readingCount > 0 ? `${readingCount} as text` : ""]
          .filter(Boolean)
          .join(" · ") || undefined
      }
      /* The provenance rides on the folder too, not only on its card: this is
         the screen where someone actually reads or listens, and it is the last
         place to say whose word this is. */
      chips={[provenanceLabel(node.provenance)?.label ?? ""].filter(Boolean)}
      description={node.description}
      /* Conditional at the call site, not inside: an `actions` node that
         renders nothing still buys the slot's top margin. */
      actions={node.external_url ? <WholeSetLink url={node.external_url} /> : undefined}
    />
  );
}

/**
 * "The whole set, where it also lives" — a YouTube playlist for a folder of
 * recordings.
 *
 * Under the files rather than over them, and worded as *also*: every video is
 * here as its own item and plays here, so a link out offered first would send
 * a reader away from the thing they already have. It is for the reader who
 * wants the set in one piece, or wants it on the platform they keep it on.
 */
function WholeSetLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/30 px-3 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
    >
      <span>See the full series</span>
      <span aria-hidden>↗</span>
    </a>
  );
}

/**
 * A published folder with nothing in it yet.
 *
 * Legitimate rather than broken: the workspace roots and the seven doors ship
 * published so that content published *inside* them is visible at all, and a
 * manager-created folder cannot publish while empty (§13.3). So it says what
 * it is instead of being hidden — with the library still being filled, hiding
 * empties would make the shelf look like it does not exist.
 */
function EmptyFolder() {
  return (
    <div className="mt-6">
      <EmptyState
        title="Nothing published yet"
        hint="Material appears here as it is published into this folder."
      />
    </div>
  );
}
