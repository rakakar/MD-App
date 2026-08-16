import Link from "next/link";
import { ContinueAv } from "./ContinueAv";
import { FileList } from "./FileList";
import { ActiveFindFilters, FindFilters } from "./FindFilters";
import { FindBar } from "./FindBar";
import { RailFacets } from "./RailFacets";
import { filesSummary, formatDuration } from "./format";
import { RailSlot } from "@/components/shell/Rail";
import { CountedSegmented, EmptyState, KindTile } from "@/components/ui";
import type { TileKind } from "@/components/ui/KindTile";
import { CollectionViewport } from "./CollectionViewport";
import {
  CollectionGridCard,
  CollectionListRow,
  CountedHeading,
} from "./CollectionShell";
import { VideoIcon, WaveformIcon } from "@/components/shell/icons";
import { chipCount, findHref, type FindAxis, type FindState } from "@/lib/find";
import { nodeHref, type ShelfMap } from "@/lib/library";
import { contentLang } from "@/lib/script";
import type {
  FileKind,
  LibraryFacets,
  LibraryFile,
  LibraryFindResponse,
  LocatedFile,
  Topic,
} from "@/lib/types";

/** the two kinds this page is, and the order they are offered in */
export const AV_KINDS: FileKind[] = ["audio", "video"];

/**
 * One page of recordings — the endpoint's own ceiling (`catalogue.MAX_LIMIT`).
 *
 * Asking for the cap rather than the default 25 is what lets a folder's files
 * arrive together: the grouping below can only gather what the request brought
 * back, and a fourteen-part shivir split across two pages would read as two
 * albums. At today's totals the whole workspace fits inside one page.
 */
export const AV_PAGE = 100;

/**
 * Everything in Originals a reader can listen to or watch, in one place.
 *
 * **A door, not a room.** Nothing here owns any content: this is
 * `?kind=audio|video` over the same library tree the Library tab browses, which
 * is the whole reason it can be trusted to stay right. The day a shivir folder
 * arrives holding a recording, a transcript and photographs, its recording
 * shows up here and the folder stays on the Library shelf — with nobody filing
 * anything twice, and no field for anybody to get wrong.
 *
 * **One request, two shapes: collections when browsing, files when searching.**
 *
 * This is the library's own browse/find switch, kept — but decided on a
 * different test, because the usual one cannot work here. Everywhere else
 * `isAsked` reads "no query and no chip"; on this tab a `kind` chip is always
 * on by construction, so that test would answer "searching" forever. What
 * counts here is whether the reader asked anything *besides* the two kinds this
 * page is: the Audio/Video segment is the page, not a filter on it.
 *
 * - **Browsing** (`/av`, `?kind=audio`, `?kind=video`) → the collections, as
 *   cards. Seven of them, about a screen and a half.
 * - **Finding** (a word typed, or a year/place/topic chip) → the files
 *   themselves, grouped under the folder each came from — because a reader who
 *   searched for "Anubhav" wants the recordings that match, and a page of
 *   folder cards would be hiding the answer behind one more tap.
 *
 * Both shapes come out of the **same response**: the find returns every A/V
 * file with its breadcrumb, and a file's breadcrumb ends with its own folder,
 * so the collections are grouped out of the rows already in hand. Switching
 * between the two costs nothing and can never disagree with itself.
 *
 * In find mode `FileList` draws each kind as the thing it is — audio through
 * the app's one player in album mode, video embedded — the same as on the
 * folder's own page.
 */
export function AvShelf({
  find,
  state,
  topics,
  shelves,
  basePath,
  offset,
}: {
  find: LibraryFindResponse;
  /** the find as asked, kind lock included — see `avFindState` */
  state: FindState;
  topics: Topic[];
  shelves: ShelfMap;
  basePath: string;
  offset: number;
}) {
  const groups = groupByFolder(find.results);
  const chosen = state.selection.kind ?? AV_KINDS;
  // Type is this page's segment control, so the sieve must neither draw it nor
  // count it — otherwise the panel reads "1 selected" for a chip the reader
  // never set and cannot reach.
  const facets = find.facets;
  const hideAxes: FindAxis[] = ["kind"];
  // Everything the reader has narrowed by *besides* the lock, which is what
  // decides whether there is anything to clear.
  const narrowed = chipCount({ ...state, selection: { ...state.selection, kind: [] } });
  const asked = narrowed > 0 || state.q.length > 0;

  return (
    <>
      {/* Above the controls, because it is the shortest path to the thing a
          returning reader came for — and drawn client-side from playheads, so
          it is simply absent for anyone who has not started anything. */}
      <ContinueAv sources={groups} />

      {/* The box and the Filters button first, the split under it — the comps'
          order, and the right one: "which of these" is a question about the
          results, so it belongs next to them rather than above the control that
          produces them. */}
      <FindBar
        basePath={basePath}
        state={state}
        scope="Audio and video"
        dense
        filters={
          <FindFilters
            topics={topics}
            facets={facets}
            state={state}
            basePath={basePath}
            itemCount={find.count}
            noun="recording"
            hideAxes={hideAxes}
          />
        }
      />

      <Segments facets={facets} chosen={chosen} state={state} basePath={basePath} />

      {/* What is on, between the controls and the count they produced — the
          comps' "filters active". Phone only: the rail below carries the
          desktop's copy of the same chips as standing chrome. */}
      <div className="lg:hidden">
        <ActiveFindFilters
          topics={topics}
          facets={facets}
          state={state}
          basePath={basePath}
          hideAxes={hideAxes}
        />
      </div>
      <RailSlot>
        <RailFacets
          facets={facets}
          topics={topics}
          state={state}
          basePath={basePath}
          hideAxes={hideAxes}
        />
      </RailSlot>

      {find.searched_as && (
        <p className="mt-2 text-xs text-ink-soft">
          Showing results for{" "}
          <span lang="hi" className="hi font-medium text-ink">
            {find.searched_as}
          </span>
          {" · "}
          <Link
            href={findHref(basePath, { ...state, raw: true })}
            className="underline underline-offset-2"
          >
            search as typed
          </Link>
        </p>
      )}

      {/* The count, which the browse hands to the layout switch to share a row
          with and a find prints on its own. */}
      {asked && find.count > 0 && (
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
          <span className="tabular-nums">{find.count}</span>{" "}
          {find.count === 1 ? "recording" : "recordings"}
          {groups.length > 1 && (
            <>
              {" · "}
              <span className="tabular-nums">{groups.length}</span> collections
            </>
          )}
        </p>
      )}

      {groups.length > 0 ? (
        asked ? (
          <div className="mt-2 flex flex-col">
            {groups.map((group) => (
              <FolderGroup key={group.id} group={group} shelves={shelves} />
            ))}
          </div>
        ) : (
          <CollectionLayout
            groups={groups}
            shelves={shelves}
            /* The Library shelf's heading, with the count moved under it
               rather than strung after it on the same line. The heading names
               what is below; the count is a fact *about* it, and at the same
               size and weight the two were competing to be read first. It also
               buys the width back: this row shares it with the layout switch,
               and on one line the pair truncated. */
            summary={
              <CountedHeading>
                {find.count > 0 && (
                  <>
                    <span className="tabular-nums">{find.count}</span>{" "}
                    {find.count === 1 ? "recording" : "recordings"}
                    {groups.length > 1 && (
                      <>
                        {" · "}
                        <span className="tabular-nums">{groups.length}</span> collections
                      </>
                    )}
                  </>
                )}
              </CountedHeading>
            }
          />
        )
      ) : (
        <div className="mt-6">
          <EmptyState
            title={asked ? "Nothing matches that" : "Nothing published yet"}
            hint={
              asked
                ? "Try a different word, or clear a filter."
                : "Recordings appear here as they are published into the library."
            }
          />
        </div>
      )}

      <Pager find={find} state={state} basePath={basePath} offset={offset} />
    </>
  );
}

/**
 * Audio · Video · everything — **the Type axis, promoted**.
 *
 * It is the same `kind` selection the sieve draws everywhere else, moved to the
 * top of the page and given the whole width, because here it is not one filter
 * among six: it is which of the two things this page is about the reader wants.
 * Counts come from the facet, which the endpoint computes ignoring the axis's
 * own selection — so "Audio 35" stays honest while Video is the one showing.
 */
function Segments({
  facets,
  chosen,
  state,
  basePath,
}: {
  facets: LibraryFacets;
  chosen: string[];
  state: FindState;
  basePath: string;
}) {
  const counts = new Map(
    (facets.kind ?? []).map((chip) => [chip.value, chip.count] as const)
  );
  const total = AV_KINDS.reduce((n, kind) => n + (counts.get(kind) ?? 0), 0);
  const options = [
    { key: "all", label: "All", count: total, kinds: AV_KINDS, icon: undefined },
    {
      key: "audio",
      label: "Audios",
      count: counts.get("audio") ?? 0,
      kinds: ["audio"],
      icon: <WaveformIcon className="h-4 w-4" />,
    },
    {
      key: "video",
      label: "Videos",
      count: counts.get("video") ?? 0,
      kinds: ["video"],
      icon: <VideoIcon className="h-4 w-4" />,
    },
  ];
  // One option is not a choice. A workspace holding only recordings and no
  // video should not be asked which of the two it wants.
  if (options.filter((o) => o.count > 0).length < 2) return null;

  return (
    <div className="mt-3">
      <CountedSegmented
        label="Audio or video"
        // Links, not state: a filtered shelf that is a real URL can be shared,
        // bookmarked and prerendered. "All" writes no `kind` at all rather than
        // both values — the page supplies the lock, and a bare `/av` is the
        // address worth sharing.
        value={
          chosen.length === AV_KINDS.length
            ? "all"
            : chosen.includes("audio")
              ? "audio"
              : "video"
        }
        segments={options.map((o) => ({
          value: o.key,
          label: o.label,
          count: o.count,
          icon: o.icon,
          href: findHref(basePath, {
            ...state,
            selection: {
              ...state.selection,
              ...(o.key === "all" ? { kind: undefined } : { kind: o.kinds }),
            },
          }),
        }))}
      />
    </div>
  );
}

interface FolderGroup {
  id: number;
  name: string;
  /** the path down to it, its own step excluded — the group heading is that */
  trail: { id: number; name: string }[];
  /**
   * Still `LocatedFile`, with the breadcrumb emptied rather than removed. The
   * group heading already says where these live, and `FileList` prints a
   * breadcrumb above every file that has one — so a fourteen-part shivir would
   * repeat its own heading fourteen times.
   */
  files: LocatedFile[];
}

/**
 * The rows, gathered back into the folders they came from, in the order the
 * ranking put them.
 *
 * A file's breadcrumb ends with its own folder (unlike a folder's, which stops
 * at its parent), so the last step *is* the album and everything before it is
 * where that album lives. Group order follows the first row of each group, so
 * the best match still leads the page.
 */
function groupByFolder(results: LibraryFindResponse["results"]): FolderGroup[] {
  const groups = new Map<number, FolderGroup>();
  for (const row of results) {
    // Folders never arrive while a kind chip is on — the endpoint drops them,
    // since a folder has no kind of its own — but the response type allows
    // them, and a page that assumed otherwise would break silently the day
    // that changes.
    if (row.type !== "file") continue;
    const file = row as { type: "file" } & LocatedFile;
    const steps = file.breadcrumb;
    const home = steps.at(-1);
    if (!home) continue;
    let group = groups.get(home.id);
    if (!group) {
      group = { id: home.id, name: home.name, trail: steps.slice(0, -1), files: [] };
      groups.set(home.id, group);
    }
    group.files.push({ ...file, breadcrumb: [] });
  }
  return [...groups.values()];
}

/**
 * One collection, as a card — **what browsing this tab actually shows**.
 *
 * The page opened every album inline to begin with, and the number that settled
 * it was 18,753 pixels: thirty screens of scrolling, seventy-three files and
 * thirty-eight video posters, with the twenty-hour collection at the bottom
 * behind fifty-four other things. A tab built to make recordings reachable had
 * become one long scroll.
 *
 * It was also the weaker of two drawings of the same thing. `/library/<id>`
 * gives an album its cover, its description, its provenance badge and its link
 * out to the full series; the inline copy here had none of those. So the card
 * goes there rather than trying to be it.
 *
 * No cover of its own: these are built from the file rows the find returned,
 * which carry their folder's id and name but not its artwork. The kind glyph
 * and its tint do the work instead — the same pair the Library shelf's tiles
 * use, and on this tab every collection is purely one kind or the other.
 */
function CollectionCard({ group, shelves }: { group: FolderGroup; shelves: ShelfMap }) {
  const kind = onlyKind(group);
  return (
    <CollectionGridCard
      href={nodeHref(group.id, shelves)}
      name={group.name}
      tile={<KindTile kind={kind} size="sm" />}
      chip={filesSummary(group.files)}
      chipTint={CHIP_TINT[kind]}
      note={collectionLength(group.files)}
    />
  );
}

/**
 * The collections, in whichever shape the reader last chose.
 *
 * A client boundary only for the toggle's own state — the cards and rows below
 * it stay server-rendered children, so choosing a layout re-renders two
 * wrappers rather than the shelf.
 */
function CollectionLayout({
  groups,
  shelves,
  summary,
}: {
  groups: FolderGroup[];
  shelves: ShelfMap;
  summary: React.ReactNode;
}) {
  return (
    <CollectionViewport
      summary={summary}
      grid={
        <ul className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
          {groups.map((group) => (
            <li key={group.id} className="contents">
              <CollectionCard group={group} shelves={shelves} />
            </li>
          ))}
        </ul>
      }
      list={
        <ul className="flex flex-col gap-2.5">
          {groups.map((group) => (
            <li key={group.id}>
              <CollectionRow group={group} shelves={shelves} />
            </li>
          ))}
        </ul>
      }
    />
  );
}

/**
 * One collection, as a row — the same object as `CollectionCard`, drawn for a
 * reader who is scanning names rather than looking at shapes.
 *
 * A card each rather than rows on one divided sheet, as the designer draws it:
 * the tile is large enough here to be the row's anchor, and a hairline between
 * two 100px rows would have read as a table. The grid is right when the tiles
 * differ from one another; on this tab they are the same glyph in one of two
 * tints, so a 165px column spends its width on artwork that carries almost
 * nothing while the name it needs wraps to three lines.
 */
function CollectionRow({ group, shelves }: { group: FolderGroup; shelves: ShelfMap }) {
  const kind = onlyKind(group);
  return (
    <CollectionListRow
      href={nodeHref(group.id, shelves)}
      name={group.name}
      tile={<KindTile kind={kind} size="xl" />}
      chip={filesSummary(group.files)}
      chipTint={CHIP_TINT[kind]}
      note={collectionLength(group.files)}
    />
  );
}

/**
 * The one kind a collection is, or `folder` where it is more than one.
 *
 * On this tab it is nearly always one — a shivir's recordings are all audio or
 * all video — which is what lets the tile and the count pill agree on a
 * colour. A mixed folder has no true glyph, and the folder mark is the honest
 * answer rather than picking whichever kind happened to be first.
 */
function onlyKind(group: FolderGroup): TileKind {
  const kinds = [...new Set(group.files.map((f) => f.kind))];
  return kinds.length === 1 ? kinds[0] : "folder";
}

/** the pill beside the tile takes the tile's own tint, from the same tokens */
const CHIP_TINT: Partial<Record<TileKind, string>> = {
  audio: "bg-kind-audio text-kind-audio-ink",
  video: "bg-kind-video text-kind-video-ink",
};

/** "21 hours", or minutes below one, or nothing where the BE has no durations.
 *  Both layouts print it, so both read it from here. */
function collectionLength(files: LibraryFile[]): string {
  const seconds = files.reduce((n, f) => n + (f.duration_seconds ?? 0), 0);
  const hours = seconds / 3600;
  if (hours >= 1) return `${Math.round(hours)} ${Math.round(hours) === 1 ? "hour" : "hours"}`;
  return seconds > 0 ? `${Math.max(1, Math.round(seconds / 60))} min` : "";
}

/** one folder's recordings, under a heading that says which folder and where */
function FolderGroup({ group, shelves }: { group: FolderGroup; shelves: ShelfMap }) {
  const duration = group.files.reduce((n, f) => n + (f.duration_seconds ?? 0), 0);

  return (
    <section className="border-b border-rule py-6 first:pt-4 last:border-0">
      {group.trail.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          lang="hi"
          className="hi mb-0.5 flex flex-wrap items-center gap-x-1 text-xs font-semibold text-ink-soft"
        >
          {group.trail.map((step, i) => (
            <span key={step.id} className="flex items-center gap-x-1">
              {i > 0 && <span aria-hidden>/</span>}
              <Link href={nodeHref(step.id, shelves)} className="hover:underline">
                {step.name}
              </Link>
            </span>
          ))}
        </nav>
      )}

      {/* The heading is a link, because the folder is where the rest of it is:
          its description, its photographs, its transcript — everything this
          page filtered away. */}
      <h2 className="text-base font-semibold leading-tight lg:text-lg">
        <Link
          href={nodeHref(group.id, shelves)}
          {...contentLang(group.name)}
          className="hover:underline"
        >
          {group.name}
        </Link>
      </h2>
      <p lang="hi" className="hi mt-0.5 text-xs text-ink-soft">
        {[filesSummary(group.files), formatDuration(duration)].filter(Boolean).join(" · ")}
      </p>

      <FileList files={group.files} albumTitle={group.name} />
    </section>
  );
}

/**
 * Pages, when the scope is bigger than one request can carry.
 *
 * `library/search/` caps a page at {@link AV_PAGE} rows and this asks for the
 * cap, so at today's seventy-odd recordings the whole shelf arrives in one
 * request and none of this renders. It exists so that stops being an
 * assumption: the day the import pushes Originals past the cap, the rest is a
 * link away rather than silently missing (U12).
 *
 * **Pages rather than the "Show more" the ranked lists use.** That control
 * appends, which is right for a flat list of rows and wrong here: a group is a
 * folder with its player, and appending across a page boundary would split one
 * album into two headed sections with no way for the reader to tell why. A page
 * is self-contained, and its address is shareable, which the append is not.
 */
function Pager({
  find,
  state,
  basePath,
  offset,
}: {
  find: LibraryFindResponse;
  state: FindState;
  basePath: string;
  offset: number;
}) {
  const shown = find.results.length;
  if (find.count <= AV_PAGE) return null;

  const href = (next: number) => {
    const query = new URLSearchParams(findHref(basePath, state).split("?")[1] ?? "");
    if (next > 0) query.set("offset", String(next));
    const q = query.toString();
    return q ? `${basePath}?${q}` : basePath;
  };
  const back = offset > 0 ? href(Math.max(0, offset - AV_PAGE)) : null;
  const forward = offset + shown < find.count ? href(offset + AV_PAGE) : null;

  return (
    <nav
      aria-label="Pages"
      className="mt-6 flex items-center justify-between gap-3 text-sm"
    >
      {back ? (
        <Link href={back} className="min-h-11 rounded-full border border-rule bg-card px-4 py-2.5 font-medium hover:bg-ink/[.03]">
          ← Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-xs tabular-nums text-ink-soft">
        {offset + 1}–{offset + shown} of {find.count}
      </span>
      {forward ? (
        <Link href={forward} className="min-h-11 rounded-full border border-rule bg-card px-4 py-2.5 font-medium hover:bg-ink/[.03]">
          Next →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
