"use client";

import { usePlayer } from "@/components/player/PlayerProvider";
import { PlayIcon } from "@/components/shell/icons";
import type { AudioTrack } from "@/lib/types";

function trackTitle(t: AudioTrack): string {
  return t.title_hi || `Track ${t.id}`;
}

function trackUrl(t: AudioTrack): string | null {
  return t.file_url ?? null;
}

function fmtDuration(seconds?: number | null): string {
  if (!seconds) return "";
  return `${Math.round(seconds / 60)} min`;
}

/** Discourse tracks — play through the persistent bottom-bar player. */
export function TrackList({
  tracks,
  seriesTitle,
}: {
  tracks: AudioTrack[];
  seriesTitle?: string;
}) {
  const player = usePlayer();

  return (
    <ol className="divide-y divide-rule overflow-hidden rounded-2xl border border-rule bg-white">
      {tracks.map((t) => {
        const url = trackUrl(t);
        const active = player.source?.kind === "track" && player.source.id === String(t.id);
        return (
          <li key={t.id}>
            <button
              type="button"
              disabled={!url}
              onClick={() =>
                url &&
                player.playTrack({
                  id: String(t.id),
                  title: trackTitle(t),
                  subtitle: t.speaker || seriesTitle,
                  url,
                  durationMs: t.duration_seconds ? t.duration_seconds * 1000 : undefined,
                })
              }
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[.03] disabled:opacity-50"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  active ? "text-white" : "border border-rule text-ink-soft"
                }`}
                style={active ? { background: "var(--ws-color)" } : undefined}
              >
                <PlayIcon className="h-3.5 w-3.5" />
              </span>
              <span lang="hi" className="hi min-w-0 flex-1 truncate text-sm">
                {trackTitle(t)}
              </span>
              <span className="shrink-0 text-xs text-ink-soft">{fmtDuration(t.duration_seconds)}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
