import Link from "next/link";
import { FindTable } from "@/components/library/FindTable";
import { ClearFind } from "@/components/library/Sieve";
import { EmptyState } from "@/components/ui";
import { findHref, type FindState } from "@/lib/find";
import type { ShelfMap } from "@/lib/library";
import type { LibraryFindResponse } from "@/lib/types";

/**
 * What the find found — one ranked list, folders and files together
 * (contract §13.8).
 *
 * **One list, not two.** The endpoint mixes folders and files because the
 * reader's question mixes them: "अमरकंटक 2019 की audio कहाँ है?" is answered by
 * a folder some days and by a file others. Folders lead only at equal score —
 * ranking them above files unconditionally would put a page of weak name
 * matches ahead of the file whose title is exactly what was typed.
 *
 * This replaces the browse beneath it rather than filtering it in place: a
 * browse is one level with no breadcrumbs, a find reaches the whole scope and
 * puts a path on every row, and the two cannot be the same list.
 */
export function FindResults({
  find,
  state,
  basePath,
  scope,
  shelves,
  activeFilters,
}: {
  /**
   * Desktop: the filters that are on, as removable chips beside the count —
   * the designer's comp, 8 Oct 2026. They then carry the Clear, so the
   * line's own Clear steps aside.
   */
  activeFilters?: React.ReactNode;
  find: LibraryFindResponse;
  state: FindState;
  basePath: string;
  /** what was searched — passed on so "Show more" asks the same question */
  scope: { workspace?: string; under?: number };
  shelves: ShelfMap;
}) {
  const { results, count } = find;
  // With chips on the line, their own Clear is the way out; the line's would
  // be a second one. With only words in the box there are no chips, and it
  // stays.
  const chipsCarryClear =
    !!activeFilters && Object.values(state.selection).some((v) => (v?.length ?? 0) > 0);

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span>{count > 0 ? `${count} ${count === 1 ? "result" : "results"}` : "No results"}</span>
          {activeFilters && <span className="hidden lg:contents">{activeFilters}</span>}
        </span>
        {/* Desktop only. The phone's way out is the "Clear" beside the chips it
            clears, where the comps put it; this line would be a second one at
            the far edge of the same eyeful, saying a different number because
            it counts the query too. The rail's copy of the filters has no such
            row, so on a desktop this is still the only one. */}
        <span className={chipsCarryClear ? "hidden" : "hidden lg:inline"}>
          <ClearFind basePath={basePath} state={state} />
        </span>
      </div>

      {/*
        The box was searched in Devanagari after the reader typed Latin. Saying
        so matters twice over: without it, someone who typed "amarkantak" sees
        Hindi rows appear with no explanation, and someone whose word we
        rewrote wrongly has no way back to what they actually meant.
      */}
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

      {results.length > 0 ? (
        <FindTable first={results} scope={scope} state={state} total={count} shelves={shelves} />
      ) : (
        <NothingHere state={state} basePath={basePath} />
      )}
    </div>
  );
}

/**
 * Nothing matched — said honestly, and never as a dead end.
 *
 * A reader who asked the wrong search the wrong question should be moved to
 * the right one in a tap rather than handed a sentence explaining why they got
 * nothing. Two ways out: widen this shelf's box to the whole library, and — for
 * the reader who wanted "what did he say about अनुभव?" and typed it into a
 * catalogue box — the citation search that reads inside the books.
 */
function NothingHere({ state, basePath }: { state: FindState; basePath: string }) {
  return (
    // The app's own empty state, not a fourth drawing of one. It was a hand-made
    // dashed box here, a different hand-made one on Audio/Video and the shared
    // component everywhere else — three answers to a screen that has to say one
    // thing well.
    <div className="mt-4">
      <EmptyState
        title="Nothing matched this search"
        hint={
          state.q ? (
            <>
              <Link
                href={`/assistant?mode=books&q=${encodeURIComponent(state.q)}`}
                className="font-semibold underline underline-offset-2"
                style={{ color: "var(--ws-ink)" }}
              >
                Search the whole library
              </Link>
              {" — including inside the books"}
            </>
          ) : (
            <Link
              href={basePath}
              className="font-semibold underline underline-offset-2"
              style={{ color: "var(--ws-ink)" }}
            >
              Try removing a filter
            </Link>
          )
        }
      />
    </div>
  );
}
