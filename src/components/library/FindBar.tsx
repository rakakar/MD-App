"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { SearchField } from "@/components/SearchField";
import { FindRow } from "@/components/ui";
import { findHref, MIN_QUERY_CHARS, type FindState } from "@/lib/find";

/**
 * The find bar — one box on a shelf or a folder, scoped to what is beneath it
 * (contract §13.8, `Catalogue_Search_v1.md` U1/U3/U14).
 *
 * **The box states its scope, never its category.** A reader should never have
 * to work out which of this app's three searches they want — catalogue,
 * citation, Paribhasha — so no new noun appears here. The placeholder names the
 * shelf or folder being searched, and the one line beneath it carries the only
 * boundary that matters: this reads what the library *records* about a thing,
 * not what is inside the file. Someone who does not know that reads an empty
 * result as "the library has nothing on this".
 *
 * The query rides in the URL rather than in state, so a search is a real
 * address (U9) and the chips beside it compose with it for free. It
 * `replace`s rather than pushes: a reader backing out of a search wants the
 * shelf they came from, not eleven keystrokes of it.
 *
 * **Nothing is searched until the reader asks for it.** This box was
 * search-as-you-type on a 350ms debounce, and on this endpoint that was the
 * wrong shape three times over. Every commit was a full server render of a
 * dynamic route, so a word cost three or four of them at ~1s each. Each one
 * scanned the whole visible tree, which is the cost that grows as the library
 * fills. And a Latin query buys a billed transliteration keyed on the exact
 * string, so `anubhav` was charged six times — once per prefix — for one
 * question.
 *
 * It also ate letters, which is how it was noticed. The box followed the URL,
 * the URL trailed the typing by a round trip, and a navigation landing late
 * wrote its stale query back into a box that had moved on: `anubhav` typed at
 * a phone's pace arrived as `anbhav`. Committing on submit removes the whole
 * class rather than patching it — there is no in-flight navigation while
 * anyone is typing, so there is nothing that can overwrite them.
 *
 * The chips are the deliberate contrast and stay instant: a chip tap *is* the
 * asking, so it navigates on the tap.
 */
export function FindBar({
  basePath,
  state,
  /** the shelf or folder this box looks inside — named, so the scope is visible */
  scope,
  dense = false,
  filters,
}: {
  basePath: string;
  state: FindState;
  scope: string;
  /**
   * The box is sharing a header line on a desktop, so the caption under it
   * drops there and keeps its phone. The line is worth its height where the
   * box is full-width under a title and reads as noise beside a page heading
   * — and a phone is where a reader most needs telling that this searches what
   * the library *records* about a thing rather than what is inside the file.
   */
  dense?: boolean;
  /**
   * The Filters button, which the comps draw on this same row rather than in a
   * block of its own beneath it — one row of chrome above the grid instead of
   * three, which is what puts the first collection on the first screen.
   *
   * A slot rather than a prop, because *whether* a page filters and *what it
   * filters by* are the caller's business; the box's business is that the two
   * controls share a line and that the button keeps its width when the largest
   * text size makes the box give.
   */
  filters?: React.ReactNode;
}) {
  const router = useRouter();
  /**
   * What is in the box. The only owner of it while the reader is typing —
   * `state.q` is what has been *asked*, which is a different thing and only
   * catches up when they submit.
   */
  const [q, setQ] = useState(state.q);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * The URL can change without the box: the back button, "Clear", a chip
   * that cleared the query. The box has to follow those or the two disagree
   * about what was searched.
   *
   * Guarded on focus, and that guard is the fix. A reader with the caret in
   * this box is the authority on what it says; nothing arriving from the
   * router may overwrite them mid-word. Submitting blurs, so their own search
   * still lands.
   */
  useEffect(() => {
    if (document.activeElement === inputRef.current) return;
    setQ(state.q);
  }, [state.q]);

  function commit(typed: string) {
    // Clearing is always worth a navigation — it is the way back to the shelf.
    // A query too short to search is not one (§13.8): the shelf it would
    // return to is the shelf already on screen, so the reader would press
    // search and watch a second of loading buy them nothing.
    if (typed !== "" && typed.length < MIN_QUERY_CHARS) return;
    if (typed === state.q) return;
    // `raw` is dropped on a new query: it is a correction to one rewrite, not
    // a setting the reader turned on for the session.
    startTransition(() => {
      router.replace(findHref(basePath, { ...state, q: typed, raw: false }), {
        scroll: false,
      });
    });
  }

  return (
    <div className={`mt-4 ${dense ? "lg:mt-0" : ""}`}>
      <FindRow
        search={
          <SearchField
            inputRef={inputRef}
            value={q}
            onChange={setQ}
            onSubmit={() => commit(q.trim())}
            onClear={() => {
              setQ("");
              // Emptying the box has to empty the search too, or the rows stay
              // narrowed by a word that is no longer written anywhere.
              commit("");
              inputRef.current?.focus();
            }}
            placeholder={`Search ${scope}…`}
            label={`Search ${scope}`}
            unasked={q.trim() !== state.q}
            pending={pending}
          />
        }
        /* The desktop keeps its filters as standing chrome in the left rail, so
           the button is a phone control and would be a second copy there. */
        filters={filters && <div className="lg:hidden">{filters}</div>}
      />
      <p className={`mt-1.5 px-1 text-xs text-ink-soft ${dense ? "lg:hidden" : ""}`}>
        By name, topic, year or place — not inside the files.
      </p>
    </div>
  );
}
