"use client";

import { useMemo } from "react";
import { useAudioQueue, type QueueEntry } from "@/components/player/useAudioQueue";
import { ProvenanceBadge } from "@/components/resources/ProvenanceBadge";
import { formatDuration } from "@/components/resources/format";
import { PlayIcon } from "@/components/shell/icons";
import { contentLang } from "@/lib/script";
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
  const entries = useMemo<QueueEntry[]>(
    () =>
      items.map((item) => ({
        id: trackId(item),
        title: item.title,
        subtitle: collectionTitle ?? item.collection_title,
        url: item.url,
        durationMs: item.duration_seconds ? item.duration_seconds * 1000 : undefined,
        coverImage: coverUrl,
      })),
    [items, collectionTitle, coverUrl]
  );

  const { play, resumes, activeId } = useAudioQueue(entries);
  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);

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
              onClick={() => {
                const entry = byId.get(key);
                if (entry) play(entry);
              }}
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
                <span
                  {...contentLang(item.title)}
                  className={`${contentLang(item.title).className} block truncate text-[15px] leading-snug`}
                >
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
                  <span
                    {...contentLang(item.description)}
                    className={`${contentLang(item.description).className} mt-1 block text-xs text-ink-soft`}
                  >
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
