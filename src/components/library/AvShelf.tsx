import Link from "next/link";
import { ContinueAv } from "./ContinueAv";
import { FindTable } from "./FindTable";
import { ActiveFindFilters, FindFilters } from "./FindFilters";
import { FindBar } from "./FindBar";
import { RailFacets } from "./RailFacets";
import { albumSummary } from "./format";
import { RailSlot } from "@/components/shell/Rail";
import { EmptyState, KindTile } from "@/components/ui";
import type { TileKind } from "@/components/ui/KindTile";
import { KindChips, type KindChoice } from "./KindChips";
import {
  CollectionViewProvider,
  ProvidedView,
  ProvidedViewToggle,
} from "./CollectionLayout";
import { CollectionGridCard, CollectionListRow } from "./CollectionShell";
import { PageTitle } from "@/components/ui/PageTitle";
import { chipCount, findHref, type FindAxis, type FindState } from "@/lib/find";
import { splitAlbumName } from "@/lib/albumName";
import { nodeHref, type ShelfMap } from "@/lib/library";
import type {
  FileKind,
  LibraryAlbum,
  LibraryFacets,
  LibraryFindResponse,
  LocatedFile,
  Topic,
} from "@/lib/types";

/** the two kinds this page is, and the order they are offered in */
export const AV_KINDS: FileKind[] = ["audio", "video"];

/**
 * One page of recordings — the endpoint's own ceiling (`catalogue.MAX_LIMIT`).
 *
 * Only a search draws these files: browsing draws album cards from the
 * response's `albums`, which the BE counts over the whole match set. That is
 * the fix for the day Originals outgrew one page — 1,158 recordings, of which
 * the first hundred covered nine albums and cut the last one short. In browse
 * the page's files are still fetched, for `ContinueAv` to join playheads
 * against without a request of its own.
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
 *   folder cards would be hiding the answer behind one more tap. Drawn by the
 *   Library's own `FindTable`, so a search looks the same on both tabs.
 *
 * Both shapes come out of the **same response**. The cards are its `albums` —
 * every folder holding a matched file, counted by the BE over the whole match
 * set, so no album is missing or short however many pages of files there are.
 * The search groups are the page's own file rows, gathered under the folder
 * each breadcrumb ends with.
 *
 * **A search is a list to scan, not a player.** It used to open every matched
 * folder inline, with its player and a poster per video; a search for
 * "shivir" became screens of thumbnails. Now each row is a line — kind, title,
 * length, download — and the folder it opens is where it plays, as on the
 * Library's search.
 */
export function AvShelf({
  title,
  description,
  find,
  state,
  topics,
  shelves,
  basePath,
  offset,
}: {
  title: string;
  /** what the page holds — behind the title's `i`, not printed under it */
  description: string;
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
  // The state every link on this page is built from: the same, minus `kind`
  // when it is both kinds — the page's own lock rather than a reader's
  // choice. Spelled out, every search cleared or filter removed landed on
  // `/av?kind=audio&kind=video`, which is `/av` in a longer form; and since
  // any find key routes a shelf to its request-time render (next.config.ts),
  // that longer form also skipped the prerendered page. The "All" chip has
  // always written it this way; now the rest of the page agrees.
  const linkState: FindState =
    chosen.length === AV_KINDS.length && AV_KINDS.every((k) => chosen.includes(k))
      ? { ...state, selection: { ...state.selection, kind: undefined } }
      : state;
  // Type is this page's segment control, so the sieve must neither draw it nor
  // count it — otherwise the panel reads "1 selected" for a chip the reader
  // never set and cannot reach.
  const facets = find.facets;
  const hideAxes: FindAxis[] = ["kind"];
  // Everything the reader has narrowed by *besides* the lock, which is what
  // decides whether there is anything to clear.
  const narrowed = chipCount({ ...state, selection: { ...state.selection, kind: [] } });
  const asked = avAsked(state);
  // Browsing draws every album; a search draws the page's files grouped.
  const collections = asked ? [] : collectionsOf(find.albums, groups);
  const shown = asked ? groups.length : collections.length;

  // How much is here — on the title's line now, where it says what the page
  // holds, rather than on a heading of its own above the first collection.
  // One count, in one place: the search results used to print a second copy
  // of the same two numbers under the controls.
  const countLabel = `${find.count} ${find.count === 1 ? "recording" : "recordings"}`;
  const meta =
    find.count > 0 ? (
      // With filters on, a desktop says the count beside them instead — see
      // below — so it is said once.
      <span className={narrowed > 0 ? "lg:hidden" : undefined}>
        {countLabel}
        {shown > 1 && <> · {shown} collections</>}
      </span>
    ) : null;

  return (
    /* List first, for a reader who has never chosen. Every tile on this page
       is the same glyph in one of two tints, and the names — long, often
       Devanagari — are the content; the grid spent a 165px column on artwork
       that told them nothing while the name wrapped to three lines. */
    <CollectionViewProvider fallback="list">
      <PageTitle shelf title={title} description={description} meta={meta} />

      {/* Above the controls, because it is the shortest path to the thing a
          returning reader came for — and drawn client-side from playheads, so
          it is simply absent for anyone who has not started anything. */}
      <ContinueAv sources={groups} />

      {/* **Pinned under the app bar: the search, and the row that decides
          what is below it.** Seven collections run past the first screen and
          seventy-three files run a long way past it; changing Audios to
          Videos should not mean scrolling back up to find the chips. The
          app's one sticky-row recipe — the air is padding inside the box, and
          the box is opaque, so nothing scrolls through a gap above it. */}
      <div className="sticky top-(--app-header-h) z-30 -mx-4 mt-3 bg-surface px-4 pb-2 pt-2 sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-8 lg:px-8">
        <FindBar
          basePath={basePath}
          state={linkState}
          scope="Audio and video"
          placeholder="Search by name, topic, year…"
          dense
          filters={
            <FindFilters
              topics={topics}
              facets={facets}
              state={linkState}
              basePath={basePath}
              itemCount={find.count}
              noun="recording"
              hideAxes={hideAxes}
              iconOnly
            />
          }
        />

        {/* The kind chips and the layout toggle on one row: one says which
            recordings, the other how to lay them out, and both are about the
            results directly underneath. The toggle only when there is a
            layout to choose — a search draws each match grouped under its
            folder, which has one shape. */}
        <div className="mt-2.5 flex items-center gap-2">
          <AvKindChips facets={facets} chosen={chosen} state={linkState} basePath={basePath} />
          {!asked && collections.length > 0 && (
            <div className="ml-auto">
              <ProvidedViewToggle />
            </div>
          )}
        </div>
      </div>

      {/* What is on, between the controls and the count they produced — the
          comps' "filters active". Phone only: the rail below carries the
          desktop's copy of the same chips as standing chrome. */}
      <div className="lg:hidden">
        <ActiveFindFilters
          topics={topics}
          facets={facets}
          state={linkState}
          basePath={basePath}
          hideAxes={hideAxes}
        />
      </div>
      {/* Desktop: the count with the filters that made it, as removable
          chips — the designer's comp, 8 Oct 2026, as on the Library. */}
      {narrowed > 0 && (
        <div className="mt-2 hidden flex-wrap items-center gap-x-3 gap-y-2 text-xs text-ink-soft lg:flex">
          <span className="tabular-nums">{countLabel}</span>
          <ActiveFindFilters
            topics={topics}
            facets={facets}
            state={linkState}
            basePath={basePath}
            hideAxes={hideAxes}
            inline
          />
        </div>
      )}
      <RailSlot>
        <RailFacets
          facets={facets}
          topics={topics}
          state={linkState}
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
            href={findHref(basePath, { ...linkState, raw: true })}
            className="underline underline-offset-2"
          >
            search as typed
          </Link>
        </p>
      )}

      {shown > 0 ? (
        asked ? (
          <FindTable
            first={find.results}
            scope={{ workspace: "originals" }}
            state={linkState}
            total={find.count}
            shelves={shelves}
          />
        ) : (
          <div className="mt-3">
            <CollectionLayout collections={collections} shelves={shelves} />
          </div>
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

      {/* Browsing has every album on one page — except on a BE too old to send
          `albums`, where the cards are page-bound. A search pages itself, with
          the table's own "Show more". */}
      {!asked && !find.albums && (
        <Pager find={find} state={linkState} basePath={basePath} offset={offset} />
      )}
    </CollectionViewProvider>
  );
}

/**
 * Whether the reader asked anything besides the two kinds this page is — the
 * browse/find switch, and the page's reason to ignore `?offset=` on a search.
 */
export function avAsked(state: FindState): boolean {
  const narrowed = chipCount({ ...state, selection: { ...state.selection, kind: [] } });
  return narrowed > 0 || state.q.length > 0;
}

/** All · Audios · Videos — see `KindChips`, which the Library shelves share. */
function AvKindChips({
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
  const choices: KindChoice[] = [
    // "All" writes no `kind` at all rather than both values — the page
    // supplies the lock, and a bare `/av` is the address worth sharing.
    { key: "all", label: "All", count: total, values: undefined },
    { key: "audio", label: "Audios", count: counts.get("audio") ?? 0, values: ["audio"] },
    { key: "video", label: "Videos", count: counts.get("video") ?? 0, values: ["video"] },
  ];
  const active =
    chosen.length === AV_KINDS.length ? "all" : chosen.includes("audio") ? "audio" : "video";
  return (
    <KindChips label="Audio or video" choices={choices} active={active} state={state} basePath={basePath} />
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

/** what a card needs to know about its album — counts, not files */
type Collection = Pick<
  LibraryAlbum,
  "id" | "name" | "items" | "kinds" | "duration" | "session_type_label"
>;

/**
 * The cards: the BE's `albums` where it sent them, else the page's own groups
 * — a BE from before `albums` still draws a shelf, just a page-bound one.
 */
function collectionsOf(albums: LibraryAlbum[] | undefined, groups: FolderGroup[]): Collection[] {
  if (albums) return albums;
  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    items: group.files.length,
    kinds: [...new Set(group.files.map((f) => f.kind))],
    duration: group.files.reduce((n, f) => n + (f.duration_seconds ?? 0), 0),
    // A page of files does not carry its album's Type — only the BE's
    // `albums` does — so a card built this way simply has none to print.
    session_type_label: null,
  }));
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
 * No cover of its own: an album arrives as the find's `albums` entry — id,
 * name and counts, not its artwork. The kind glyph and its tint do the work
 * instead — the same pair the Library shelf's tiles use, and on this tab every
 * collection is purely one kind or the other.
 */
function CollectionCard({ album, shelves }: { album: Collection; shelves: ShelfMap }) {
  const kind = onlyKind(album.kinds);
  const { head, note } = albumLines(album);
  return (
    <CollectionGridCard
      href={nodeHref(album.id, shelves)}
      name={head}
      tile={<KindTile kind={kind} size="sm" />}
      chip={albumSummary(album.items, album.kinds)}
      chipTint={CHIP_TINT[kind]}
      note={note}
    />
  );
}

/**
 * The collections, in whichever shape the reader last chose.
 *
 * Both shapes are built here, on the server, and the provider picks one — so
 * choosing a layout swaps two already-rendered trees rather than re-rendering
 * the shelf. The toggle that drives it lives up in the sticky controls.
 */
function CollectionLayout({
  collections,
  shelves,
}: {
  collections: Collection[];
  shelves: ShelfMap;
}) {
  return (
    <ProvidedView
      grid={
        <ul className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
          {collections.map((album) => (
            <li key={album.id} className="contents">
              <CollectionCard album={album} shelves={shelves} />
            </li>
          ))}
        </ul>
      }
      list={
        <ul className="flex flex-col gap-2.5">
          {collections.map((album) => (
            <li key={album.id}>
              <CollectionRow album={album} shelves={shelves} />
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
function CollectionRow({ album, shelves }: { album: Collection; shelves: ShelfMap }) {
  const kind = onlyKind(album.kinds);
  const { head, note } = albumLines(album);
  return (
    <CollectionListRow
      href={nodeHref(album.id, shelves)}
      name={head}
      tile={<KindTile kind={kind} size="xl" />}
      chip={albumSummary(album.items, album.kinds)}
      chipTint={CHIP_TINT[kind]}
      note={note}
    />
  );
}

/**
 * The two lines of a collection card — **when and what it was** on top, the
 * album's own name and its length underneath.
 *
 *     Oct 1997 · शिविर
 *     [16 Audio]  Jeevan Vidya Ek Parichay · 11 hours
 *
 * The names are pCloud's and they are names of *people*, not of occasions —
 * "2008 12 Dec Praveen Atishi" tells a reader nothing they can choose on,
 * while "Dec 2008 · शिविर" is both questions answered at a glance. So the
 * heading is the date and the Type, and the name moves down beside the length
 * where it is still there for anyone looking for it by name.
 *
 * An album with neither date nor Type keeps its name as the heading, which is
 * every folder outside the recordings archive: no fact is invented to fill a
 * line, and nothing is printed twice.
 *
 * A video album keeps its name as the heading too. Those are named for the
 * occasion ("जीवन विद्या: एक परिचय", "2010 Nov Banda Sammelan"), so the name
 * is the thing to choose on, and "शिविर" alone over it said less than the line
 * it displaced (Raka, 16 Oct 2026).
 */
function albumLines(album: Collection): { head: string; note: string } {
  const { title, date } = splitAlbumName(album.name);
  const head = [date, album.session_type_label].filter(Boolean).join(" · ");
  const length = collectionLength(album.duration);
  if (onlyKind(album.kinds) === "video") {
    return { head: title, note: [head, length].filter(Boolean).join(" · ") };
  }
  if (!head) return { head: title, note: length };
  return { head, note: [title, length].filter(Boolean).join(" · ") };
}

/**
 * The one kind a collection is, or `folder` where it is more than one.
 *
 * On this tab it is nearly always one — a shivir's recordings are all audio or
 * all video — which is what lets the tile and the count pill agree on a
 * colour. A mixed folder has no true glyph, and the folder mark is the honest
 * answer rather than picking whichever kind happened to be first.
 */
function onlyKind(kinds: FileKind[]): TileKind {
  return kinds.length === 1 ? kinds[0] : "folder";
}

/** the pill beside the tile takes the tile's own tint, from the same tokens */
const CHIP_TINT: Partial<Record<TileKind, string>> = {
  audio: "bg-kind-audio text-kind-audio-ink",
  video: "bg-kind-video text-kind-video-ink",
};

/** "21 hours", or minutes below one, or nothing where the BE has no durations.
 *  Both layouts print it, so both read it from here. */
function collectionLength(seconds: number): string {
  const hours = seconds / 3600;
  if (hours >= 1) return `${Math.round(hours)} ${Math.round(hours) === 1 ? "hour" : "hours"}`;
  return seconds > 0 ? `${Math.max(1, Math.round(seconds / 60))} min` : "";
}

/**
 * Pages, when the scope is bigger than one request can carry.
 *
 * `library/search/` caps a page at {@link AV_PAGE} rows. Browsing needs this
 * only on a BE too old to send `albums`; a search no longer does, since
 * `FindTable`'s "Show more" folds later rows into the groups they belong to.
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
