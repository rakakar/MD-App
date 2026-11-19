"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAudioQueue, type QueueEntry } from "@/components/player/useAudioQueue";
import { MediaRows } from "@/components/library/MediaRows";
import { PLAY_ALL, announcePlayAll, resumeIndex } from "@/components/library/folderActions";
import { WaveformIcon } from "@/components/shell/icons";
import { AUDIO_POSTER_WARM } from "@/lib/media";
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
  sessionType = null,
}: {
  /**
   * The album's Type — `"shivir"`, `"samvad"`… — which decides what a track
   * with no number in its title shows on its thumbnail. See `trackLabel`.
   */
  sessionType?: string | null;
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

  // The hero's Play all starts where the listener left off (`resumeIndex`),
  // or from the first track when nothing is in progress; the queue carries on.
  const resumeAt = useMemo(
    () =>
      resumeIndex(
        items.map((item) =>
          item.duration_seconds ? (resumes[trackId(item)] ?? 0) / 1000 / item.duration_seconds : 0
        )
      ),
    [items, resumes]
  );
  useEffect(() => {
    announcePlayAll({ index: resumeAt, total: entries.length });
  }, [resumeAt, entries.length]);
  useEffect(() => () => announcePlayAll({ index: null, total: 0 }), []);
  useEffect(() => {
    const onPlayAll = () => {
      const entry = entries[resumeAt ?? 0];
      if (entry) play(entry);
    };
    window.addEventListener(PLAY_ALL, onPlayAll);
    return () => window.removeEventListener(PLAY_ALL, onPlayAll);
  }, [entries, play, resumeAt]);

  return (
    <MediaRows
      verb="listened"
      items={items.map((item, index) => {
        const key = trackId(item);
        const start = () => {
          const entry = byId.get(key);
          if (entry) play(entry);
        };
        const resumeMs = resumes[key] ?? 0;
        const label = art === "portrait" ? trackLabel(item, index, sessionType) : null;
        return {
          key: item.id,
          title: item.title,
          description: item.description,
          durationSeconds: item.duration_seconds,
          art: <AudioArt art={art} label={label} />,
          lengthOnArt: label?.kind === "length",
          onPlay: start,
          active: activeId === key,
          percent: item.duration_seconds
            ? Math.min(100, (resumeMs / 1000 / item.duration_seconds) * 100)
            : 0,
          menu: [{ label: "Play", onClick: start }],
          share: { title: item.title, url: item.url },
          download: { url: item.url, bytes: item.file_size },
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
function AudioArt({ art, label }: { art: "portrait" | "glyph"; label: TrackLabel | null }) {
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
    <span className="track-art" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={ref}
        src={AUDIO_POSTER_WARM}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
      {label && (
        <span className="track-art__line">
          {label.kind === "part" ? (
            <>
              <span className="track-art__word">Part</span>
              <span className="track-art__num">{label.value}</span>
            </>
          ) : (
            <>
              <span className="track-art__num">{label.value}</span>
              <span className="track-art__word">min</span>
            </>
          )}
        </span>
      )}
    </span>
  );
}

type TrackLabel = { kind: "part" | "length"; value: string };

/**
 * **What a track's thumbnail says** (Raka, 19 Nov 2026), so sixteen parts of
 * one album stop being sixteen copies of one face. The number comes from the
 * track first, then from the album:
 *
 * 1. a title ending in its own number — "तदाकार, संस्कार-2" — shows that
 *    number, in any album. A samvad often holds short runs of one topic
 *    (album 265: संस्कार-1, -2, -3, then a standalone talk, then जाग्रति-1,
 *    -2), and the title is where that run is numbered. Only a number at the
 *    very end counts, so "पूर्व स्मृति - अड़चन" is not read as a part;
 * 2. otherwise, in a shivir or sammelan, its place in the album — the talks
 *    of a course follow on from one another, so "Part 03" says where you are;
 * 3. otherwise, in a samvad, its length. A samvad is separate conversations
 *    in the order they were recorded; "Part 37 of 114" would invent a sequence,
 *    and between a 2-minute answer and a 40-minute discussion the length is
 *    what a listener chooses on.
 *
 * `null` where there is nothing true to print — a samvad track of unknown
 * length — and the portrait is shown bare.
 */
function trackLabel(item: LibraryFile, index: number, sessionType: string | null): TrackLabel | null {
  const own = /[-–]\s*(\d{1,2})\s*$/.exec(item.title.trim());
  if (own) return { kind: "part", value: String(Number(own[1])) };
  if (sessionType !== "samvad") return { kind: "part", value: String(index + 1).padStart(2, "0") };
  const s = item.duration_seconds;
  return s ? { kind: "length", value: String(Math.max(1, Math.round(s / 60))) } : null;
}
