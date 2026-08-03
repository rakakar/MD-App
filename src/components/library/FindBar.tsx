"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CloseIcon, Icon } from "@/components/shell/icons";
import { findHref, type FindState } from "@/lib/find";

/** long enough that a Devanagari word is not searched three times mid-syllable */
const DEBOUNCE_MS = 350;

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
  const [q, setQ] = useState(state.q);
  const inputRef = useRef<HTMLInputElement>(null);
  /**
   * What has already been asked — the query the URL is showing.
   *
   * Two things need it. A keystroke that lands back where it started (typing a
   * letter and deleting it) must not fire a navigation. And the URL can change
   * without the box — a chip tap, "साफ़ करें", the back button — in which case
   * the box has to follow, or the two disagree about what was searched.
   */
  const [committed, setCommitted] = useState(state.q);
  if (committed !== state.q) {
    setCommitted(state.q);
    setQ(state.q);
  }

  function commit(typed: string) {
    setCommitted(typed);
    // `raw` is dropped on a new query: it is a correction to one rewrite, not
    // a setting the reader turned on for the session.
    router.replace(findHref(basePath, { ...state, q: typed, raw: false }), {
      scroll: false,
    });
  }

  useEffect(() => {
    const typed = q.trim();
    if (typed === committed) return;
    const t = setTimeout(() => commit(typed), DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, committed]);

  return (
    <div className="mt-4">
      <form
        role="search"
        onSubmit={(e) => {
          // Enter closes the phone keyboard and commits at once, rather than
          // reloading the page as a bare form would.
          e.preventDefault();
          commit(q.trim());
          inputRef.current?.blur();
        }}
        className="flex items-center gap-2 rounded-2xl border border-rule bg-white px-4 py-2.5 focus-within:border-(--ws-color)"
      >
        <Icon name="search" className="h-4.5 w-4.5 shrink-0 text-ink-soft" />
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`${scope} में खोजें…`}
          aria-label={`${scope} में खोजें`}
          enterKeyHint="search"
          className="hi w-full bg-transparent text-base outline-none"
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="shrink-0 text-ink-soft transition-colors hover:text-ink"
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
