"use client";

import { useMemo } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  EXAMPLE_PHRASE,
  EXAMPLE_QUESTION,
  EXAMPLE_WORDS,
  exactGlossaryWord,
  INTENT_GLOSS,
  INTENT_HINT,
  INTENT_LABEL,
  INTENTS,
  type Intent,
} from "@/lib/assistant/intent";
import { searchGlossary } from "@/lib/glossary";
import type { BookSummary, ParibhashaWord } from "@/lib/types";
import type { Ask } from "./types";
import { IntentGlyph } from "./icons";
import { INTENT_COLOR } from "./parts";

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
  mode,
  onMode,
  text,
  dictionary,
  onPick,
  onAsk,
}: {
  /** the Originals shelf — counted in the subtitle */
  shelf: BookSummary[] | null;
  /** Book search's chosen books; empty means all of them */
  scope: string[];
  mode: Intent | null;
  onMode: (m: Intent) => void;
  text: string;
  dictionary: ParibhashaWord[] | null;
  /** a live Paribhasha match was tapped */
  onPick: (word: string) => void;
  /** an example question was tapped — asked at once */
  onAsk: Ask;
}) {
  const { user, loading } = useAuth();
  const q = text.trim();
  const books = shelf?.length ?? null;
  const matches = useMemo(
    () => (mode === "paribhasha" && dictionary && q ? searchGlossary(dictionary, q, PEEK) : null),
    [mode, dictionary, q]
  );
  const word = useMemo(
    () => EXAMPLE_WORDS.find((w) => exactGlossaryWord(dictionary, w)) ?? EXAMPLE_WORDS[0],
    [dictionary]
  );
  const examples: { intent: Intent; label: string; ask: () => void }[] = [
    { intent: "paribhasha", label: `${word} का अर्थ क्या है?`, ask: () => onAsk(word, "paribhasha") },
    {
      intent: "books",
      label: `“${EXAMPLE_PHRASE}” ग्रंथों में कहाँ आया है?`,
      ask: () => onAsk(EXAMPLE_PHRASE, "books", { exact: true }),
    },
    { intent: "research", label: EXAMPLE_QUESTION, ask: () => onAsk(EXAMPLE_QUESTION, "research") },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
      {/* The question is answered once a chip is chosen, so it fades with the
          chip row. Opacity only: it keeps its place, so the help line and the
          box below it stay exactly where they were. */}
      <div
        aria-hidden={mode !== null || undefined}
        className={`transition-opacity duration-300 ease-out ${mode ? "opacity-0" : "opacity-100 delay-100"}`}
      >
        {/* Centred on desktop, where the landing stands in the middle of the
            page rather than on a phone's thumb (desktop revision, 30 Sep). */}
        <h2 className="font-display text-2xl font-medium leading-tight tracking-[-0.015em] lg:text-center lg:text-4xl">
          What are you looking for?
        </h2>
        <p className="mt-1 text-sm text-ink-soft lg:mt-2 lg:text-center">
          Answers from {books ? `${books} original books` : "the original books"}
        </p>
        {/* What it is and what it costs, before the first question (15 Nov
            2026, UX audit AS1): a guest used to learn that Research is AI,
            needs an account and has a daily limit only from a failure card
            after asking. */}
        {!loading && !user && (
          <p className="mt-1 text-sm text-ink-soft lg:text-center">
            Research answers are written by AI from cited passages, and need you to sign in.
          </p>
        )}
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
          inert={mode !== null || undefined}
          className={`col-start-1 row-start-1 flex min-w-0 flex-col justify-end gap-3 transition-[opacity,transform] ease-out motion-reduce:transform-none ${
            mode ? "translate-y-1 opacity-0 duration-150" : "translate-y-0 opacity-100 delay-150 duration-300"
          }`}
        >
        <div role="group" aria-label="What do you need" className="flex min-w-0 flex-wrap gap-2.5 lg:justify-center">
          {INTENTS.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => onMode(i)}
              className="inline-flex min-h-11 items-center gap-2.5 rounded-full border border-rule bg-card py-1 pl-4 pr-5 text-left text-base font-semibold text-ink shadow-card"
            >
              <span style={{ color: INTENT_COLOR[i] }}>
                <IntentGlyph intent={i} className="h-4.5 w-4.5" />
              </span>
              {/* The gloss under the name rather than beside it: beside, the
                  four chips took four rows on a phone. */}
              <span className="flex flex-col leading-tight">
                {INTENT_LABEL[i]}
                <span lang="hi" className="hi-note text-sm font-normal text-ink-soft">
                  {INTENT_GLOSS[i]}
                </span>
              </span>
            </button>
          ))}
        </div>
        {/* Something to ask, not only ways of asking (UX audit AS2): one
            example per kind of answer, each asked on the tap. */}
        <ul aria-label="For example" className="flex min-w-0 flex-col lg:items-center">
          {examples.map((e) => (
            <li key={e.intent}>
              <button
                type="button"
                onClick={e.ask}
                className="flex min-h-11 items-center gap-3 text-left"
              >
                <span className="shrink-0" style={{ color: INTENT_COLOR[e.intent] }}>
                  <IntentGlyph intent={e.intent} className="h-4 w-4" />
                </span>
                <span lang="hi" className="hi-note text-base text-ink underline decoration-rule underline-offset-4">
                  {e.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
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
                      : mode === "research" && scope.length > 0
                        ? `Ask a question — answered only from ${
                            scope.length === 1 ? "this book" : `these ${scope.length} books`
                          }, with the passages cited.`
                        : INTENT_HINT[mode]}
                </span>
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

