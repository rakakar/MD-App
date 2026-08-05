"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { contentLang } from "@/lib/script";
import type { LibraryFile } from "@/lib/types";

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

/**
 * Which host a `video` file points at, and its id there.
 *
 * The BE detects the *kind* from the URL but hands over the URL itself
 * (§13.5), so the id is parsed here. A `video` that is neither YouTube nor
 * Vimeo is an uploaded file and plays natively — which is also the honest
 * fallback for a share URL shaped in a way this does not recognise.
 */
function source(url: string): { host: "youtube" | "vimeo"; id: string } | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = u.pathname.slice(1);
    return id ? { host: "youtube", id } : null;
  }
  if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
    const v = u.searchParams.get("v");
    if (v) return { host: "youtube", id: v };
    // /embed/ID and /shorts/ID
    const m = u.pathname.match(/\/(?:embed|shorts|v)\/([^/?#]+)/);
    return m ? { host: "youtube", id: m[1] } : null;
  }
  if (host.endsWith("vimeo.com")) {
    const m = u.pathname.match(/(\d+)/);
    return m ? { host: "vimeo", id: m[1] } : null;
  }
  return null;
}

/**
 * One video file: an embedded player for a YouTube or Vimeo link, the native
 * element for an uploaded file (§13.5).
 *
 * Click to load in every case. A folder holding six recordings would otherwise
 * mount six third-party players — and start six downloads — the moment it
 * opens, and the poster is enough to choose from.
 */
export function VideoView({ file }: { file: LibraryFile }) {
  const src = source(file.url);
  const [activated, setActivated] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activated || src?.host !== "youtube" || !hostRef.current) return;
    let cancelled = false;
    void loadIframeApi().then(() => {
      if (cancelled || !hostRef.current || !window.YT) return;
      new window.YT.Player(hostRef.current, {
        videoId: src.id,
        playerVars: { autoplay: 1, rel: 0 },
        events: {
          onStateChange: (e) => {
            if (e.data === (window.YT?.PlayerState?.PLAYING ?? 1)) track("video_play");
          },
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [activated, src?.host, src?.id]);

  return (
    <div className="overflow-hidden rounded-2xl border border-rule bg-card">
      <div className="relative aspect-video w-full bg-black">
        {!activated ? (
          <button
            type="button"
            onClick={() => setActivated(true)}
            className="group absolute inset-0 h-full w-full"
            aria-label={`Play ${file.title}`}
          >
            {src?.host === "youtube" && (
              // poster from YouTube's image CDN; the player itself is the
              // IFrame API, which is what the PRD requires
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`https://i.ytimg.com/vi/${src.id}/hqdefault.jpg`}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
              />
            )}
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/70 text-white transition-transform group-hover:scale-105">
                ▶
              </span>
            </span>
          </button>
        ) : src?.host === "youtube" ? (
          <div ref={hostRef} className="absolute inset-0 h-full w-full" />
        ) : src?.host === "vimeo" ? (
          <iframe
            src={`https://player.vimeo.com/video/${src.id}?autoplay=1`}
            title={file.title}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            src={file.url}
            controls
            autoPlay
            preload="metadata"
            className="absolute inset-0 h-full w-full"
            onPlay={() => track("video_play")}
          />
        )}
      </div>
      <p
        {...contentLang(file.title)}
        className={`${contentLang(file.title).className} px-4 py-3 text-sm font-medium`}
      >
        {file.title}
      </p>
    </div>
  );
}
