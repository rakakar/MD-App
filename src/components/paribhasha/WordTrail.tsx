"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useGlossary } from "@/components/reader/GlossaryProvider";
import { Sheet } from "@/components/reader/Sheet";
import { DefinitionText, useDefinitionSegments } from "./DefinitionText";
import { devanagariNumber } from "./format";
import { TrailContext } from "./trail-context";
import type { ParibhashaWord } from "@/lib/types";

/**
 * Recursive lookup with a trail (अनुभव गम्य › अध्ययन › …).
 *
 * A definition written in the vocabulary it defines is only usable if you can
 * follow it, and following it is how a reader gets lost — three taps in, the
 * word you started from is gone. So the path is kept and shown: every step is
 * on screen, every step is a way back, and closing the sheet returns to the
 * list rather than to some middle of the chain.
 *
 * The stack lives here, above the sheet, so it survives the sheet's own
 * re-renders and so any part of the page — a row, a definition, a nested
 * definition inside the sheet — reaches the same one.
 */
export function WordTrailProvider({ children }: { children: ReactNode }) {
  const [trail, setTrail] = useState<string[]>([]);

  const open = useCallback((word: string) => {
    const next = word.normalize("NFC").trim();
    // Tapping the word you are already reading is a no-op, not a repeat: it
    // would otherwise put the same headword on the trail twice and make the
    // back step do nothing visible.
    setTrail((t) => (t[t.length - 1] === next ? t : [...t, next]));
  }, []);

  const value = useMemo(() => ({ open }), [open]);

  return (
    <TrailContext.Provider value={value}>
      {children}
      <TrailSheet trail={trail} setTrail={setTrail} />
    </TrailContext.Provider>
  );
}

function TrailSheet({
  trail,
  setTrail,
}: {
  trail: string[];
  setTrail: (fn: (t: string[]) => string[]) => void;
}) {
  const { lookup } = useGlossary();
  const current = trail[trail.length - 1] ?? null;

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

  const close = () => setTrail(() => []);
  const back = () => setTrail((t) => t.slice(0, -1));
  const trimTo = (i: number) => setTrail((t) => t.slice(0, i + 1));

  return (
    <Sheet open={current !== null} onClose={close} title="परिभाषा">
      <div className="px-5 pb-2">
        {/* The path so far. It appears only once there is a path — a single
            word has no history worth a row of chrome. */}
        {trail.length > 1 && (
          <nav
            aria-label="देखे गए शब्द"
            className="-mt-1 mb-3 flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-(--reader-ink-soft)"
          >
            {trail.map((w, i) => (
              <span key={`${w}-${i}`} className="flex items-center gap-1">
                {i > 0 && (
                  <span aria-hidden className="opacity-60">
                    ›
                  </span>
                )}
                {i === trail.length - 1 ? (
                  <span lang="hi" className="hi font-medium text-(--reader-ink)">
                    {w}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => trimTo(i)}
                    lang="hi"
                    className="hi underline underline-offset-2"
                  >
                    {w}
                  </button>
                )}
              </span>
            ))}
          </nav>
        )}

        <div className="flex items-start gap-3">
          {trail.length > 1 && (
            <button
              type="button"
              onClick={back}
              aria-label="पिछला शब्द"
              className="mt-1 shrink-0 rounded-full border border-(--reader-rule) px-2.5 py-1 text-sm leading-none text-(--reader-ink-soft)"
            >
              ←
            </button>
          )}
          <div className="min-w-0">
            <p lang="hi" className="hi text-2xl font-semibold leading-snug">
              {entry?.hindi ?? current}
            </p>
            {entry?.hinglish && (
              <p className="mt-0.5 text-sm text-(--reader-ink-soft)">{entry.hinglish}</p>
            )}
          </div>
        </div>

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
              परिभाषा नहीं आ सकी — आप ऑफ़लाइन हो सकते हैं।
            </p>
          )}
          {state === "ready" && (
            <DefinitionList
              definitions={definitions}
              segments={segments}
              tone="reader"
            />
          )}
        </div>
      </div>
    </Sheet>
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
}: {
  definitions: string[];
  segments: ReturnType<typeof useDefinitionSegments>;
  tone?: "page" | "reader";
}) {
  const soft = tone === "reader" ? "text-(--reader-ink-soft)" : "text-ink-soft";
  const bullet =
    tone === "reader" ? "bg-(--reader-ink-soft)" : "bg-ink-soft";
  const many = definitions.length > 1;

  if (definitions.length === 0) {
    return (
      <p lang="hi" className={`hi text-sm ${soft}`}>
        इस शब्द की परिभाषा अभी दर्ज नहीं है।
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
          <p lang="hi" className={`hi text-[15px] leading-relaxed ${i === 0 ? "" : soft}`}>
            <DefinitionText text={d} segments={segments[i]} />
          </p>
        </li>
      ))}
    </ul>
  );
}

/** "२ परिभाषाएँ" — the count badge a row wears when it holds more than one. */
export function DefinitionCount({ n }: { n: number }) {
  return (
    <span
      lang="hi"
      className="hi rounded-full border border-rule px-1.5 py-0.5 text-[10px] font-medium text-ink-soft"
    >
      {devanagariNumber(n)} परिभाषाएँ
    </span>
  );
}
