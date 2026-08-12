"use client";

import { useMemo } from "react";
import { useAudioQueue, type QueueEntry } from "@/components/player/useAudioQueue";
import { ProvenanceBadge } from "@/components/library/ProvenanceBadge";
import { formatDuration } from "@/components/library/format";
import { PlayIcon } from "@/components/shell/icons";
import { KindTile, ListRow, RowCard } from "@/components/ui";
import { contentLang } from "@/lib/script";
import type { LibraryFile } from "@/lib/types";

/** where this file's playhead is kept, and how the player names it */
function trackId(item: LibraryFile): string {
  return `library-file:${item.id}`;
}

/**
 * A folder's audio, played **through the app's one player** in album mode
 * (contract §13.5) — never a second player.
 *
 * What "album mode" adds over a bare list of tracks is the three things a
 * 14-part shivir recording needs and a one-off file does not:
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
  albumTitle,
  coverUrl = null,
}: {
  items: LibraryFile[];
  /** what the player calls the album — the folder the files sit in */
  albumTitle?: string;
  coverUrl?: string | null;
}) {
  const entries = useMemo<QueueEntry[]>(
    () =>
      items.map((item) => ({
        id: trackId(item),
        title: item.title,
        subtitle: albumTitle,
        url: item.url,
        durationMs: item.duration_seconds ? item.duration_seconds * 1000 : undefined,
        coverImage: coverUrl,
      })),
    [items, albumTitle, coverUrl]
  );

  const { play, resumes, activeId } = useAudioQueue(entries);
  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);

  return (
    // One card per track, as the Audio Album comp draws them, rather than the
    // ruled list this was. The change that matters is not the gap: it is that
    // the row now leads with the kind tile every other list in the app leads
    // with, and ends with the duration, which is the one fact a reader picking
    // a 90-minute part out of fourteen is actually choosing on. The track
    // number it replaces was ordinal information the order already carried.
    <ol className="flex flex-col gap-3">
      {items.map((item) => {
        const key = trackId(item);
        const active = activeId === key;
        const resume = resumes[key];
        return (
          <li key={item.id}>
            <RowCard>
              <ListRow
                onClick={() => {
                  const entry = byId.get(key);
                  if (entry) play(entry);
                }}
                label={`Play ${item.title}`}
                leading={
                  active ? (
                    // The playing track keeps the tile's shape and takes the
                    // accent: what is playing has to be findable in a list of
                    // fourteen without reading any of it.
                    <span
                      aria-hidden
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-tile text-white"
                      style={{ background: "var(--ws-color)" }}
                    >
                      <PlayIcon className="h-6 w-6" />
                    </span>
                  ) : (
                    <KindTile kind="audio" size="lg" />
                  )
                }
                title={item.title}
                meta={
                  <>
                    {item.description && (
                      <span
                        {...contentLang(item.description)}
                        className={`${contentLang(item.description).className} block`}
                      >
                        {item.description}
                      </span>
                    )}
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {resume && (
                        <span className="font-medium" style={{ color: "var(--ws-ink)" }}>
                          Resume · {formatDuration(Math.round(resume / 1000))}
                        </span>
                      )}
                      <ProvenanceBadge provenance={item.provenance} />
                    </span>
                  </>
                }
                trailing={
                  formatDuration(item.duration_seconds) ? (
                    <span className="text-sm font-semibold tabular-nums text-ink">
                      {formatDuration(item.duration_seconds)}
                    </span>
                  ) : null
                }
              />
            </RowCard>
          </li>
        );
      })}
    </ol>
  );
}
