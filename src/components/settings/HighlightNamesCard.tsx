"use client";

import { useState } from "react";
import {
  DEFAULT_HIGHLIGHT_NAMES,
  HIGHLIGHT_COLOUR_WORD,
  renameHighlight,
  useHighlightNames,
} from "@/lib/highlightNames";
import { HIGHLIGHT_COLOURS, type HighlightColour } from "@/lib/storage";
import { CARD } from "./parts";

/**
 * **What the three highlight colours mean** (16 Nov 2026, UX audit ST4).
 *
 * The defaults — प्रश्न, समझ आया, दोबारा पढ़ें — are a starting point, not a
 * scheme the app insists on. A reader who paints by book, by theme or by
 * goshthi can call each colour what it is for them; the name follows into the
 * selection bar and the Highlights filter. Saved when the box is left; an
 * emptied box goes back to the default.
 */
export function HighlightNamesCard({ desktop, onSaved }: { desktop: boolean; onSaved: (m: string) => void }) {
  const names = useHighlightNames();
  return (
    <div className={`${CARD} ${desktop ? "px-7" : "px-5"} py-4`}>
      <p className="text-sm text-ink-soft">
        Name each colour for what you mark with it. The name shows when you highlight, and on My Journey
        you can see all the passages in one colour.
      </p>
      <ul className="mt-3 flex flex-col divide-y divide-rule">
        {HIGHLIGHT_COLOURS.map((c) => (
          <NameRow key={`${c}|${names[c]}`} colour={c} name={names[c]} onSaved={onSaved} />
        ))}
      </ul>
    </div>
  );
}

const FILL: Record<HighlightColour, string> = { amber: "bg-hl-amber", sage: "bg-hl-sage", sky: "bg-hl-sky" };

function NameRow({
  colour,
  name,
  onSaved,
}: {
  colour: HighlightColour;
  name: string;
  onSaved: (m: string) => void;
}) {
  const [draft, setDraft] = useState(name);
  const save = () => {
    const next = draft.trim() || DEFAULT_HIGHLIGHT_NAMES[colour];
    if (next === name) {
      setDraft(name);
      return;
    }
    renameHighlight(colour, next);
    onSaved(`${HIGHLIGHT_COLOUR_WORD[colour]} is now “${next}”`);
  };
  return (
    <li className="flex min-h-14 items-center gap-3 py-2">
      <span aria-hidden className={`h-6 w-6 shrink-0 rounded-full ${FILL[colour]}`} />
      <label className="sr-only" htmlFor={`hl-name-${colour}`}>
        Name for {HIGHLIGHT_COLOUR_WORD[colour].toLowerCase()} highlights
      </label>
      <input
        id={`hl-name-${colour}`}
        lang="hi"
        value={draft}
        maxLength={24}
        placeholder={DEFAULT_HIGHLIGHT_NAMES[colour]}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="hi min-h-11 min-w-0 flex-1 rounded-control border border-rule bg-card px-3 text-base text-ink outline-none focus:border-(--ws-ink)"
      />
      <span className="w-12 shrink-0 text-right text-xs text-ink-soft">{HIGHLIGHT_COLOUR_WORD[colour]}</span>
    </li>
  );
}
