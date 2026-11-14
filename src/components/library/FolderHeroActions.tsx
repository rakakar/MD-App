"use client";

import { useSyncExternalStore } from "react";
import {
  PLAY_ALL,
  PLAY_ALL_STATE,
  currentPlayAllState,
  type PlayAllState,
} from "@/components/library/folderActions";
import { PlayIcon } from "@/components/shell/icons";

/**
 * The folder hero's actions (designer's comps, 8 Oct 2026). Client
 * components only because they act: the hero itself is server-rendered.
 */

const NOTHING: PlayAllState = { index: null, total: 0 };

/**
 * What the button will do, in its own words. "Play all" until the list below
 * reports a part in progress; then "Resume · 7 of 14", because that is where
 * pressing it now lands (`resumeIndex`). The server render says "Play all",
 * which is also what a first visit shows, so nothing flickers for a new
 * listener.
 */
function usePlayAllLabel(): string {
  const state = useSyncExternalStore(
    (notify) => {
      window.addEventListener(PLAY_ALL_STATE, notify);
      return () => window.removeEventListener(PLAY_ALL_STATE, notify);
    },
    currentPlayAllState,
    () => NOTHING
  );
  return state.index === null ? "Play all" : `Resume · ${state.index + 1} of ${state.total}`;
}

/** starts the folder's recordings where the listener left off, in the list below */
export function PlayAllButton() {
  const label = usePlayAllLabel();
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(PLAY_ALL))}
      className="inline-flex min-h-11 items-center gap-2 rounded-control bg-white px-4 text-sm font-semibold transition-opacity hover:opacity-90"
      // the raw hue, not --ws-ink: the chip is white in every theme, and the
      // dark lift (meant for a near-black ground) made this 2.8:1 on it
      style={{ color: "var(--ws-color)" }}
    >
      <PlayIcon className="h-3.5 w-3.5" />
      <span className="tabular-nums">{label}</span>
    </button>
  );
}

/*
 * The phone's copies (designer's phone comps, 8 Oct 2026). On a phone these
 * leave the hero and sit with the list they act on: Play all and Full series
 * as one row under the search. On the page's own surface rather than the
 * coloured panel, so they are drawn as the page's buttons, not the hero's.
 */

/** Play all, filled, and the set where it also lives, outlined — one row */
export function PhonePlayRow({ playAll, fullSeries }: { playAll: boolean; fullSeries?: string | null }) {
  const label = usePlayAllLabel();
  if (!playAll && !fullSeries) return null;
  return (
    <div className="mt-3 flex gap-2.5 lg:hidden">
      {playAll && (
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(PLAY_ALL))}
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-control px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--ws-color)" }}
        >
          <PlayIcon className="h-3.5 w-3.5" />
          <span className="tabular-nums">{label}</span>
        </button>
      )}
      {fullSeries && (
        <a
          href={fullSeries}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-control border border-rule bg-card px-4 text-sm font-semibold text-ink transition-colors hover:bg-ink/[.03]"
        >
          Full series
          <span aria-hidden>↗</span>
        </a>
      )}
    </div>
  );
}
