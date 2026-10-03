"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useGlossary } from "@/components/reader/GlossaryProvider";
import { BackIcon, CloseIcon } from "@/components/shell/icons";
import { AccentScope } from "@/components/shell/WorkspaceProvider";
import { useIsDesktop } from "@/components/ui/Dialog";
import { Sheet } from "@/components/reader/Sheet";
import { DefinitionText, useDefinitionSegments } from "./DefinitionText";
import { TrailContext } from "./trail-context";
import type { ParibhashaWord } from "@/lib/types";
import { WORKSPACES } from "@/lib/workspaceConfig";

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
/** where the word that was clicked sits, in page coordinates */
export interface WordAnchor {
  left: number;
  top: number;
  bottom: number;
}

export function ParibhashaTrailSheet({
  word,
  onClose,
  anchor,
}: {
  /** the headword to open; null closes the sheet */
  word: string | null;
  onClose: () => void;
  /**
   * Desktop: the word on the page it was opened from. With one, the card is a
   * popover beside the word rather than a sheet over the bottom of the window.
   */
  anchor?: WordAnchor | null;
}) {
  const { lookup } = useGlossary();
  const desktop = useIsDesktop();

  // Words followed *from* `word`. Seeded rather than owned so the caller
  // stays the authority on whether the sheet is open at all.
  const [pushed, setPushed] = useState<string[]>([]);
  const [at, setAt] = useState(0);
  const [seed, setSeed] = useState<string | null>(word);
  if (seed !== word) {
    // A new entry word replaces the chain — adjusting state during render is
    // the supported way to reset on a prop change, and avoids a frame showing
    // the previous word's trail under the new headword.
    setSeed(word);
    setPushed([]);
    setAt(0);
  }

  /**
   * Which step of the trail is on screen. The trail is a history, not a
   * stack: stepping back to an earlier word keeps the words after it, so the
   * reader can look at where they came from and step forward again — the
   * designer's call, 26 Sep 2026. It used to cut the trail at the word tapped.
   */
  const trail = word === null ? [] : [word, ...pushed];
  const current = trail[at] ?? null;

  const push = useCallback(
    (next: string) => {
      const w = next.normalize("NFC").trim();
      // Tapping the word already on screen is a no-op, not a repeat: it would
      // put the same headword on the trail twice.
      if (w === current) return;
      // Following the word that is already next on the trail is stepping
      // forward, not a new branch.
      if (pushed[at] === w) {
        setAt(at + 1);
        return;
      }
      // A new word from an earlier step replaces what came after it, as a
      // browser's history does.
      setPushed((p) => [...p.slice(0, at), w]);
      setAt(at + 1);
    },
    [current, pushed, at]
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

  const status =
    state === "loading" ? (
      <p className="py-4 text-sm text-(--reader-ink-soft)">Looking up…</p>
    ) : state === "missing" ? (
      <p className="py-2 text-sm text-(--reader-ink-soft)">No definition is available for this word.</p>
    ) : state === "error" ? (
      <p className="py-2 text-sm text-(--reader-ink-soft)">
        Couldn&apos;t load the definition — you may be offline.
      </p>
    ) : null;

  if (desktop && anchor && current !== null) {
    return (
      <ParibhashaPopover
        anchor={anchor}
        onClose={onClose}
        word={entry?.hindi ?? current}
        hinglish={entry?.hinglish}
        trail={trail}
        at={at}
        onStep={setAt}
      >
        <TrailContext.Provider value={trailValue}>
          {status ?? (
            <DefinitionList definitions={definitions} segments={segments} tone="reader" size="lg" />
          )}
        </TrailContext.Provider>
      </ParibhashaPopover>
    );
  }


  return (
    // The word is the title — the designer's call, 26 Sep 2026. "Paribhasha"
    // said which sheet this was, which the reader knew, having just tapped a
    // word; the word itself is what they want to see first. The English
    // transliteration is the line under it.
    // In Originals' colours wherever it is opened — the designer's call, 26
    // Sep 2026. Paribhasha is the Samhita's vocabulary, which belongs to the
    // source works; the book's paper stays the ground, so it still sits on
    // the page it was opened from.
    <Sheet
      accent={WORKSPACES.originals.color}
      open={current !== null}
      onClose={onClose}
      title={`Paribhasha: ${entry?.hindi ?? current ?? ""}`}
      heading={
        <span lang="hi" className="hi paribhasha-title text-2xl">
          {entry?.hindi ?? current}
        </span>
      }
      subtitle={entry?.hinglish}
    >
      {/* Definitions rendered below reach *this* trail, so following a word
          inside the sheet extends the chain instead of starting a new one. */}
      <TrailContext.Provider value={trailValue}>
      {/* `paribhasha-sheet` sets every Devanagari line in here in Mukta at a
          readable leading (globals.css) — the designer's call, 26 Sep 2026,
          matching the live app. A class rather than utilities because `.hi`
          is unlayered and outranks any font or leading utility on it. */}
      <div className="paribhasha-sheet px-5 pb-2 pt-4">
        {/* The path so far, as the live app draws it: the words behind as
            chips to step to, the word on screen filled, and × to close the
            sheet. Stepping to a chip keeps the whole trail. It appears only once there is
            a path — a single word has no history worth a row of chrome. */}
        {trail.length > 1 && (
          <nav
            aria-label="Words viewed"
            className="mb-4 flex flex-wrap items-center gap-x-1.5 gap-y-2 rounded-tile p-2"
            style={{ background: "color-mix(in srgb, var(--ws-color) 6%, transparent)" }}
          >
            {trail.map((w, i) => (
              <span key={`${w}-${i}`} className="flex items-center gap-1.5">
                {i > 0 && (
                  <span aria-hidden className="text-sm opacity-70" style={{ color: "var(--ws-ink)" }}>
                    ›
                  </span>
                )}
                {i === at ? (
                  <span
                    lang="hi"
                    aria-current="true"
                    className="hi flex min-h-11 items-center rounded-control px-3.5 text-lg text-white"
                    style={{ background: "var(--ws-color)" }}
                  >
                    {w}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAt(i)}
                    lang="hi"
                    className="hi flex min-h-11 items-center rounded-control px-3.5 text-lg transition active:brightness-95"
                    style={{
                      background: "color-mix(in srgb, var(--ws-color) 12%, transparent)",
                      color: "var(--ws-ink)",
                    }}
                  >
                    {w}
                  </button>
                )}
              </span>
            ))}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="ms-1 flex h-11 w-11 items-center justify-center rounded-full"
              style={{ color: "var(--ws-ink)" }}
            >
              <span
                aria-hidden
                className="flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none"
                style={{ background: "color-mix(in srgb, var(--ws-color) 12%, transparent)" }}
              >
                ×
              </span>
            </button>
          </nav>
        )}

        <div>
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
  /** `md` is the sheet; `lg` is the desktop popover and the word's own page,
   *  read beside 21px body text */
  size?: "sm" | "md" | "lg";
}) {
  const soft = tone === "reader" ? "text-(--reader-ink-soft)" : "text-ink-soft";
  // In the sheet the markers wear the sheet's accent (Originals); on the
  // glossary page they stay neutral.
  const bullet = tone === "reader" ? "bg-(--ws-color)" : "bg-ink-soft";
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

/**
 * **The desktop's Paribhasha card** (designer's comp, 3 Oct 2026): a popover
 * hanging from the word that was clicked, instead of a sheet across the foot
 * of the window. A pointer is already at the word; the meaning should arrive
 * there too, with the line it came from still in view.
 *
 * Below the word, or above it when there is not room underneath. Placed in
 * page coordinates, so it scrolls with the paragraph it belongs to. The same
 * trail as the sheet: following an underlined word inside it extends the
 * chain, ‹ steps back along it, and the chips step anywhere in it.
 *
 * A click outside or Escape closes it. `data-reader-chrome` keeps a click in
 * here from being read by the reader as a tap on the page.
 */
const POP_W = 460;
const POP_GAP = 8;

function ParibhashaPopover({
  anchor,
  onClose,
  word,
  hinglish,
  trail,
  at,
  onStep,
  children,
}: {
  anchor: WordAnchor;
  onClose: () => void;
  word: string;
  hinglish?: string;
  trail: string[];
  at: number;
  onStep: (i: number) => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ left: number; top?: number; bottom?: number; maxH: number } | null>(null);

  // Where it goes is decided once per word clicked, against the window as it
  // is at that moment.
  useLayoutEffect(() => {
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const left = Math.min(Math.max(16, anchor.left - 24), vw - POP_W - 16) + window.scrollX;
    const below = vh - (anchor.bottom - window.scrollY) - POP_GAP - 16;
    const above = anchor.top - window.scrollY - POP_GAP - 80;
    if (below >= 320 || below >= above) {
      setPlace({ left, top: anchor.bottom + POP_GAP, maxH: Math.min(480, Math.max(240, below)) });
    } else {
      const docH = document.documentElement.scrollHeight;
      setPlace({ left, bottom: docH - anchor.top + POP_GAP, maxH: Math.min(480, above) });
    }
  }, [anchor]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AccentScope color={WORKSPACES.originals.color}>
      <div
        ref={ref}
        role="dialog"
        aria-label={`Paribhasha: ${word}`}
        data-reader-chrome
        className="reader-surface paribhasha-sheet paribhasha-pop absolute z-50 flex flex-col overflow-hidden rounded-card border border-(--reader-rule) bg-(--reader-bg) text-(--reader-ink) shadow-raised"
        style={{
          width: POP_W,
          left: place?.left ?? -9999,
          top: place?.top,
          bottom: place?.bottom,
          maxHeight: place?.maxH,
          visibility: place ? "visible" : "hidden",
        }}
      >
        <div className="flex shrink-0 items-start gap-2 border-b border-(--reader-rule) pb-4 pe-3 ps-6 pt-5">
          {at > 0 && (
            <button
              type="button"
              onClick={() => onStep(at - 1)}
              aria-label="Back to the previous word"
              className="-ms-2.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-(--reader-ink-soft) transition-colors hover:bg-current/5 hover:text-(--reader-ink)"
            >
              <BackIcon className="h-5.5 w-5.5" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <p lang="hi" className="hi paribhasha-title text-2xl font-semibold">
              {word}
            </p>
            {hinglish && <p className="text-xs text-(--reader-ink-soft)">{hinglish}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-(--reader-ink-soft) transition-colors hover:bg-current/5 hover:text-(--reader-ink)"
          >
            <CloseIcon className="h-5.5 w-5.5" />
          </button>
        </div>

        {trail.length > 1 && (
          <nav
            aria-label="Words viewed"
            className="flex shrink-0 flex-wrap items-center gap-x-1 gap-y-1 border-b border-(--reader-rule) px-4 py-2"
            style={{ background: "color-mix(in srgb, var(--ws-color) 6%, transparent)" }}
          >
            {trail.map((w, i) => (
              <span key={`${w}-${i}`} className="flex items-center gap-1">
                {i > 0 && (
                  <span aria-hidden className="text-xs opacity-60" style={{ color: "var(--ws-ink)" }}>
                    ›
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onStep(i)}
                  aria-current={i === at ? "true" : undefined}
                  lang="hi"
                  className={`hi rounded-md px-2.5 py-1 text-sm transition-colors ${
                    i === at ? "font-semibold" : "hover:bg-current/5"
                  }`}
                  style={
                    i === at
                      ? { background: "color-mix(in srgb, var(--ws-color) 14%, transparent)", color: "var(--reader-ink)" }
                      : { color: "var(--ws-ink)" }
                  }
                >
                  {w}
                </button>
              </span>
            ))}
          </nav>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">{children}</div>

        <p className="shrink-0 border-t border-(--reader-rule) bg-current/[0.03] px-6 py-3 text-xs text-(--reader-ink-soft)">
          Click an underlined word to look it up · Esc to close
        </p>
      </div>
    </AccentScope>,
    document.body
  );
}
