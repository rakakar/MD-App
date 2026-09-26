"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useGlossary } from "@/components/reader/GlossaryProvider";
import { Sheet } from "@/components/reader/Sheet";
import { DefinitionText, useDefinitionSegments } from "./DefinitionText";
import { TrailContext } from "./trail-context";
import type { ParibhashaWord } from "@/lib/types";

/**
 * Recursive lookup with a trail (अनुभव गम्य › अध्ययन › …).
 *
 * A definition written in the vocabulary it defines is only usable if you can
 * follow it, and following it is how a reader gets lost — three taps in, the
 * word you started from is gone. So the path is kept and shown: every step is
 * on screen, every step is a way back, and closing the sheet returns to where
 * you started rather than to some middle of the chain.
 *
 * **This is the only Paribhasha card in the app.** The reader used to carry a
 * second, simpler one that printed definitions as plain text — so the same
 * word gave a different answer depending on whether you tapped it in a chapter
 * or in the glossary, and only one of the two let you follow the vocabulary.
 * The sheet is controlled by whoever opens it, which is what lets the reader
 * keep the open word in its own state (it drives the reader's chrome) while
 * still rendering this component.
 */
export function ParibhashaTrailSheet({
  word,
  onClose,
}: {
  /** the headword to open; null closes the sheet */
  word: string | null;
  onClose: () => void;
}) {
  const { lookup } = useGlossary();

  // Words followed *from* `word`. Seeded rather than owned so the caller
  // stays the authority on whether the sheet is open at all.
  const [pushed, setPushed] = useState<string[]>([]);
  const [seed, setSeed] = useState<string | null>(word);
  if (seed !== word) {
    // A new entry word replaces the chain — adjusting state during render is
    // the supported way to reset on a prop change, and avoids a frame showing
    // the previous word's trail under the new headword.
    setSeed(word);
    setPushed([]);
  }

  const trail = word === null ? [] : [word, ...pushed];
  const current = trail[trail.length - 1] ?? null;

  const push = useCallback(
    (next: string) => {
      const w = next.normalize("NFC").trim();
      // Tapping the word already on screen is a no-op, not a repeat: it would
      // put the same headword on the trail twice and make back do nothing.
      if (w === current) return;
      setPushed((p) => [...p, w]);
    },
    [current]
  );

  const trailValue = useMemo(() => ({ open: push }), [push]);

  // The answer carries the word it answers, so "still loading" is simply
  // "what I have is not about the word on screen" — the same trick the
  // reader's sheet uses, and the reason a stale definition can never appear
  // under a new headword while stepping quickly through a chain.
  const [answer, setAnswer] = useState<{
    word: string;
    entry: ParibhashaWord | null;
    failed: boolean;
  } | null>(null);

  useEffect(() => {
    if (!current) return;
    let live = true;
    void lookup(current)
      .then((entry) => live && setAnswer({ word: current, entry, failed: false }))
      .catch(() => live && setAnswer({ word: current, entry: null, failed: true }));
    return () => {
      live = false;
    };
  }, [current, lookup]);

  const shown = answer?.word === current ? answer : null;
  const entry = shown?.entry ?? null;
  const state = !shown ? "loading" : shown.failed ? "error" : entry ? "ready" : "missing";

  const definitions = entry?.definitions ?? [];
  const segments = useDefinitionSegments(definitions, entry?.hindi ?? current ?? undefined);

  const trimTo = (i: number) => setPushed((p) => p.slice(0, i));

  return (
    <Sheet open={current !== null} onClose={onClose} title="Paribhasha">
      {/* Definitions rendered below reach *this* trail, so following a word
          inside the sheet extends the chain instead of starting a new one. */}
      <TrailContext.Provider value={trailValue}>
      {/* `paribhasha-sheet` sets every Devanagari line in here in Mukta at a
          readable leading (globals.css) — the designer's call, 26 Sep 2026,
          matching the live app. A class rather than utilities because `.hi`
          is unlayered and outranks any font or leading utility on it. */}
      <div className="paribhasha-sheet px-5 pb-2 pt-2">
        <p lang="hi" className="hi paribhasha-head text-2xl font-semibold">
          {entry?.hindi ?? current}
        </p>
        {entry?.hinglish && (
          <p className="mt-0.5 text-sm text-(--reader-ink-soft)">{entry.hinglish}</p>
        )}

        {/* The path so far, as the live app draws it: the words behind as
            chips to step back to, the word on screen filled, and × to go back
            to the word the reader first tapped. It appears only once there is
            a path — a single word has no history worth a row of chrome. */}
        {trail.length > 1 && (
          <nav
            aria-label="Words viewed"
            className="mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-2 rounded-card p-2"
            style={{ background: "color-mix(in srgb, var(--reader-ink) 4%, transparent)" }}
          >
            {trail.map((w, i) => (
              <span key={`${w}-${i}`} className="flex items-center gap-1.5">
                {i > 0 && (
                  <span aria-hidden className="text-sm text-(--reader-ink-soft) opacity-70">
                    ›
                  </span>
                )}
                {i === trail.length - 1 ? (
                  <span
                    lang="hi"
                    aria-current="true"
                    className="hi flex min-h-11 items-center rounded-control bg-(--reader-ink) px-3.5 text-lg text-(--reader-bg)"
                  >
                    {w}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => trimTo(i)}
                    lang="hi"
                    className="hi flex min-h-11 items-center rounded-control px-3.5 text-lg text-(--reader-ink-soft) transition active:brightness-95"
                    style={{ background: "color-mix(in srgb, var(--reader-ink) 8%, transparent)" }}
                  >
                    {w}
                  </button>
                )}
              </span>
            ))}
            <button
              type="button"
              onClick={() => trimTo(0)}
              aria-label="Back to the first word"
              className="ms-1 flex h-11 w-11 items-center justify-center rounded-full text-(--reader-ink-soft)"
            >
              <span
                aria-hidden
                className="flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none"
                style={{ background: "color-mix(in srgb, var(--reader-ink) 8%, transparent)" }}
              >
                ×
              </span>
            </button>
          </nav>
        )}

        <div className="mt-4">
          {state === "loading" && (
            <p className="py-4 text-sm text-(--reader-ink-soft)">Looking up…</p>
          )}
          {state === "missing" && (
            <p className="py-2 text-sm text-(--reader-ink-soft)">
              No definition is available for this word.
            </p>
          )}
          {state === "error" && (
            <p className="py-2 text-sm text-(--reader-ink-soft)">
              Couldn&apos;t load the definition — you may be offline.
            </p>
          )}
          {state === "ready" && (
            <DefinitionList
              definitions={definitions}
              segments={segments}
              tone="reader"
              size="md"
            />
          )}
        </div>
      </div>
      </TrailContext.Provider>
    </Sheet>
  );
}

/**
 * Page-level entry point: anything inside can call `open(word)` to raise the
 * sheet. Used by the glossary list and by a single-word page, where the opener
 * is a row rather than a piece of reader chrome.
 *
 * The sheet installs its own trail context over this one, so a tap on the page
 * starts a chain and a tap inside the sheet continues it.
 */
export function WordTrailProvider({ children }: { children: ReactNode }) {
  const [seed, setSeed] = useState<string | null>(null);
  const open = useCallback((word: string) => setSeed(word.normalize("NFC").trim()), []);
  const value = useMemo(() => ({ open }), [open]);

  return (
    <TrailContext.Provider value={value}>
      {children}
      <ParibhashaTrailSheet word={seed} onClose={() => setSeed(null)} />
    </TrailContext.Provider>
  );
}

/**
 * An entry's definitions, one explanation in the order a manager arranged it
 * (§14.1). When there is more than one they carry a bullet, because two
 * paragraphs of Devanagari with no marker between them read as one paragraph
 * that happens to have a line break — the reader could not tell that अनुभव
 * गम्य was answered twice.
 *
 * `tone` picks the palette: the sheet sits on the reader's surface, the page
 * on the app's.
 */
export function DefinitionList({
  definitions,
  segments,
  tone = "page",
  size = "sm",
}: {
  definitions: string[];
  segments: ReturnType<typeof useDefinitionSegments>;
  tone?: "page" | "reader";
  /** `md` is the sheet, where it is read at arm's length; `lg` is the word's
   *  own page, where the definition is the page */
  size?: "sm" | "md" | "lg";
}) {
  const soft = tone === "reader" ? "text-(--reader-ink-soft)" : "text-ink-soft";
  const bullet =
    tone === "reader" ? "bg-(--reader-ink-soft)" : "bg-ink-soft";
  const many = definitions.length > 1;

  if (definitions.length === 0) {
    return (
      <p className={`text-sm ${soft}`}>
        No definition has been recorded for this word yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {definitions.map((d, i) => (
        <li key={i} className={many ? "flex gap-2.5" : undefined}>
          {many && (
            <span
              aria-hidden
              className={`mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full opacity-70 ${bullet}`}
            />
          )}
          <p
            lang="hi"
            className={`hi ${size === "lg" ? "text-xl" : size === "md" ? "text-lg" : "text-sm"} leading-relaxed ${i === 0 ? "" : soft}`}
          >
            <DefinitionText text={d} segments={segments[i]} />
          </p>
        </li>
      ))}
    </ul>
  );
}

/** "2 definitions" — the count badge a row wears when it holds more than one. */
export function DefinitionCount({ n }: { n: number }) {
  return (
    <span className="rounded-full border border-rule px-1.5 py-0.5 text-xs font-medium text-ink-soft">
      {n} definitions
    </span>
  );
}
