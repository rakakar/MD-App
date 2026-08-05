import Link from "next/link";
import { ContinueAv } from "./ContinueAv";
import { FileList } from "./FileList";
import { FilterCards } from "./FilterCards";
import { FindBar } from "./FindBar";
import { RailFacets } from "./RailFacets";
import { filesSummary, formatDuration } from "./format";
import { RailSlot } from "@/components/shell/Rail";
import { EmptyState } from "@/components/ui";
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
 * **Always a find, never a browse.** Everywhere else in the library the FE
 * switches on `isAsked` — no query and no chip means browse one level through
 * `nodes/`. Here a chip is always on, by construction, so the page is always
 * the deep faceted search: audio and video from every depth of the workspace,
 * ranked, with the same sieve the shelves carry.
 *
 * **Grouped by the folder each file lives in**, which is what makes that
 * bearable. A flat ranked list turns a fourteen-part shivir into fourteen rows
 * that each say "भाग 3" and nothing else; the folder is the album, and every
 * row already carries the breadcrumb needed to rebuild it, so the grouping
 * costs no request. Within a group `FileList` draws each kind as the thing it
 * is — audio through the app's one player in album mode, video embedded — the
 * same as on the folder's own page.
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

      <Segments facets={facets} chosen={chosen} state={state} basePath={basePath} />

      <FindBar basePath={basePath} state={state} scope="Audio and video" dense />

      {/* One set of controls, drawn twice and only ever on screen once: the
          rail is `display:none` below `lg` and this copy is `lg:hidden`. Same
          arrangement as the shelves, for the same reason. */}
      <div className="lg:hidden">
        <FilterCards
          topics={topics}
          facets={facets}
          state={state}
          basePath={basePath}
          itemCount={find.count}
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

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft">
        <span className="tabular-nums">
          {/* Nothing at all when there is nothing — the empty state below says
              it once, and saying it twice in two different wordings reads as
              two separate facts. */}
          {find.count > 0 &&
            `${find.count} ${find.count === 1 ? "recording" : "recordings"}`}
          {groups.length > 1 && ` · ${groups.length} collections`}
        </span>
        {/* Clears the query and every chip **except the lock** — "clear" on this
            page means "show me all of it again", never "leave the page". */}
        {asked && (
          <Link
            href={findHref(basePath, {
              q: "",
              raw: false,
              selection: { kind: state.selection.kind ?? AV_KINDS },
            })}
            className="underline underline-offset-2"
          >
            Clear
          </Link>
        )}
      </div>

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

      {groups.length > 0 ? (
        <div className="mt-2 flex flex-col">
          {groups.map((group) => (
            <FolderGroup key={group.id} group={group} shelves={shelves} />
          ))}
        </div>
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
    { key: "all", label: "All", count: total, kinds: AV_KINDS },
    { key: "audio", label: "Audio", count: counts.get("audio") ?? 0, kinds: ["audio"] },
    { key: "video", label: "Video", count: counts.get("video") ?? 0, kinds: ["video"] },
  ];
  // One option is not a choice. A workspace holding only recordings and no
  // video should not be asked which of the two it wants.
  if (options.filter((o) => o.count > 0).length < 2) return null;

  return (
    <div
      role="group"
      aria-label="Audio or video"
      className="mt-3 flex gap-1.5 rounded-full border border-rule bg-card p-1"
    >
      {options.map((option) => {
        const on =
          chosen.length === option.kinds.length &&
          option.kinds.every((k) => chosen.includes(k));
        return (
          <Link
            key={option.key}
            href={findHref(basePath, {
              ...state,
              // "All" writes no `kind` at all rather than both values — the page
              // supplies the lock, and a bare `/av` is the address worth sharing.
              selection: {
                ...state.selection,
                ...(option.key === "all" ? { kind: undefined } : { kind: option.kinds }),
              },
            })}
            aria-current={on ? "true" : undefined}
            className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors"
            style={
              on
                ? { background: "var(--ws-color)", color: "#fff" }
                : { color: "var(--color-ink-soft)" }
            }
          >
            {option.label}
            <span className="text-xs tabular-nums opacity-75">{option.count}</span>
          </Link>
        );
      })}
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
