import Link from "next/link";
import { FileList } from "@/components/library/FileList";
import { FindBar } from "@/components/library/FindBar";
import { FindResults } from "@/components/library/FindResults";
import { DoorRow } from "@/components/library/CollectionShell";
import { Sieve } from "@/components/library/Sieve";
import { filesSummary, languageInEnglish, totalRunTime } from "@/components/library/format";
import { CoverTile } from "@/components/shelf/CoverTile";
import { NavScope } from "@/components/shell/WorkspaceProvider";
import { CollectionHero, EmptyState, HeroPill, ShareButton } from "@/components/ui";
import { findLibrary, nodeChildren } from "@/lib/api";
import { RESOURCES_HUE, bookHue } from "@/lib/bookHue";
import {
  EMPTY_FIND,
  FIND_MIN_ROWS,
  isAsked,
  scopeSize,
  type FindState,
} from "@/lib/find";
import { nodeHref, type ShelfMap } from "@/lib/library";
import type { LibraryFindResponse, LibraryNode } from "@/lib/types";
import { avTab, libraryTab, libraryTabLabel, libraryWorkspace } from "@/lib/workspaceConfig";

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

  // A folder holding a recording of its own is one of the collections `/av`
  // lists — that page groups files under the folder each came from, so this is
  // the same test it makes, read from the other side. It decides two things:
  // where back goes, and which tab is lit.
  const isRecordings = files.some((f) => f.kind === "audio" || f.kind === "video");
  const ws = libraryWorkspace(node.workspace);
  /**
   * This shelf's own Audio/Video door, when it has one.
   *
   * Only Originals does. A folder of recordings used to send the reader to
   * `/av` whatever shelf it was on — so backing out of Resources' MP3 folder
   * landed them in Originals' recordings, a different workspace with a
   * different accent, having pressed a button that said "Audio/Video" when
   * they had arrived from Resources › Library.
   */
  const av = isRecordings ? avTab(ws) : null;
  const tab = av ?? libraryTab(ws);

  return (
    <>
      {/* Which tab a workspace-neutral `/library/<id>` stands under — the bar
          cannot tell from the path, and went dark on every collection. */}
      {!isShelf && tab && <NavScope href={tab} />}
      <Header
        node={node}
        shelves={shelves}
        isShelf={isShelf}
        isAlbum={isAlbum}
        isRecordings={isRecordings}
      />

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
          {/* The folders inside a collection, as the Audio/Video tab's list
              rows: tile, name, what it holds, how many files. It was a wider
              card carrying a provenance badge and a facts line of year ·
              place · language — and inside a collection every one of those
              read the same on every row, because they are inherited from the
              collection the reader is already standing in. What differs
              between these folders is their names and their descriptions, so
              those are what the row says. */}
          {children.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2.5">
              {children.map((child) => (
                <li key={child.id}>
                  <DoorRow
                    door={child}
                    rollup={find?.rollup ?? {}}
                    shelves={shelves}
                    withDescription
                  />
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
              <ul className="flex flex-col gap-2.5">
                {node.linked_children.map((card) => (
                  <li key={card.id}>
                    <DoorRow
                      door={card}
                      rollup={find?.rollup ?? {}}
                      shelves={shelves}
                      withDescription
                    />
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
            /* The shared portrait of Nagraj ji stands in for a still only where
               the recording is him — see `AlbumAudio`. On any other shelf the
               track wears the wave on that shelf's colour instead. */
            audioArt={ws === "originals" ? "portrait" : "glyph"}
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
  isRecordings,
}: {
  node: LibraryNode;
  shelves: ShelfMap;
  isShelf: boolean;
  isAlbum: boolean;
  /** this folder is one of the collections the A/V tab lists — see `NodeView` */
  isRecordings: boolean;
}) {
  const ws = libraryWorkspace(node.workspace);
  /** this shelf's own A/V door, when it has one — see `NodeView` */
  const av = isRecordings ? avTab(ws) : null;
  // A folder of recordings on Resources wears the shelf's purple rather than a
  // hue of its own: among textbooks and workshop notes, what a folder of geet
  // most needs to say is which shelf it is on. Everywhere else the id decides,
  // so one shivir folder still does not feel like the next.
  const hue =
    isRecordings && ws === "resources" ? RESOURCES_HUE : bookHue(`node-${node.id}`);
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
  //
  // A shelf root is dropped from it — "मूल ग्रंथ" over a 2005 sammelan was the
  // Originals shelf naming itself a third time, under an app bar and a tab
  // that both already say where the reader is. What the eyebrow is for is the
  // middle of a deep path, which no other control offers.
  const trail = node.breadcrumb.slice(0, -1).filter((step) => !shelves[step.id]);

  return (
    <CollectionHero
      tone={hue.to}
      /* Back goes where the reader came from, which for a collection of
         recordings is the A/V tab and not the folder above it. The tree step
         was literally true and useless: a reader arrives here off `/av`, and
         backing out of a 2005 sammelan into "वीडियो" — one of two filing
         folders under मूल ग्रंथ — put them somewhere they had never been, one
         more tap from where they were. The parent is still reachable; it is
         the eyebrow's job, on the paths deep enough to need it. */
      back={
        isShelf
          ? undefined
          : av
            ? { href: av, label: "Audio/Video" }
            : parent
              ? {
                  href: nodeHref(parent.id, shelves),
                  /* A shelf root is named for the tab it is, not for the folder
                     it happens to be: "मूल ग्रंथ" is what a manager called the
                     top of the tree, and a reader who tapped the workspace's
                     browse tab and then a collection expects that tab's own
                     name to be what takes them back — "Library" on Originals,
                     "Student Materials" here. Any other parent is a folder the
                     reader has actually seen, so it keeps its own name. */
                  label: shelves[parent.id] ? libraryTabLabel(ws) : parent.name,
                }
              : undefined
      }
      /* Both of the panel's ways *out* of this collection, in one place: the
         set where it also lives, and the link to this page. They were a row
         apart — the link sitting alone under the description, where it was the
         last thing on a panel that had already finished. */
      topRight={
        <div className="flex items-center gap-2">
          {node.external_url && <WholeSetLink url={node.external_url} />}
          <ShareButton title={node.name} />
        </div>
      }
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
              /* The same colour the hero behind it took, so the tile and the
                 panel are one object rather than two that happen to touch. */
              hue={hue}
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
      /* **Where it is from — year, place, language, and nothing else.**
         Three facts of one kind, which is what makes the line scannable: a
         reader takes it in as provenance-in-the-world rather than reading it.
         The language is named once and in English (`languageInEnglish`), since
         the interface is English and the label's own Devanagari half was the
         only Hindi in a line of numbers and place names. */
      meta={[node.year, node.place, languageInEnglish(node)].filter(Boolean).join(" · ") || undefined}
      /* **What is inside — as tags, because that is what a reader chooses on.**
         "19 Videos" was buried mid-line among the facts above, where the one
         number that says how big a commitment this is read like a footnote.
         It takes the chip the provenance had: every folder under मूल ग्रंथ is
         Original, so that badge said the same word on every screen a reader
         reached from this tab — and it is still on each file's own row, where
         it can actually differ. "N as text" keeps its place beside the count:
         same kind of fact, same shape. */
      chips={[
        filesSummary(files),
        // How many, then how long: the count is the number of decisions, the
        // hours are what they come to. On a fourteen-part shivir the second is
        // the one that decides whether tonight is the night.
        totalRunTime(files),
        readingCount > 0 ? `${readingCount} as text` : "",
      ].filter(Boolean)}
      description={node.description}
    />
  );
}

/**
 * "The whole set, where it also lives" — a YouTube playlist for a folder of
 * recordings.
 *
 * In the panel's top row next to Share, which is where the two controls that
 * leave this page belong. Two words rather than five: it is a small control on
 * a busy row now, and "the full series" was explaining itself to a reader who
 * is looking at the series.
 *
 * The arrow is the whole warning that this opens YouTube. Nothing else here
 * leaves the app, so it does not have to compete for notice.
 */
function WholeSetLink({ url }: { url: string }) {
  return <HeroPill href={url} external>Full series</HeroPill>;
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
