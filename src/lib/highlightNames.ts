import { useEffect, useState } from "react";
import { getPrefs, setPrefs, type HighlightColour } from "./storage";

/**
 * **What each highlight colour means** (16 Nov 2026, UX audit ST4).
 *
 * A reader painted passages amber, green or blue, and the colours carried no
 * meaning anywhere in the app — so the one organising act a reader already
 * makes could not be used to find anything again. Each colour now has a name:
 * a question to take to a goshthi, something that came clear, something to
 * read again. The reader can rename any of them in Settings; the colour, not
 * the name, is what is stored on the highlight, so a rename relabels every
 * passage already painted.
 */
export const DEFAULT_HIGHLIGHT_NAMES: Record<HighlightColour, string> = {
  amber: "प्रश्न",
  sage: "समझ आया",
  sky: "दोबारा पढ़ें",
};

/** the plain colour, for a screen reader and for the rename sheet */
export const HIGHLIGHT_COLOUR_WORD: Record<HighlightColour, string> = {
  amber: "Amber",
  sage: "Green",
  sky: "Blue",
};

const EVENT = "md:highlight-names";

export function highlightNames(): Record<HighlightColour, string> {
  const own = getPrefs().highlightNames ?? {};
  return {
    amber: own.amber?.trim() || DEFAULT_HIGHLIGHT_NAMES.amber,
    sage: own.sage?.trim() || DEFAULT_HIGHLIGHT_NAMES.sage,
    sky: own.sky?.trim() || DEFAULT_HIGHLIGHT_NAMES.sky,
  };
}

/** Rename one colour; an empty name puts the default back. */
export function renameHighlight(colour: HighlightColour, name: string) {
  const own = { ...(getPrefs().highlightNames ?? {}) };
  const clean = name.trim().slice(0, 24);
  if (!clean || clean === DEFAULT_HIGHLIGHT_NAMES[colour]) delete own[colour];
  else own[colour] = clean;
  setPrefs({ highlightNames: own });
  window.dispatchEvent(new Event(EVENT));
}

/** The names, kept current when they are renamed elsewhere on the page. */
export function useHighlightNames(): Record<HighlightColour, string> {
  const [names, setNames] = useState(DEFAULT_HIGHLIGHT_NAMES);
  useEffect(() => {
    const load = () => setNames(highlightNames());
    load();
    window.addEventListener(EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, []);
  return names;
}

/** Every colour a saved passage is painted in — the paragraph's own, and its spans'. */
export function coloursOf(row: { colour?: HighlightColour; ranges?: { colour: HighlightColour }[] }): HighlightColour[] {
  const set = new Set<HighlightColour>();
  if (row.colour) set.add(row.colour);
  for (const r of row.ranges ?? []) set.add(r.colour);
  return [...set];
}
