"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { WordRow } from "@/components/paribhasha/GlossaryBrowser";
import { LibraryLane } from "@/components/library/LibraryLane";
import { SearchField } from "@/components/SearchField";
import { PageContainer } from "@/components/ui";
import { track } from "@/lib/analytics";
import { getParibhasha, getParibhashaIndex, search, searchLibrary } from "@/lib/api";
import {
  ensureFullGlossary,
  localGlossaryWords,
  searchGlossary,
} from "@/lib/glossary";
import { refToHref } from "@/lib/refs";
import type {
  ParibhashaHit,
  ParibhashaWord,
  LibrarySearchRow,
  SearchResponse,
  SearchResult,
} from "@/lib/types";

/**
 * v1 centre-slot Search (PRD §7). This component boundary is the future
 * assistant slot — keep everything inside so the v2 swap is internal.
 */

// A first page of ten, then the rest on request. The BE already sent them
// all, so "show more" is a reveal, not a fetch.
const FIRST_PAGE = 10;

/**
 * What the one box searches (design 2A). "All" is the ranked passage search
 * with the definition card on top; "Paribhasha" turns the same box into the
 * dictionary — live per keystroke, every matching word listed, nothing else.
 */
type SearchMode = "all" | "paribhasha";

export function SearchScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const [q, setQ] = useState(initialQ);
  const [mode, setMode] = useState<SearchMode>(
    params.get("mode") === "paribhasha" ? "paribhasha" : "all"
  );
  const [words, setWords] = useState<ParibhashaWord[] | null>(null);
  // "search as typed" — skips the BE's Hinglish→Devanagari rewrite. Resets on
  // every new query, because it is a correction to one rewrite, not a setting.
  const [raw, setRaw] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  /**
   * The Resources lane's own answer (contract §13.8). Kept in its own piece of
   * state, never folded into `response`, because the two are different kinds
   * of claim — see the note where the lane is rendered.
   */
  const [resources, setResources] = useState<LibrarySearchRow[] | null>(null);
  /**
   * The query the results on screen answer — what the box is compared against
   * to know whether there is anything left to ask. The response does not carry
   * it back, and `q` is what the reader is still typing, so neither can say.
   */
  const [asked, setAsked] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /**
   * **"All results" is asked for, never typed at.**
   *
   * This ran on a 300ms debounce, and every pause bought two paid calls: a
   * billed Devanagari rewrite keyed on the exact string, and an embedding for
   * the vector leg. So one word cost two or three of each, and the answers
   * were for `anu` and `anub` rather than for the word the reader had in mind.
   *
   * The embedding is the part that actually hurt. A reader gets 60 vector
   * searches an hour (`SEARCH_VECTOR_BUDGET_PER_HOUR`), and past that their
   * search silently drops to keyword-only — so spending three of them per
   * question meant semantic search quietly died after twenty. Asking once per
   * question is what makes that budget mean sixty questions.
   */
  const runAll = useCallback(
    async (query: string, asTyped: boolean) => {
      if (query.length < 2) {
        setResponse(null);
        setResources(null);
        setAsked("");
        return;
      }
      setAsked(query);
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setBusy(true);
      setError(false);
      // Two independent endpoints, settled independently: the Resources lane is
      // a metadata scan and the citation lane a retrieval engine, and one of
      // them being down is no reason to show the reader nothing.
      const [passages, lane] = await Promise.allSettled([
        search(query, { raw: asTyped, signal: ctrl.signal }),
        searchLibrary(query, ctrl.signal),
      ]);
      if (
        (passages.status === "rejected" && (passages.reason as Error)?.name === "AbortError") ||
        (lane.status === "rejected" && (lane.reason as Error)?.name === "AbortError")
      ) {
        return; // superseded by a newer search; leave the screen alone
      }
      if (passages.status === "fulfilled") {
        setResponse(passages.value);
        setExpanded(false);
        track("search", {
          query_length: query.length,
          results: passages.value.total,
          mode: passages.value.mode,
        });
      } else {
        setError(true);
      }
      setResources(lane.status === "fulfilled" ? lane.value : null);
      setBusy(false);
      router.replace(`/search?q=${encodeURIComponent(query)}`, { scroll: false });
    },
    [router]
  );

  // A shared link arrives with its question already asked, so it is answered
  // without waiting to be asked again. Mount only — after this, the reader asks.
  useEffect(() => {
    if (mode === "all" && initialQ.trim().length >= 2) void runAll(initialQ.trim(), false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * The dictionary itself, brought to the device the moment Paribhasha is opened.
   *
   * Usually free: the reader's word-tap and the book download button load the
   * same copy through the same module, and it is kept in IndexedDB. When it is
   * not here, this is one ~143 KB request that then answers every keystroke
   * for a day — and offline.
   */
  const [dictionary, setDictionary] = useState<ParibhashaWord[] | null>(null);
  useEffect(() => {
    if (mode !== "paribhasha") return;
    const here = localGlossaryWords();
    if (here) {
      setDictionary(here);
      return;
    }
    let alive = true;
    setBusy(true);
    void (async () => {
      try {
        // The lean headword index is what says whether a cached copy is still
        // current, and it is 25 KB against the full one's 143.
        const { version } = await getParibhashaIndex();
        await ensureFullGlossary(version);
      } catch {
        // Offline, or the glossary is down. The endpoint below still answers.
      }
      if (!alive) return;
      setDictionary(localGlossaryWords());
      setBusy(false);
    })();
    return () => {
      alive = false;
    };
  }, [mode]);

  /**
   * **Paribhasha searches as you type, and that is not an inconsistency.**
   *
   * Every other box in this app waits to be asked because its answer is over
   * the network. This one's answer is on the device, so it costs nothing and
   * arrives in under a millisecond — the thing "search as you type" always
   * promised and, at ~0.9s a keystroke, never delivered here either.
   *
   * `searchGlossary` is the BE's own ladder, rung for rung, over the same set
   * of words (`lib/glossary.ts`), so this is faster without being weaker.
   */
  const localWords = useMemo(() => {
    const query = q.trim();
    if (mode !== "paribhasha" || !dictionary || !query) return null;
    return searchGlossary(dictionary, query);
  }, [q, mode, dictionary]);

  /**
   * What the Paribhasha list shows — the device's answer, or the endpoint's when
   * there is no local copy. An emptied box shows nothing either way, which is
   * why that is read off `q` here rather than written back into state.
   */
  const dictWords = dictionary ? localWords : q.trim() ? words : null;

  /**
   * The fallback, for a device that could not get the dictionary — offline on
   * first use, or a glossary that is down. Keeps the debounce it always had,
   * because now it is the only path here that touches the network.
   */
  useEffect(() => {
    if (mode !== "paribhasha" || dictionary) return;
    const query = q.trim();
    if (!query) return;
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setError(false);
      try {
        const page = await getParibhasha({ q: query });
        setWords(page.results);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError(true);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [q, mode, dictionary]);

  /**
   * The URL and the count, once the typing settles.
   *
   * Split from the results on purpose: the answer is instant, but writing an
   * address and counting a search are things you do to a question somebody
   * finished asking, not to every letter on the way there.
   */
  useEffect(() => {
    if (mode !== "paribhasha") return;
    const query = q.trim();
    if (!query) return;
    const t = setTimeout(() => {
      track("search", { query_length: query.length, results: dictWords?.length ?? 0, mode: "paribhasha" });
      router.replace(`/search?mode=paribhasha&q=${encodeURIComponent(query)}`, {
        scroll: false,
      });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, mode]);

  const results = response?.results ?? [];
  const shown = expanded ? results : results.slice(0, FIRST_PAGE);
  const glossary = response?.paribhasha ?? [];
  const resourceHits = resources?.length ?? 0;

  return (
    <PageContainer>
      <SearchField
        inputRef={inputRef}
        value={q}
        onChange={(value) => {
          setQ(value);
          setRaw(false);
        }}
        // Paribhasha has already answered by the time this fires — the box is
        // reading a dictionary that is on the device — so submitting there is
        // only what it is on any phone: the thing that puts the keyboard away.
        onSubmit={() => {
          if (mode === "all") void runAll(q.trim(), raw);
        }}
        onClear={() => {
          setQ("");
          setRaw(false);
          setResponse(null);
          setResources(null);
          setWords(null);
          setAsked("");
          setError(false);
          inputRef.current?.focus();
        }}
        placeholder="Search… paribhasha, sutra, books"
        label="Search"
        // Only "All results" has something unasked to offer; the dictionary is
        // never behind what has been typed.
        unasked={mode === "all" && q.trim().length >= 2 && q.trim() !== asked}
        pending={busy}
      />

      {/* Mode chips (design 2A). Two questions, one box: "where is this
          discussed" (All) and "what does this word mean" (Paribhasha). The mode
          rides in the URL so a shared dictionary search reopens as one. */}
      <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Search mode">
        {(
          [
            ["all", <span key="a">All results</span>],
            ["paribhasha", <span key="p">Paribhasha</span>],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => {
              setMode(m);
              setError(false);
              inputRef.current?.focus();
            }}
            className={`min-h-11 inline-flex items-center rounded-full border px-3.5 text-xs font-medium ${
              mode === m ? "border-transparent text-white" : "border-rule bg-card text-ink"
            }`}
            style={mode === m ? { background: "var(--ws-color)" } : undefined}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "paribhasha" && (
        <>
          <p className="mt-3 text-xs text-ink-soft">
            Devanagari or Roman, both work · Dictionary search, live as you type ·{" "}
            <Link href="/paribhasha" className="underline underline-offset-2">
              Browse the full glossary
            </Link>
          </p>
          <div className="mt-5">
            {busy && dictWords === null && (
              <p className="text-center text-sm text-ink-soft">Searching…</p>
            )}
            {error && (
              <p className="text-center text-sm text-ink-soft">
                The glossary isn&apos;t available right now.
              </p>
            )}
            {!error && dictWords !== null && dictWords.length === 0 && (
              <p className="text-center text-sm text-ink-soft">
                No match for “{q.trim()}” in the glossary.
              </p>
            )}
            {dictWords !== null && dictWords.length > 0 && (
              <ul className="flex flex-col gap-2">
                {dictWords.map((w) => (
                  <WordRow key={w.id} word={w} />
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {mode === "paribhasha" ? null : (
      <>
      {/*
        **Citation search covers originals only, permanently**: retrieval is
        tuned for Devanagari, and a citation has to be quotable back to A.
        Nagraj ji rather than to a student's rendering. Translations are not
        indexed and never will be.

        The Resources lane below the results is not an exception to that rule,
        it is the shape the rule takes: resources are searched by *metadata*
        only — titles, topics, people, places, filenames — never by what is
        inside a file, because nothing in that library has paragraphs to index
        (contract §13.5). Two lanes, two different claims, never merged.

        So there are still no scope chips. A "Translations" option would come
        back empty every time, and a "Resources" one would promise that these
        two kinds of hit are the same kind of thing. Stating the boundary once
        is what a filter would only have pretended to offer.
      */}
      <p className="mt-3 text-xs text-ink-soft">
        Citations come from A. Nagraj ji&apos;s original works; Resources are
        matched on their metadata.
        {" · "}
        {/* The glossary answers a different question from this box, and only
            announces itself when a query happens to reach it. This is the way
            in for a reader who wants the dictionary itself. */}
        <Link href="/paribhasha" className="underline underline-offset-2">
          Paribhasha glossary
        </Link>
      </p>

      {/*
        The books are in Devanagari, so a Latin query is rewritten before it is
        searched. Saying so matters: without this line, someone who typed
        "anubhav" sees Hindi results appear with no explanation — and someone
        searching an English word we translated wrongly has no way back.
      */}
      {response?.searchedAs && !busy && (
        <p className="mt-3 text-xs text-ink-soft">
          Showing results for{" "}
          <span lang="hi" className="hi font-medium text-ink">
            {response.searchedAs}
          </span>
          {" · "}
          {/* Asks again, as typed. It used to only flip the flag and let the
              debounce notice; nothing is watching for that now, so the
              correction runs the search it is asking for. */}
          <button
            type="button"
            onClick={() => {
              setRaw(true);
              void runAll(q.trim(), true);
            }}
            className="underline underline-offset-2"
          >
            search for “{q.trim()}” instead
          </button>
        </p>
      )}

      <div className="mt-5">
        {busy && <p className="text-center text-sm text-ink-soft">Searching…</p>}
        {error && (
          <p className="text-center text-sm text-ink-soft">Search is unavailable right now.</p>
        )}
        {/*
          The Paribhasha card, above the passages (contract §9.1). Readers use
          one box for two questions — "where is this discussed" and "what does
          this word mean" — and the paragraph index answers the second badly:
          a one-word query returns the twenty places the word appears, none of
          which is its definition. So the answer goes first, and the passages
          follow it.
        */}
        {!busy && glossary[0] && (
          <ParibhashaCard word={glossary[0]} more={glossary.length - 1} query={q.trim()} />
        )}

        {!busy &&
          response !== null &&
          results.length === 0 &&
          glossary.length === 0 &&
          resourceHits === 0 && (
            <p className="text-center text-sm text-ink-soft">
              No results for “{q.trim()}”.
            </p>
          )}
        {results.length > 0 && (
          <>
            {/*
              The citation lane, named. It only needs a name now that a second
              lane sits below it — and naming it is what keeps the promise
              legible: everything under this heading is quotable back to A.
              Nagraj ji by canonical ref, and nothing under Resources is.
            */}
            <p className="mb-3 flex flex-wrap items-baseline gap-x-2 px-1 text-xs text-ink-soft">
              <span className="text-xs font-bold uppercase tracking-[0.09em]">
                In the books
              </span>
              <span>{results.length === 1 ? "1 result" : `${results.length} results`}</span>
            </p>
            <ul className="flex flex-col gap-3">
              {shown.map((r, i) => (
                <ResultCard key={r.canonical_ref ?? i} result={r} terms={response!.terms} />
              ))}
            </ul>
            {!expanded && results.length > FIRST_PAGE && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="mt-4 w-full rounded-2xl border border-rule bg-card px-4 py-3 text-sm font-medium"
                style={{ color: "var(--ws-ink)" }}
              >
                Show {results.length - FIRST_PAGE} more
              </button>
            )}
          </>
        )}

        {/*
          The Resources lane, always its own lane and never merged into the
          results above (contract §13.5). A citation is quotable back to A.
          Nagraj ji; a metadata hit is a title or a tag that happened to
          contain the word, and folding the two together would let a folder's
          name pass for evidence.
        */}
        {!busy && resources && <LibraryLane rows={resources} />}
      </div>

      {/* assistant placeholder — quiet inline banner (PRD §7). It sits below
          the results rather than above them: on an empty search it used to be
          the loudest thing on the screen, which read as an apology. */}
      <p className="mt-8 text-center text-xs text-ink-soft">
        Smart assistant coming soon
      </p>
      </>
      )}
    </PageContainer>
  );
}

/**
 * The definition card. Deliberately a different shape from a result row: this
 * answers the question rather than pointing at somewhere the question is
 * discussed, so it carries no citation, no page and no "open in book".
 *
 * The first definition shows; the rest expand. They read as one explanation
 * in order (§14.1), so the plain meaning is already on screen and what is
 * hidden is elaboration — never a second competing sense.
 */
function ParibhashaCard({
  word,
  more,
  query,
}: {
  word: ParibhashaHit;
  /** other words the glossary also matched, offered as a link rather than a stack */
  more: number;
  query: string;
}) {
  const [open, setOpen] = useState(false);
  const rest = word.definitions.slice(1);

  return (
    <section
      aria-label="Paribhasha"
      className="mb-4 overflow-hidden rounded-2xl border bg-card p-4"
      style={{ borderColor: "color-mix(in srgb, var(--ws-color) 35%, transparent)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ws-ink)" }}>
        Paribhasha
      </p>
      <h2 lang="hi" className="hi mt-1 text-xl font-semibold leading-snug">
        {word.hindi}
      </h2>
      {word.hinglish && <p className="text-xs text-ink-soft">{word.hinglish}</p>}

      {word.definitions[0] && (
        <p lang="hi" className="hi mt-2 text-sm leading-relaxed">
          {word.definitions[0]}
        </p>
      )}
      {open &&
        rest.map((d, i) => (
          <p key={i} lang="hi" className="hi mt-3 text-sm leading-relaxed text-ink-soft">
            {d}
          </p>
        ))}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {rest.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="font-medium underline underline-offset-2"
            style={{ color: "var(--ws-ink)" }}
          >
            {open ? "Collapse" : "Full definition"}
          </button>
        )}
        <Link
          href={`/paribhasha?q=${encodeURIComponent(query)}`}
          className="text-ink-soft underline underline-offset-2"
        >
          {more > 0 ? `${more} more words in the glossary` : "See in the glossary"}
        </Link>
      </div>
    </section>
  );
}

function fmtTimestamp(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

const RE_SPECIAL = /[.*+?^${}()|[\]\\]/g;

/**
 * Mark the searched words inside a snippet. Rendered as React nodes, never as
 * HTML, so book text can never inject markup. Terms arrive longest-first from
 * the BE, which keeps a short term from splitting a longer match.
 */
function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const parts = useMemo(() => {
    if (!terms.length) return [text];
    const pattern = terms.map((t) => t.replace(RE_SPECIAL, "\\$&")).join("|");
    return text.split(new RegExp(`(${pattern})`, "gi"));
  }, [text, terms]);
  const matches = useMemo(() => new Set(terms.map((t) => t.toLowerCase())), [terms]);

  return (
    <>
      {parts.map((part, i) =>
        matches.has(part.toLowerCase()) ? (
          <mark key={i} className="bg-transparent font-semibold text-ink">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

/**
 * Forward-compatible result renderer: handles text | audio | video with
 * optional timestamp even though v1 returns text only (PRD §3 out-scope).
 *
 * Tapping expands in place rather than navigating. Half these paragraphs are
 * one-line sutras, so the collapsed card often cannot tell you whether this is
 * the passage you wanted — and answering that by opening the book costs you
 * the result list you were working through. Expanding is free (the passage and
 * its neighbours already arrived with the results), so triage stays on one
 * screen and navigation becomes the deliberate second step it should be.
 */
function ResultCard({ result, terms }: { result: SearchResult; terms: string[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const cardRef = useRef<HTMLLIElement>(null);
  // Set only when collapsing from the button at the FOOT of an open panel:
  // that removes a screenful from above the viewport, so the card has to be
  // pulled back into view once the DOM has actually shrunk.
  const recentreOnCollapse = useRef(false);

  useEffect(() => {
    if (open || !recentreOnCollapse.current) return;
    recentreOnCollapse.current = false;
    cardRef.current?.scrollIntoView({ block: "center" });
  }, [open]);
  const ref = result.canonical_ref;
  const snippet =
    (result.snippet as string) ||
    (result.text as string) ||
    (result.text_hi as string) ||
    "";
  const full = (result.text as string) || snippet;
  const before = (result.context_before as string) || "";
  const after = (result.context_after as string) || "";
  const title =
    (result.book_title as string) ||
    (result.title as string) ||
    (result.title_hi as string) ||
    "";

  const badge =
    result.type === "audio" ? "🎧 Audio" : result.type === "video" ? "▶ Video" : null;

  // v1 returns passages only; the audio/video buckets are forward
  // compatibility for the day AV transcripts get an index (PRD §7). There is
  // no page for a single file — a recording lives in a folder — and the hit
  // carries no folder id, so the honest destination for one is the library
  // rather than a shelf that no longer exists.
  const href =
    result.type === "text" && ref
      ? refToHref(ref)
      : result.type === "audio" || result.type === "video"
        ? "/resources"
        : "/books";

  const citation = (
    <>
      {title && <span lang="hi" className="hi">{title}</span>}
      {result.page_number !== undefined && (
        <span className="ml-2">Page {result.page_number}</span>
      )}
      {ref && <span className="ml-2">{ref}</span>}
    </>
  );

  return (
    <li ref={cardRef} className="overflow-hidden rounded-2xl border border-rule bg-card">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) track("search_result_expand", { matched: result.matched ?? "unknown" });
        }}
        className="block w-full p-4 text-left"
      >
        {badge && (
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ws-ink)" }}>
            {badge}
            {result.timestamp !== undefined && ` · ${fmtTimestamp(result.timestamp)}`}
          </span>
        )}
        {/* The crop around the match, while collapsed. Expanding moves the
            passage into the panel below so it can be read in its proper order
            — preceding paragraph, passage, following paragraph — instead of
            being repeated here. */}
        {!open && (
          <p lang="hi" className="hi line-clamp-3 text-sm leading-relaxed">
            <Highlight text={snippet} terms={terms} />
          </p>
        )}
        <p className={`flex items-center gap-1 text-xs text-ink-soft ${open ? "" : "mt-2"}`}>
          <span className="min-w-0 flex-1">{citation}</span>
          <span aria-hidden className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}>
            ⌄
          </span>
        </p>
      </button>

      <div id={panelId} hidden={!open} className="px-4 pb-4">
        {/* Neighbours are dimmed and unhighlighted — they place the passage,
            they are not the match. Absent at a chapter's first/last paragraph. */}
        {before && (
          <p lang="hi" className="hi mb-2 text-sm leading-relaxed text-ink-soft">
            {before}
          </p>
        )}
        <p lang="hi" className="hi text-sm leading-relaxed">
          <Highlight text={full} terms={terms} />
        </p>
        {after && (
          <p lang="hi" className="hi mt-2 text-sm leading-relaxed text-ink-soft">
            {after}
          </p>
        )}
        <Link
          href={href}
          onClick={() => track("search_result_click", { type: result.type })}
          className="mt-4 block rounded-xl px-4 py-2.5 text-center text-sm font-medium text-white"
          style={{ background: "var(--ws-color)" }}
        >
          Open in book
        </Link>
        {/* An expanded passage runs over a screen tall, which would otherwise
            mean scrolling back up to the header just to close it. Collapsing
            from down here removes that screenful from ABOVE the viewport, so
            the effect above pulls the card back into view — otherwise the
            reader is left looking at whatever fell where they were. */}
        <button
          type="button"
          onClick={() => {
            recentreOnCollapse.current = true;
            setOpen(false);
          }}
          className="mt-1 block w-full px-4 py-2 text-center text-xs text-ink-soft"
        >
          Collapse
        </button>
      </div>
    </li>
  );
}
