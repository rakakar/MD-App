"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getPlayhead } from "@/lib/storage";
import { usePlayer } from "./PlayerProvider";

/** One playable row, however the surface above happens to model it. */
export interface QueueEntry {
  /** stable across visits — it is also where the playhead is filed */
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  durationMs?: number;
  coverImage?: string | null;
}

/**
 * Album behaviour for any ordered list of audio.
 *
 * A list of tracks becomes an album when it gains three things, and a
 * fourteen-part शिविर recording needs all three where a one-off file needs
 * none:
 *
 * - **the queue** — finishing part 3 rolls into part 4 by itself, and the lock
 *   screen's ⏮/⏭ walk the list. Both come from the player's `chapterNav`, the
 *   same hook the reader uses for chapter neighbours;
 * - **resume** — every part keeps its own playhead, so a 90-minute recording
 *   picks up where it stopped rather than starting again;
 * - **artwork**, which is what the phone's lock screen shows.
 *
 * This lived only in `AlbumAudio` while the Audio catalog's own series pages
 * had none of it — the same recording behaved differently depending on which
 * screen you reached it from. Shared here so there is one answer.
 */
export function useAudioQueue(entries: QueueEntry[]) {
  const player = usePlayer();
  const { playTrack, setChapterNav } = player;

  const activeId = player.source?.kind === "track" ? player.source.id : null;
  const activeIndex = entries.findIndex((e) => e.id === activeId);

  // Saved playheads, read after mount: localStorage does not exist on the
  // server, and rendering "जारी रखें" from a guess would flash it away again.
  const [resumes, setResumes] = useState<Record<string, number>>({});
  useEffect(() => {
    const found: Record<string, number> = {};
    for (const entry of entries) {
      const ms = getPlayhead(entry.id);
      // Under five seconds is not a place anyone left off; offering to resume
      // there is noise on every row someone merely tapped by accident.
      if (ms && ms > 5_000) found[entry.id] = ms;
    }
    setResumes(found);
  }, [entries]);

  const play = useCallback(
    (entry: QueueEntry, fromStart = false) => {
      playTrack(
        {
          id: entry.id,
          title: entry.title,
          subtitle: entry.subtitle,
          url: entry.url,
          durationMs: entry.durationMs,
          coverImage: entry.coverImage ?? null,
          resumeKey: entry.id,
        },
        { startMs: fromStart ? 0 : (getPlayhead(entry.id) ?? 0) }
      );
    },
    [playTrack]
  );

  // Memoized because handing the player a fresh object every render
  // re-registers the OS transport handlers, which is what loses the Android
  // notification (see the note in PlayerProvider).
  const nav = useMemo(() => {
    if (activeIndex < 0) return null;
    const prev = entries[activeIndex - 1];
    const next = entries[activeIndex + 1];
    return {
      // Neighbours always start at zero: ⏭ means "the next one", and dropping
      // someone into the middle of it because they once paused there is not
      // what the button says.
      prev: prev ? () => play(prev, true) : null,
      next: next ? () => play(next, true) : null,
    };
  }, [activeIndex, entries, play]);

  useEffect(() => {
    if (!nav) return;
    setChapterNav(nav);
    return () => setChapterNav(null);
  }, [nav, setChapterNav]);

  return { play, resumes, activeId };
}
