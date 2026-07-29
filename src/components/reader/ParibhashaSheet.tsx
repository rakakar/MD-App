"use client";

import { useEffect, useState } from "react";
import { useGlossary } from "./GlossaryProvider";
import { Sheet } from "./Sheet";
import type { ParibhashaWord } from "@/lib/types";

/**
 * The tap answer (contract §14.4). A bottom sheet, not a popover anchored to
 * the word: on a phone an anchored bubble either covers the line being read
 * or lands off-screen, and this one arrives where the thumb already is.
 *
 * It shows the definition and nothing else — no citation, no "where else this
 * appears". The glossary is a standalone dictionary with no book, chapter or
 * page attached to a word, so there is nothing true to say about *this*
 * reading position that the reader is not already looking at.
 */
export function ParibhashaSheet({ word, onClose }: { word: string | null; onClose: () => void }) {
  const { lookup } = useGlossary();
  // The answer carries the word it answers, so "still loading" is simply
  // "what I have is not about the word on screen" — no second state to set,
  // and no stale definition can ever be shown under a new headword.
  const [answer, setAnswer] = useState<{
    word: string;
    entry: ParibhashaWord | null;
    failed: boolean;
  } | null>(null);

  useEffect(() => {
    if (!word) return;
    let live = true;
    void lookup(word)
      .then((entry) => live && setAnswer({ word, entry, failed: false }))
      .catch(() => live && setAnswer({ word, entry: null, failed: true }));
    return () => {
      live = false;
    };
  }, [word, lookup]);

  const current = answer?.word === word ? answer : null;
  const entry = current?.entry ?? null;
  const state = !current ? "loading" : current.failed ? "error" : entry ? "ready" : "missing";

  return (
    <Sheet open={word !== null} onClose={onClose} title="परिभाषा">
      <div className="px-5 pb-2">
        <p lang="hi" className="hi text-2xl font-semibold leading-snug">
          {entry?.hindi ?? word}
        </p>
        {entry?.hinglish && (
          <p className="mt-0.5 text-sm text-(--reader-ink-soft)">{entry.hinglish}</p>
        )}

        <div className="mt-4">
          {state === "loading" && (
            <p className="py-4 text-sm text-(--reader-ink-soft)">देखा जा रहा है…</p>
          )}
          {state === "missing" && (
            <p lang="hi" className="hi py-2 text-sm text-(--reader-ink-soft)">
              इस शब्द की परिभाषा उपलब्ध नहीं है।
            </p>
          )}
          {state === "error" && (
            <p lang="hi" className="hi py-2 text-sm text-(--reader-ink-soft)">
              परिभाषा नहीं आ सकी — आप ऑफ़लाइन हो सकते हैं। शब्दकोश केवल ऑनलाइन खुलता है।
            </p>
          )}
          {/* Definitions read as ONE explanation in the order a manager
              arranged them (§14.1) — the plain meaning first, the elaboration
              after it. Numbering them would turn one thought into a menu of
              competing senses. */}
          {state === "ready" &&
            entry?.definitions.map((d, i) => (
              <p
                key={i}
                lang="hi"
                className={`hi text-[15px] leading-relaxed ${
                  i === 0 ? "" : "mt-3 text-(--reader-ink-soft)"
                }`}
              >
                {d}
              </p>
            ))}
        </div>
      </div>
    </Sheet>
  );
}
