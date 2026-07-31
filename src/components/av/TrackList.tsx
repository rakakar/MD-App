"use client";

import { useMemo } from "react";
import { useAudioQueue, type QueueEntry } from "@/components/player/useAudioQueue";
import { formatDuration } from "@/components/resources/format";
import { PlayIcon } from "@/components/shell/icons";
import { contentLang } from "@/lib/script";
import type { AudioTrack } from "@/lib/types";

/** where this track's playhead is kept, and how the player names it */
function trackId(t: AudioTrack): string {
  return `audio-track:${t.id}`;
}

function trackTitle(t: AudioTrack): string {
  return t.title_hi || `Track ${t.id}`;
}

/**
 * A series' tracks, played **through the app's one player** in album mode —
 * the same behaviour a संसाधन collection's audio has always had.
 *
 * These two lists had drifted apart: a शिविर recording filed as a collection
 * item resumed where you left it, rolled into the next part and put its cover
 * on the lock screen, while the very same recording reached through the Audio
 * catalog did none of that. `useAudioQueue` is the single answer for both now.
 */
export function TrackList({
  tracks,
  seriesTitle,
  coverUrl = null,
}: {
  tracks: AudioTrack[];
  seriesTitle?: string;
  /** the series cover — what the phone's lock screen shows while this plays */
  coverUrl?: string | null;
}) {
  // Only tracks with a file are playable; a row that cannot play must not take
  // a place in the queue, or ⏭ would land on silence.
  const entries = useMemo<QueueEntry[]>(
    () =>
      tracks
        .filter((t) => t.file_url)
        .map((t) => ({
          id: trackId(t),
          title: trackTitle(t),
          subtitle: t.speaker || seriesTitle,
          url: t.file_url as string,
          durationMs: t.duration_seconds ? t.duration_seconds * 1000 : undefined,
          coverImage: coverUrl,
        })),
    [tracks, seriesTitle, coverUrl]
  );

  const { play, resumes, activeId } = useAudioQueue(entries);
  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);

  return (
    <ol className="divide-y divide-rule overflow-hidden rounded-2xl border border-rule bg-white">
      {tracks.map((t, i) => {
        const key = trackId(t);
        const entry = byId.get(key);
        const active = activeId === key;
        const resume = resumes[key];
        const title = contentLang(trackTitle(t));
        return (
          <li key={t.id}>
            <button
              type="button"
              disabled={!entry}
              onClick={() => entry && play(entry)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[.03] disabled:opacity-50"
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
                  {...title}
                  className={`${title.className} block truncate text-[15px] leading-snug`}
                >
                  {trackTitle(t)}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
                  {formatDuration(t.duration_seconds) && (
                    <span className="tabular-nums">{formatDuration(t.duration_seconds)}</span>
                  )}
                  {resume && (
                    <span lang="hi" className="hi font-medium" style={{ color: "var(--ws-ink)" }}>
                      जारी रखें · {formatDuration(Math.round(resume / 1000))}
                    </span>
                  )}
                  {!entry && (
                    <span lang="hi" className="hi">
                      फ़ाइल उपलब्ध नहीं
                    </span>
                  )}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
