"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAudioQueue, type QueueEntry } from "@/components/player/useAudioQueue";
import { formatDuration } from "@/components/library/format";
import { PlayIcon, WaveformIcon } from "@/components/shell/icons";
import { AUDIO_POSTER } from "@/lib/media";
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

  return (
    <ol className="-mt-1 flex flex-col gap-1">
      {items.map((item) => {
        const key = trackId(item);
        return (
          <li key={item.id}>
            <TrackRow
              item={item}
              art={art}
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
 * One recording in the album — **the video playlist's row, to the pixel**.
 *
 * Same 16:9 thumbnail at the same width, same length badge in its corner, same
 * title beside it, same bar and percentage underneath. The only thing that had
 * been keeping the two lists apart was that audio has no still of its own to
 * show; it wears the shared portrait instead (see `AUDIO_POSTER`), which gives
 * the row the same weight of ink and lets a reader crossing from a video
 * collection to an audio one recognise what they are looking at.
 *
 * What audio adds is the playing state, which a video list has no equivalent
 * of: the track the player is on keeps its play badge lit in the accent rather
 * than only on hover, because in a list of fourteen that is the one thing that
 * has to be findable without reading any of it.
 *
 * The percentage rather than the timecode "Resume · 12:04". A position is a
 * fact about the file; a fraction is a fact about the reader, and it is the one
 * being scanned for. The exact place is still what the player resumes from —
 * nothing about the playhead changed, only what the row says about it.
 */
function TrackRow({
  item,
  active,
  resumeMs,
  onPlay,
  art,
}: {
  item: LibraryFile;
  art: "portrait" | "glyph";
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
  // The portrait is a file in `public/`, so a build that has not been given it
  // yet falls back to the kind tile rather than to a broken image. `onError`
  // alone does not cover it: the row is server-rendered, so the browser can
  // have tried and failed before React ever attached a handler — hence the
  // check on mount for an image that is `complete` with no pixels in it.
  const [posterFailed, setPosterFailed] = useState(false);
  const glyph = art === "glyph" || posterFailed;
  const posterRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const el = posterRef.current;
    if (el && el.complete && el.naturalWidth === 0) setPosterFailed(true);
  }, []);

  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label={`Play ${item.title}`}
      className="group flex w-full items-start gap-3 rounded-card p-1 text-start transition-colors hover:bg-ink/[.04]"
    >
      <span className="relative aspect-video w-[38%] max-w-[10.5rem] shrink-0 overflow-hidden rounded-lg bg-black">
        {glyph ? (
          // Not `KindTile` with a size override: two Tailwind size utilities on
          // one element are resolved by their order in the stylesheet, not in
          // the class list, so `h-full` beside `h-14` is a coin toss.
          //
          // The shelf's colour when the glyph was *asked* for, and the audio
          // tint when it is standing in for a portrait that would not load —
          // the second is a fallback and should keep looking like every other
          // audio tile in the app.
          <span
            aria-hidden
            className={`flex h-full w-full items-center justify-center ${
              art === "glyph" ? "text-white" : "bg-kind-audio text-kind-audio-ink"
            }`}
            style={art === "glyph" ? { background: "var(--ws-color)" } : undefined}
          >
            <WaveformIcon className="h-6 w-6" />
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={posterRef}
            src={AUDIO_POSTER}
            alt=""
            loading="lazy"
            onError={() => setPosterFailed(true)}
            className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
          />
        )}
        <span
          className={`absolute inset-0 flex items-center justify-center transition-opacity ${
            active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full text-white"
            style={{ background: active ? "var(--ws-color)" : "rgb(0 0 0 / 0.7)" }}
          >
            <PlayIcon className="h-4 w-4" />
          </span>
        </span>
        {length && (
          <span className="absolute bottom-1 end-1 rounded bg-black/80 px-1.5 py-1 text-xs font-semibold leading-none tabular-nums text-white">
            {length}
          </span>
        )}
      </span>

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
