"use client";

import { useMemo } from "react";
import { INTENT_HINT, INTENT_LABEL, INTENTS, type Intent } from "@/lib/assistant/intent";
import { searchGlossary } from "@/lib/glossary";
import type { BookSummary, ParibhashaWord } from "@/lib/types";
import { Chip } from "@/components/ui";
import { IntentGlyph } from "./icons";
import { INTENT_COLOR, IntentScope } from "./parts";

/** rows of live Paribhasha matches above the box — a glance, not the list */
const PEEK = 4;

/**
 * 1 · The opening state — "chips at the thumb" (designer's recording, 19 Sep).
 *
 * The title and the four capabilities stand directly on the composer, where
 * the thumb already is, rather than at the top of an empty page. Picking one
 * fades the chip row out and its help line in, **in the same slot**, so
 * nothing below moves; the choice then lives as a pill inside the box and
 * clears with one tap (see `Composer`).
 *
 * With Paribhasha chosen and a word under way, the slot becomes the
 * dictionary itself: matching entries, live per keystroke, each a tap from
 * its answer. It can do that because the dictionary is on the device.
 */
export function Landing({
  shelf,
  scope,
  onScope,
  mode,
  onMode,
  text,
  dictionary,
  onPick,
}: {
  /** the Originals shelf — counted in the subtitle, offered to Book search */
  shelf: BookSummary[] | null;
  /** Book search's chosen books; empty means all of them */
  scope: string[];
  onScope: (codes: string[]) => void;
  mode: Intent | null;
  onMode: (m: Intent) => void;
  text: string;
  dictionary: ParibhashaWord[] | null;
  /** a live Paribhasha match was tapped */
  onPick: (word: string) => void;
}) {
  const q = text.trim();
  const books = shelf?.length ?? null;
  const toggle = (code: string) =>
    onScope(scope.includes(code) ? scope.filter((c) => c !== code) : [...scope, code]);
  const matches = useMemo(
    () => (mode === "paribhasha" && dictionary && q ? searchGlossary(dictionary, q, PEEK) : null),
    [mode, dictionary, q]
  );

  return (
    <div className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
      {/* The question is answered once a chip is chosen, so it fades with the
          chip row. Opacity only: it keeps its place, so the help line and the
          box below it stay exactly where they were. */}
      <div
        aria-hidden={mode !== null || undefined}
        className={`transition-opacity duration-300 ease-out ${mode ? "opacity-0" : "opacity-100 delay-100"}`}
      >
        <h2 className="font-display text-2xl font-medium leading-tight tracking-[-0.015em] lg:text-3xl">
          What are you looking for?
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Answers from {books ? `${books} original books` : "the original books"}
        </p>
      </div>

      {/* One slot, two layers stacked in the same grid cell. Both are always
          laid out, so the slot is the height of the taller and swapping them
          moves nothing; opacity and `inert` decide which one is there.

          A crossfade in sequence rather than at once: the leaving layer goes
          in 150ms, the arriving one waits for it and takes 300ms with a 4px
          rise — two blocks of text at half opacity over each other is the
          muddle this avoids. Reduced motion keeps the fades, drops the rise. */}
      <div className="mt-5 grid grid-cols-1">
        <div
          role="group"
          aria-label="What do you need"
          inert={mode !== null || undefined}
          className={`col-start-1 row-start-1 flex min-w-0 flex-wrap content-end gap-2.5 transition-[opacity,transform] ease-out motion-reduce:transform-none ${
            mode ? "translate-y-1 opacity-0 duration-150" : "translate-y-0 opacity-100 delay-150 duration-300"
          }`}
        >
          {INTENTS.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => onMode(i)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-rule bg-card px-4 text-base font-semibold text-ink shadow-card"
            >
              <span style={{ color: INTENT_COLOR[i] }}>
                <IntentGlyph intent={i} className="h-4.5 w-4.5" />
              </span>
              {INTENT_LABEL[i]}
            </button>
          ))}
        </div>

        <div
          aria-live="polite"
          inert={mode === null || undefined}
          className={`col-start-1 row-start-1 min-w-0 self-end transition-[opacity,transform] ease-out motion-reduce:transform-none ${
            mode ? "translate-y-0 opacity-100 delay-150 duration-300" : "translate-y-1 opacity-0 duration-150"
          }`}
        >
          {mode && matches && matches.length > 0 ? (
            <ul className="flex flex-col">
              {matches.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => onPick(w.hindi)}
                    className="flex min-h-11 w-full items-center gap-3 text-left"
                  >
                    <span style={{ color: INTENT_COLOR.paribhasha }}>
                      <IntentGlyph intent="paribhasha" className="h-4 w-4" />
                    </span>
                    <span lang="hi" className="hi-note shrink-0 text-lg font-semibold">
                      {w.hindi}
                    </span>
                    {w.definitions[0] && (
                      <span lang="hi" className="hi-note min-w-0 flex-1 truncate text-right text-sm text-ink-soft">
                        {w.definitions[0]}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : mode ? (
            <div className="flex gap-3">
              <span className="mt-0.5 shrink-0" style={{ color: INTENT_COLOR[mode] }}>
                <IntentGlyph intent={mode} className="h-5 w-5" />
              </span>
              <p className="text-base leading-snug">
                <span className="block font-semibold">{INTENT_LABEL[mode]}</span>
                <span className="mt-0.5 block text-sm leading-relaxed text-ink-soft">
                  {mode === "paribhasha" && q && dictionary
                    ? `No entry matches “${q}” yet — keep typing, or press send.`
                    : mode === "books" && scope.length > 0
                      ? `Type a phrase — every passage that uses it in ${
                          scope.length === 1 ? "this book" : `these ${scope.length} books`
                        }, in reading order.`
                      : INTENT_HINT[mode]}
                </span>
              </p>
            </div>
          ) : null}
          {/* Book search only: which books to look in, right above the box.
              One scrolling row rather than a wrapped block — twelve Hindi
              titles would stand four rows high and push the title off the
              screen. "All books" is the default and clears any choice. */}
          {mode === "books" && shelf && shelf.length > 1 ? (
            <IntentScope intent="books">
              <div
                role="group"
                aria-label="Books to search"
                className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6"
              >
                <Chip label="All books" selected={scope.length === 0} onClick={() => onScope([])} />
                {shelf.map((b) => (
                  <Chip
                    key={b.code}
                    label={b.title_hi}
                    selected={scope.includes(b.code)}
                    onClick={() => toggle(b.code)}
                  />
                ))}
              </div>
            </IntentScope>
          ) : null}
        </div>
      </div>
    </div>
  );
}
