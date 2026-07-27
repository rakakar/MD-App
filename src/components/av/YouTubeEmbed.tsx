"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import type { VideoItem } from "@/lib/types";

// Official YouTube IFrame Player API only (PRD §3.3) — never download or
// extract YouTube audio.

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onStateChange?: (e: { data: number }) => void;
          };
        }
      ) => unknown;
      PlayerState?: { PLAYING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;

function loadIframeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve();
      };
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    });
  }
  return apiPromise;
}

export function videoId(v: VideoItem): string | null {
  return v.youtube_id || null;
}

export function videoTitle(v: VideoItem): string {
  return v.title_hi || "Video";
}

/** Click-to-load YouTube player: thumbnail first, IFrame API on demand. */
export function YouTubeEmbed({ video }: { video: VideoItem }) {
  const id = videoId(video);
  const [activated, setActivated] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activated || !id || !hostRef.current) return;
    let cancelled = false;
    void loadIframeApi().then(() => {
      if (cancelled || !hostRef.current || !window.YT) return;
      new window.YT.Player(hostRef.current, {
        videoId: id,
        playerVars: { autoplay: 1, rel: 0 },
        events: {
          onStateChange: (e) => {
            if (e.data === (window.YT?.PlayerState?.PLAYING ?? 1)) {
              track("video_play");
            }
          },
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [activated, id]);

  if (!id) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-rule bg-white">
      <div className="relative aspect-video w-full bg-black">
        {activated ? (
          <div ref={hostRef} className="absolute inset-0 h-full w-full" />
        ) : (
          <button
            type="button"
            onClick={() => setActivated(true)}
            className="group absolute inset-0 h-full w-full"
            aria-label={`Play ${videoTitle(video)}`}
          >
            {/* poster from YouTube's image CDN; player itself is IFrame API */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={video.thumbnail_url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
            />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/70 text-white transition-transform group-hover:scale-105">
                ▶
              </span>
            </span>
          </button>
        )}
      </div>
      <p lang="hi" className="hi px-4 py-3 text-sm font-medium">
        {videoTitle(video)}
      </p>
    </div>
  );
}
