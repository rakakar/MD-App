"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAudioQueue, type QueueEntry } from "@/components/player/useAudioQueue";
import { MediaRows } from "@/components/library/MediaRows";
import { PLAY_ALL } from "@/components/library/folderActions";
import { WaveformIcon } from "@/components/shell/icons";
import { AUDIO_POSTER } from "@/lib/media";
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
  art = "portrait",
}: {
  items: LibraryFile[];
  /** what the player calls the album — the folder the files sit in */
  albumTitle?: string;
  coverUrl?: string | null;
  /**
   * What a track wears where it has no still of its own.
   *
   * `portrait` is the shared photograph of Shri A. Nagraj, and it is only
   * honest on Originals: the note on `AUDIO_POSTER` says it is not
   * identification "since every recording here is him", which stops being
   * true the moment the shelf is Resources and the recording is a geet sung
   * by students. `glyph` is the wave on the shelf's own colour — the same
   * tile the portrait already falls back to when the file is missing.
   */
  art?: "portrait" | "glyph";
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

  // The hero's Play all starts from the first track; the queue carries on.
  useEffect(() => {
    const onPlayAll = () => entries[0] && play(entries[0]);
    window.addEventListener(PLAY_ALL, onPlayAll);
    return () => window.removeEventListener(PLAY_ALL, onPlayAll);
  }, [entries, play]);

  return (
    <MediaRows
      verb="listened"
      items={items.map((item) => {
        const key = trackId(item);
        const start = () => {
          const entry = byId.get(key);
          if (entry) play(entry);
        };
        const resumeMs = resumes[key] ?? 0;
        return {
          key: item.id,
          title: item.title,
          description: item.description,
          durationSeconds: item.duration_seconds,
          art: <AudioArt art={art} />,
          onPlay: start,
          active: activeId === key,
          percent: item.duration_seconds
            ? Math.min(100, (resumeMs / 1000 / item.duration_seconds) * 100)
            : 0,
          menu: [{ label: "Play", onClick: start }],
          share: { title: item.title, url: item.url },
        };
      })}
    />
  );
}

/**
 * What a track wears: the shared portrait on Originals, the wave on the
 * shelf's colour elsewhere — and the wave too if the portrait fails to load,
 * so a row is never a black box. See `art` above.
 */
function AudioArt({ art }: { art: "portrait" | "glyph" }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);
  if (art === "glyph" || failed) {
    return (
      <span
        aria-hidden
        className={`flex h-full w-full items-center justify-center ${
          art === "glyph" ? "text-white" : "bg-kind-audio text-kind-audio-ink"
        }`}
        style={art === "glyph" ? { background: "var(--ws-color)" } : undefined}
      >
        <WaveformIcon className="h-6 w-6" />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={AUDIO_POSTER}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover"
    />
  );
}
