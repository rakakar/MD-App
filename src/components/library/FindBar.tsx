"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { CloseIcon, Icon } from "@/components/shell/icons";
import { findHref, MIN_QUERY_CHARS, type FindState } from "@/lib/find";

/**
 * The find bar — one box on a shelf or a folder, scoped to what is beneath it
 * (contract §13.8, `Catalogue_Search_v1.md` U1/U3/U14).
 *
 * **The box states its scope, never its category.** A reader should never have
 * to work out which of this app's three searches they want — catalogue,
 * citation, परिभाषा — so no new noun appears here. The placeholder names the
 * shelf or folder being searched, and the one line beneath it carries the only
 * boundary that matters: this reads what the library *records* about a thing,
 * not what is inside the file. Someone who does not know that reads an empty
 * result as "the library has nothing on this".
 *
 * The query rides in the URL rather than in state, so a search is a real
 * address (U9) and the chips beside it compose with it for free. Typing
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
}: {
  basePath: string;
  state: FindState;
  scope: string;
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
   * The URL can change without the box: the back button, "साफ़ करें", a chip
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

  /** something typed that has not been asked yet — what the button offers to do */
  const unasked = q.trim() !== state.q;

  return (
    <div className="mt-4">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          commit(q.trim());
          // Closes the phone keyboard, and hands the box back to the effect
          // above so a later back button can move it.
          inputRef.current?.blur();
        }}
        // No vertical padding of its own: the button carries the height now,
        // and `min-h-11` there comes to the same 44px the old `py-2.5` did.
        className="flex items-center gap-1 rounded-2xl border border-rule bg-white ps-1 pe-3 focus-within:border-(--ws-color)"
      >
        <button
          type="submit"
          aria-label={`${scope} में खोजें`}
          // The magnifier is the button rather than an ornament beside one:
          // it is already where a reader looks for search, and on a phone the
          // keyboard's own search key is the other way in (`enterKeyHint`).
          // It carries the workspace colour only when there is something
          // unasked in the box, so the one control that costs a round trip
          // says when it would actually do something.
          className={`flex min-h-11 shrink-0 items-center justify-center rounded-xl px-2.5 transition-colors ${
            unasked ? "text-(--ws-color)" : "text-ink-soft"
          }`}
        >
          <Icon
            name="search"
            className={`h-4.5 w-4.5 ${pending ? "animate-pulse" : ""}`}
          />
        </button>
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`${scope} में खोजें…`}
          aria-label={`${scope} में खोजें`}
          enterKeyHint="search"
          // The browser draws its own clear button inside a `type="search"`
          // box, in its own colour and with a 10px hit area. Ours is beside it
          // and does more — it empties the search as well as the box — so the
          // native one is two controls for one job, and the wrong one wins on
          // a phone because it is the harder of the two to hit.
          className="hi w-full bg-transparent text-base outline-none [&::-webkit-search-cancel-button]:appearance-none"
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              // Emptying the box has to empty the search too, or the rows stay
              // narrowed by a word that is no longer written anywhere.
              commit("");
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="flex min-h-11 shrink-0 items-center px-1 text-ink-soft transition-colors hover:text-ink"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        )}
      </form>
      <p lang="hi" className="hi mt-1.5 px-1 text-[11.5px] text-ink-soft">
        नाम, विषय, वर्ष, स्थान से — फ़ाइल के अंदर से नहीं।
      </p>
    </div>
  );
}
