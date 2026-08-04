"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/shell/icons";
import { EmptyState } from "@/components/ui";
import { getParibhasha, type ParibhashaPage } from "@/lib/api";
import type { ParibhashaWord } from "@/lib/types";
import { DefinitionText, useDefinitionSegments } from "./DefinitionText";
import { DefinitionCount, DefinitionList } from "./WordTrail";

/**
 * The Devanagari letter index. Written out rather than derived from the data: a letter
 * with nothing behind it today gets a word tomorrow, and a row that changes
 * shape between visits is harder to use than one dead chip.
 */
const LETTERS = [
  "अ", "आ", "इ", "ई", "उ", "ऊ", "ऋ", "ए", "ऐ", "ओ", "औ",
  "क", "ख", "ग", "घ", "च", "छ", "ज", "झ", "ट", "ठ", "ड", "ढ", "ण",
  "त", "थ", "द", "ध", "न", "प", "फ", "ब", "भ", "म",
  "य", "र", "ल", "व", "श", "ष", "स", "ह",
];

/**
 * The glossary page (contract §14.1).
 *
 * Two ways in, and they behave differently on purpose. Browsing by letter is
 * paginated, so it walks. Searching is not — the BE answers a `q` with one
 * screenful and stops, because a dictionary search that needs a second page
 * has already failed to find the word.
 *
 * The letter is the URL's business and typing is not: an index the reader can
 * link to and come back to is worth a navigation, while rewriting the address
 * on every keystroke would remount this component and take the keyboard away
 * mid-word. A `?q=` arriving from elsewhere is still honoured on load.
 */
export function GlossaryBrowser({
  initial,
  q = "",
  letter,
}: {
  initial: ParibhashaPage;
  q?: string;
  letter?: string;
}) {
  const [query, setQuery] = useState(q);
  const [rows, setRows] = useState<ParibhashaWord[]>(initial.results);
  const [next, setNext] = useState<string | null>(initial.next);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  // The server already fetched the results for the q/letter in the URL —
  // re-running the effect on mount would throw that away and fetch it again.
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    const term = query.trim();
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setBusy(true);
      setError(false);
      try {
        // An emptied box goes back to browsing wherever the reader was.
        const page = await getParibhasha(term ? { q: term } : { letter });
        setRows(page.results);
        setNext(page.next);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError(true);
          // The rows on screen answer the previous query. Leaving them under
          // a failure message reads as though they are results for this one.
          setRows([]);
          setNext(null);
        }
      } finally {
        setBusy(false);
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const loadMore = async () => {
    if (!next) return;
    setBusy(true);
    try {
      const page = await getParibhasha({ cursor: next });
      setRows((r) => [...r, ...page.results]);
      setNext(page.next);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const searching = query.trim().length > 0;

  return (
    <>
      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-rule bg-white px-4 py-2.5 focus-within:border-(--ws-color)">
        <Icon name="search" className="h-4.5 w-4.5 shrink-0 text-ink-soft" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search words… अनुभव, anubhav"
          aria-label="Search words"
          className="ui-hi w-full bg-transparent text-base outline-none"
        />
      </div>
      {/* Roman spelling is a first-class key on the BE, and it folds the
          spellings — anubhav, anubhaav and anubhava all arrive at अनुभव — so
          nobody has to switch keyboards to use this. Worth saying once. */}
      <p className="mt-2 text-xs text-ink-soft">
        Type in Devanagari or Roman spelling — both work.
      </p>

      {/* The letter index is a browsing control, so it steps aside while a
          search is on screen — it filters nothing that is showing. */}
      {!searching && (
        <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Letter index">
          <LetterChip href="/paribhasha" active={!letter} label="All" wide />
          {LETTERS.map((l) => (
            <LetterChip
              key={l}
              href={`/paribhasha?letter=${encodeURIComponent(l)}`}
              active={letter === l}
              label={l}
            />
          ))}
        </div>
      )}

      <div className="mt-5">
        {busy && rows.length === 0 && (
          <p className="text-center text-sm text-ink-soft">Searching…</p>
        )}
        {error && (
          <p className="text-center text-sm text-ink-soft">
            The glossary isn&apos;t available right now.
          </p>
        )}
        {!busy && !error && rows.length === 0 && (
          <EmptyState
            title={searching ? `No match for “${query.trim()}”` : "No words under this letter"}
            hint={
              searching
                ? "Try another spelling, or browse by letter."
                : "Pick another letter."
            }
          />
        )}

        {rows.length > 0 && (
          <ul className="flex flex-col gap-2">
            {rows.map((w) => (
              <WordRow key={w.id} word={w} />
            ))}
          </ul>
        )}

        {next && (
          <button
            type="button"
            onClick={loadMore}
            disabled={busy}
            className="mt-4 w-full rounded-2xl border border-rule bg-white px-4 py-3 text-sm font-medium disabled:opacity-50"
            style={{ color: "var(--ws-ink)" }}
          >
            <span>{busy ? "Loading…" : "More words"}</span>
          </button>
        )}
      </div>
    </>
  );
}

function LetterChip({
  href,
  active,
  label,
  wide,
}: {
  href: string;
  active: boolean;
  label: string;
  wide?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`flex h-10 items-center justify-center rounded-xl border text-sm font-medium ${
        wide ? "px-3" : "w-10"
      } ${active ? "border-transparent text-white" : "border-rule bg-white text-ink"}`}
      style={active ? { background: "var(--ws-color)" } : undefined}
    >
      <span lang="hi" className="hi">
        {label}
      </span>
    </Link>
  );
}

/**
 * One entry. It opens in place rather than navigating: this is a list people
 * scan, and paying a page load to read two lines would make scanning it
 * impossible. `/paribhasha/{id}` still exists for sharing one word.
 *
 * The headword is its own control rather than the whole card being one, so the
 * definitions underneath can carry their own buttons — the glossary terms
 * inside them. Nesting those in a card-wide button would be invalid markup and
 * would swallow every tap into "expand".
 */
export function WordRow({ word }: { word: ParibhashaWord }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const many = word.definitions.length > 1;
  const segments = useDefinitionSegments(word.definitions, word.hindi);

  return (
    <li className="overflow-hidden rounded-2xl border border-rule bg-white">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-baseline gap-2 px-4 pt-4 text-left"
      >
        <span lang="hi" className="hi text-base font-semibold">
          {word.hindi}
        </span>
        {word.hinglish && <span className="text-xs text-ink-soft">{word.hinglish}</span>}
        {/* Two definitions is a fact about the entry, not about the disclosure
            state, so it is on the row whether it is open or shut. */}
        {many && (
          <span className="ml-auto flex shrink-0 items-center gap-2">
            <DefinitionCount n={word.definitions.length} />
            <span
              aria-hidden
              className={`text-xs text-ink-soft transition-transform ${open ? "rotate-180" : ""}`}
            >
              ⌄
            </span>
          </span>
        )}
      </button>

      <div id={panelId} className="px-4 pb-4 pt-1">
        {/* Closed, the first definition still shows — for most entries it is
            the whole answer, and hiding it would make every row a click. */}
        {open || !many ? (
          <DefinitionList definitions={word.definitions} segments={segments} />
        ) : (
          word.definitions[0] && (
            <p lang="hi" className="hi line-clamp-3 text-[15px] leading-relaxed">
              <DefinitionText text={word.definitions[0]} segments={segments[0]} />
            </p>
          )
        )}
      </div>
    </li>
  );
}
