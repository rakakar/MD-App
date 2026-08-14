"use client";

import { useEffect, useState } from "react";
import { GridIcon, ListIcon } from "@/components/shell/icons";

/**
 * Grid or list, and the control that swaps them.
 *
 * Both draw the same collections; which one suits depends on what the reader is
 * doing rather than on which is better. The grid is for looking — shapes and
 * tints, four to a screen. The list is for finding, and on this tab that is
 * often the job: the names are long Devanagari and the pictures are the same
 * glyph in one of two tints, so a 165px column spends its width on artwork that
 * carries almost nothing while the name it needs wraps to three lines.
 *
 * The choice is remembered, because it is a fact about the reader rather than
 * about the page — someone who prefers lists prefers them tomorrow too. Kept in
 * `localStorage` rather than the URL: it is not worth sharing, and a shelf's URL
 * should describe the shelf.
 *
 * It reads the stored value in an effect rather than during render, so the
 * server's HTML and the first client paint agree; the swap happens a frame
 * later. The alternative is a hydration mismatch on every visit.
 */
const KEY = "md.avlayout.v1";

export type CollectionView = "grid" | "list";

export function useCollectionView(): [CollectionView, (v: CollectionView) => void] {
  const [view, setView] = useState<CollectionView>("grid");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved === "list" || saved === "grid") setView(saved);
    } catch {
      // a browser refusing storage is not a reason to lose the shelf
    }
  }, []);

  const choose = (next: CollectionView) => {
    setView(next);
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // as above — the choice simply does not outlive the session
    }
  };

  return [view, choose];
}

/** The pair of buttons. Two states, so it is a toggle rather than a menu. */
export function ViewToggle({
  view,
  onView,
}: {
  view: CollectionView;
  onView: (v: CollectionView) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Layout"
      className="flex shrink-0 items-stretch gap-1 rounded-control border border-rule bg-inset p-1"
    >
      {(
        [
          ["grid", "Grid", <GridIcon key="g" className="h-4 w-4" />],
          ["list", "List", <ListIcon key="l" className="h-4 w-4" />],
        ] as const
      ).map(([value, label, icon]) => {
        const active = view === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => onView(value)}
            // The app's one selected-segment look, at icon size — see
            // `SEGMENT_TRACK` in `ui/Segmented`.
            className={`flex h-9 w-9 items-center justify-center rounded-control transition-colors ${
              active ? "text-white" : "text-ink-soft"
            }`}
            style={active ? { background: "var(--ws-color)" } : undefined}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}
