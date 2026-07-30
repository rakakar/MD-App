"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePlayer } from "@/components/player/PlayerProvider";
import { ProvenanceBadge } from "@/components/resources/ProvenanceBadge";
import { formatDuration } from "@/components/resources/format";
import { PlayIcon } from "@/components/shell/icons";
import { getPlayhead } from "@/lib/storage";
import type { ResourceItem } from "@/lib/types";

/** where this item's playhead is kept, and how the player names it */
function trackId(item: ResourceItem): string {
  return `collection-item:${item.id}`;
}

/**
 * A collection's audio, played **through the app's one player** in album mode
 * (contract §13.4) — never a second player.
 *
 * What "album mode" adds over a bare list of tracks is the three things a
 * 14-part shivir recording needs and a one-off track does not:
 *
 * - **the queue** — finishing part 3 rolls into part 4 by itself, and the lock
 *   screen's ⏮/⏭ walk the album. Both come from the player's `chapterNav`,
 *   the same hook the reader uses for chapter neighbours;
 * - **resume** — each part keeps its own playhead, so a 90-minute recording
 *   picks up where it stopped instead of starting again;
 * - speed and background playback, which the player already had.
 */
export function AlbumAudio({
  items,
  collectionTitle,
  coverUrl = null,
}: {
  items: ResourceItem[];
  /** what the player calls the album; a folder view lets each item say its own */
  collectionTitle?: string;
  coverUrl?: string | null;
}) {
  const player = usePlayer();
  const { playTrack, setChapterNav } = player;
  const activeId = player.source?.kind === "track" ? player.source.id : null;
  const activeIndex = items.findIndex((i) => trackId(i) === activeId);

  // Saved playheads, read after mount: localStorage does not exist on the
  // server, and rendering "जारी रखें" from a guess would flash it away again.
  const [resumes, setResumes] = useState<Record<string, number>>({});
  useEffect(() => {
    const found: Record<string, number> = {};
    for (const item of items) {
      const ms = getPlayhead(trackId(item));
      if (ms && ms > 5_000) found[trackId(item)] = ms;
    }
    setResumes(found);
  }, [items]);

  const play = useCallback(
    (item: ResourceItem, fromStart = false) => {
      const key = trackId(item);
      const saved = fromStart ? 0 : (getPlayhead(key) ?? 0);
      playTrack(
        {
          id: key,
          title: item.title,
          subtitle: collectionTitle ?? item.collection_title,
          url: item.url,
          durationMs: item.duration_seconds ? item.duration_seconds * 1000 : undefined,
          coverImage: coverUrl,
          resumeKey: key,
        },
        { startMs: saved }
      );
    },
    [playTrack, collectionTitle, coverUrl]
  );

  // The queue. Memoized because handing the player a fresh object every render
  // re-registers the OS transport handlers, which is what loses the Android
  // notification (see the note in PlayerProvider).
  const nav = useMemo(() => {
    if (activeIndex < 0) return null;
    const prev = items[activeIndex - 1];
    const next = items[activeIndex + 1];
    return {
      prev: prev ? () => play(prev, true) : null,
      next: next ? () => play(next, true) : null,
    };
  }, [activeIndex, items, play]);

  useEffect(() => {
    if (!nav) return;
    setChapterNav(nav);
    return () => setChapterNav(null);
  }, [nav, setChapterNav]);

  return (
    <ol className="divide-y divide-rule overflow-hidden rounded-2xl border border-rule bg-white">
      {items.map((item, i) => {
        const key = trackId(item);
        const active = activeId === key;
        const resume = resumes[key];
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => play(item)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[.03]"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums ${
                  active ? "text-white" : "border border-rule text-ink-soft"
                }`}
                style={active ? { background: "var(--ws-color)" } : undefined}
              >
                {active ? <PlayIcon className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span lang="hi" className="hi block truncate text-[15px] leading-snug">
                  {item.title}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
                  {formatDuration(item.duration_seconds) && (
                    <span className="tabular-nums">
                      {formatDuration(item.duration_seconds)}
                    </span>
                  )}
                  {resume && (
                    <span lang="hi" className="hi font-medium" style={{ color: "var(--ws-ink)" }}>
                      जारी रखें · {formatDuration(Math.round(resume / 1000))}
                    </span>
                  )}
                  <ProvenanceBadge
                    provenance={item.provenance}
                    provenanceHi={item.provenance_hi}
                  />
                </span>
                {item.description && (
                  <span lang="hi" className="hi mt-1 block text-xs text-ink-soft">
                    {item.description}
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
