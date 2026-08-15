"use client";

import { useMemo } from "react";
import { useAudioQueue, type QueueEntry } from "@/components/player/useAudioQueue";
import { formatDuration } from "@/components/library/format";
import { PlayIcon } from "@/components/shell/icons";
import { KindTile } from "@/components/ui";
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
 *
 * **The row is the video playlist's row.** These two lists are the same object
 * — the parts of one recorded collection, in order, to pick up in the middle of
 * — and they were drawn as two: a stack of bordered cards here against a flat
 * playlist there, a duration in bold on the right against one under the title,
 * and a "Resume · 12:04" that named a timecode where the video said what
 * fraction was done. A reader crosses between an audio and a video collection
 * in one tap from the same tab, and nothing about either kind justifies making
 * them relearn the row.
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
    <ol className="-mt-1 flex flex-col gap-1">
      {items.map((item) => {
        const key = trackId(item);
        return (
          <li key={item.id}>
            <TrackRow
              item={item}
              active={activeId === key}
              resumeMs={resumes[key] ?? 0}
              onPlay={() => {
                const entry = byId.get(key);
                if (entry) play(entry);
              }}
            />
          </li>
        );
      })}
    </ol>
  );
}

/**
 * One recording in the album — tile, title, length, and how much of it is done.
 *
 * The percentage rather than the timecode "Resume · 12:04". A position is a
 * fact about the file; a fraction is a fact about the reader, and it is the one
 * being scanned for down a list of fourteen. The exact place is still what the
 * player resumes from — nothing about the playhead changed, only what the row
 * says about it.
 */
function TrackRow({
  item,
  active,
  resumeMs,
  onPlay,
}: {
  item: LibraryFile;
  /** this is the track the player is on — the one thing a list of fourteen
   *  must be able to say without being read */
  active: boolean;
  resumeMs: number;
  onPlay: () => void;
}) {
  const t = contentLang(item.title);
  const length = formatDuration(item.duration_seconds);
  const percent = item.duration_seconds
    ? Math.min(100, (resumeMs / 1000 / item.duration_seconds) * 100)
    : 0;

  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label={`Play ${item.title}`}
      className="group flex w-full items-start gap-3 rounded-card p-1 text-start transition-colors hover:bg-ink/[.04]"
    >
      {active ? (
        // The playing track keeps the tile's shape and takes the accent: what
        // is playing has to be findable in a list of fourteen without reading
        // any of it.
        <span
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-tile text-white"
          style={{ background: "var(--ws-color)" }}
        >
          <PlayIcon className="h-6 w-6" />
        </span>
      ) : (
        <KindTile kind="audio" size="lg" />
      )}

      <span className="min-w-0 flex-1 py-0.5">
        <span
          {...t}
          className={`${t.className} hi-tight line-clamp-2 text-sm font-semibold group-hover:underline`}
        >
          {item.title}
        </span>
        {item.description && (
          <span
            {...contentLang(item.description)}
            className={`${contentLang(item.description).className} mt-1 line-clamp-1 text-xs text-ink-soft`}
          >
            {item.description}
          </span>
        )}
        {/* The length alone. Under the title rather than out at the right
            margin: the video row carries its length on the poster, and a column
            of bold numbers on the far edge made the two lists read as different
            kinds of thing.

            No provenance badge. Every part of a collection inherits the
            collection's, so it printed "Original" fourteen times down one
            screen to say something the hero had already said — and the video
            row beside it says it none. Where a borrowed file really does
            disagree, its breadcrumb is what marks it. */}
        {length && <span className="mt-1 block text-xs tabular-nums text-ink-soft">{length}</span>}
        {percent > 1 && (
          <span className="mt-1.5 flex items-center gap-2">
            <span aria-hidden className="h-1 flex-1 overflow-hidden rounded-full bg-ink/10">
              <span
                className="block h-full rounded-full bg-(--ws-ink)"
                style={{ width: `${percent}%` }}
              />
            </span>
            <span className="shrink-0 text-xs font-medium tabular-nums text-ink-soft">
              {Math.round(percent)}% listened
            </span>
          </span>
        )}
      </span>
    </button>
  );
}
