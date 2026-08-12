import Link from "next/link";
import { FindRow } from "@/components/library/FindRow";
import { MoreResults } from "@/components/library/MoreResults";
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
}: {
  find: LibraryFindResponse;
  state: FindState;
  basePath: string;
  /** what was searched — passed on so "Show more" asks the same question */
  scope: { workspace?: string; under?: number };
  shelves: ShelfMap;
}) {
  const { results, count } = find;

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft">
        <span>
          {count > 0 ? `${count} ${count === 1 ? "result" : "results"}` : "No results"}
        </span>
        {/* Desktop only. The phone's way out is the "Clear" beside the chips it
            clears, where the comps put it; this line would be a second one at
            the far edge of the same eyeful, saying a different number because
            it counts the query too. The rail's copy of the filters has no such
            row, so on a desktop this is still the only one. */}
        <span className="hidden lg:inline">
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
        <ul className="mt-3 divide-y divide-rule overflow-hidden rounded-2xl border border-rule bg-card">
          {results.map((row) => (
            <li key={`${row.type}-${row.id}`}>
              <FindRow row={row} shelves={shelves} />
            </li>
          ))}
          {/* Later pages append into this same list rather than starting a
              card of their own — one answer, however many taps it took. */}
          <MoreResults
            scope={scope}
            state={state}
            total={count}
            firstPage={results.length}
            shelves={shelves}
          />
        </ul>
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
                href={`/search?q=${encodeURIComponent(state.q)}`}
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
