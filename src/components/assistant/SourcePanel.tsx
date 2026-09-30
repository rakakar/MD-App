"use client";

import { createContext, useContext } from "react";
import type { ChatCitation } from "@/lib/types";
import { CitationSheet, PanelFrame, SourceLabel } from "./CitationSheet";

/** One answer's sources, and which of them is open. */
export interface OpenSource {
  cites: ChatCitation[];
  index: number;
}

/**
 * How an answer opens a source on desktop: into the Assistant's right-hand
 * column instead of a bottom sheet. Null on a phone and outside the Assistant
 * (a shared answer), where the answer keeps its own sheet.
 */
export const SourcePanelContext = createContext<((s: OpenSource) => void) | null>(null);

export function useSourcePanel() {
  return useContext(SourcePanelContext);
}

/**
 * The right-hand column (desktop revision, 30 Sep 2026). The source is the
 * same one the phone's sheet shows — `CitationSheet` in a different frame.
 */
export function SourcePanel({
  source,
  onClose,
}: {
  source: OpenSource;
  onClose: () => void;
}) {
  const cite = source.cites[source.index] ?? null;
  return (
    <aside
      aria-label="Source"
      className="hidden w-[25rem] shrink-0 border-l border-rule bg-surface lg:block"
    >
      <SourceLabel.Provider value={`Source ${source.index + 1} of ${source.cites.length}`}>
        <CitationSheet
          citation={cite}
          number={source.index + 1}
          onClose={onClose}
          frame={PanelFrame}
        />
      </SourceLabel.Provider>
    </aside>
  );
}
