"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { PlayIcon } from "@/components/shell/icons";
import { track } from "@/lib/analytics";
import { savePlayhead } from "@/lib/personal";
import { contentLang } from "@/lib/script";
import { clearPlayhead, getPlayhead, setPlayhead } from "@/lib/storage";
import type { LibraryFile } from "@/lib/types";
import { loadIframeApi, type YouTubePlayer } from "@/lib/youtubeIframe";

// Official YouTube IFrame Player API only (PRD §3.3) — never download or
// extract YouTube audio. The loader and its typings moved to `lib/youtubeIframe`
// when the shorts player became a second caller: the API has one global ready
// hook, and two copies of the loader would race for it.
//
// `getCurrentTime` is the whole reason the IFrame API is used here rather than a
// bare `<iframe>`: a plain embed cannot say where the viewer is, so a video
// could never keep its place the way a recording does.

/**
 * Which host a `video` file points at, and its id there.
 *
 * The BE detects the *kind* from the URL but hands over the URL itself
 * (§13.5), so the id is parsed here. A `video` that is neither YouTube nor
 * Vimeo is an uploaded file and plays natively — which is also the honest
 * fallback for a share URL shaped in a way this does not recognise.
 */
export function videoSource(url: string): { host: "youtube" | "vimeo"; id: string } | null {
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
 * A video's place, kept the same way a recording's is.
 *
 * Audio has had this since the album player was built — a playhead written
 * locally every few seconds under `library-file:<id>`, so a ninety-minute
 * shivir resumes instead of restarting. Video had none of it: the only thing
 * this component reported was an analytics ping, so a two-hour sammelan
 * watched in three sittings began at zero every time.
 *
 * **One mechanism, not a second one.** The key, the store, the rate limit and
 * the endpoint are all exactly what audio uses, which is what lets "continue
 * listening" and "continue watching" be one list the day they are drawn.
 *
 * Vimeo is left out. Its player is a bare `<iframe>` here and cannot be asked
 * where the viewer is, so there is nothing honest to record; it plays, and it
 * starts at the beginning.
 */
function useKeepPlace(file: LibraryFile) {
  const { user } = useAuth();
  const signedIn = useRef(false);
  useEffect(() => {
    signedIn.current = user !== null;
  }, [user]);

  const key = `library-file:${file.id}`;
  // Read once, before anything plays: the value is wanted at construction, and
  // re-reading it later would fight the writes below.
  const [resumeAt] = useState(() => {
    const ms = getPlayhead(key);
    // Under five seconds is not a place anyone left off, and resuming within a
    // few seconds of the end is worse than starting again — the same two
    // guards the audio queue applies.
    return ms && ms > 5_000 ? Math.floor(ms / 1000) : 0;
  });

  // The native element reports four times a second; the embed is polled every
  // five. Both land here, and neither needs to touch localStorage more often
  // than the audio player does — a flush is always let through, because those
  // are the writes that are certain to be the viewer's actual place.
  const LOCAL_WRITE_MS = 5_000;
  const lastLocalWrite = useRef(0);

  const write = useCallback(
    (seconds: number, duration: number, flush: boolean) => {
      if (!Number.isFinite(seconds) || seconds < 0) return;
      const done = Number.isFinite(duration) && duration > 0 && seconds >= duration - 1;
      const now = Date.now();
      if (flush || done || now - lastLocalWrite.current >= LOCAL_WRITE_MS) {
        lastLocalWrite.current = now;
        if (done) clearPlayhead(key);
        else setPlayhead(key, seconds * 1000);
      }
      savePlayhead(file.id, done ? duration : seconds, signedIn.current, {
        flush: flush || done,
      });
    },
    [key, file.id]
  );

  return useMemo(() => ({ resumeAt, write }), [resumeAt, write]);
}

/**
 * One video file: an embedded player for a YouTube or Vimeo link, the native
 * element for an uploaded file (§13.5).
 *
 * Click to load in every case. A folder holding six recordings would otherwise
 * mount six third-party players — and start six downloads — the moment it
 * opens, and the poster is enough to choose from.
 *
 * **Two shapes, one component.** `card` is a 16:9 poster with its title under
 * it, which is right for a folder holding one video. `full` is the same player
 * with no chrome at all, sized by whatever holds it — what `VideoPlaylist`
 * puts on screen when a row is tapped, where the surround is the overlay's own.
 *
 * `full` is already playing when it mounts, because it only ever mounts in
 * answer to a tap that meant "play this". Its poster step would be a second
 * tap on a black screen.
 */
export function VideoView({
  file,
  layout = "card",
}: {
  file: LibraryFile;
  layout?: "card" | "full";
}) {
  const src = videoSource(file.url);
  const [activated, setActivated] = useState(layout === "full");
  const hostRef = useRef<HTMLDivElement>(null);
  const keep = useKeepPlace(file);

  useEffect(() => {
    if (!activated || src?.host !== "youtube" || !hostRef.current) return;
    let cancelled = false;
    let ticker: ReturnType<typeof setInterval> | null = null;
    let player: YouTubePlayer | null = null;

    const stop = () => {
      if (ticker !== null) clearInterval(ticker);
      ticker = null;
    };
    const mark = (flush: boolean) => {
      if (!player) return;
      keep.write(player.getCurrentTime(), player.getDuration(), flush);
    };
    // The tab going away is the commonest way watching ends, and it fires no
    // pause — the same hole the audio player closes the same way.
    const leaving = () => mark(true);

    void loadIframeApi().then(() => {
      if (cancelled || !hostRef.current || !window.YT) return;
      player = new window.YT.Player(hostRef.current, {
        videoId: src.id,
        // Where the viewer stopped last time. Passed at construction rather
        // than seeked afterwards: a seek would play the opening seconds first.
        playerVars: { autoplay: 1, rel: 0, start: keep.resumeAt },
        events: {
          onStateChange: (e) => {
            const states = window.YT?.PlayerState;
            if (e.data === (states?.PLAYING ?? 1)) {
              track("video_play");
              stop();
              ticker = setInterval(() => mark(false), 5000);
              window.addEventListener("pagehide", leaving);
            } else {
              // Paused or ended — a real stopping point, so it is written
              // without waiting out the push interval.
              stop();
              mark(true);
            }
          },
        },
      });
    });
    return () => {
      cancelled = true;
      stop();
      window.removeEventListener("pagehide", leaving);
      mark(true);
    };
  }, [activated, src?.host, src?.id, keep]);

  const player =
    src?.host === "youtube" ? (
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
        // Where it was left, applied once the element knows its own length
        // — before that, setting `currentTime` is discarded.
        onLoadedMetadata={(e) => {
          if (keep.resumeAt > 0) e.currentTarget.currentTime = keep.resumeAt;
        }}
        onPlay={() => track("video_play")}
        // The element's own 4Hz signal, rate-limited to disk and to the
        // account by the same guards the embedded player uses.
        onTimeUpdate={(e) =>
          keep.write(e.currentTarget.currentTime, e.currentTarget.duration, false)
        }
        onPause={(e) => keep.write(e.currentTarget.currentTime, e.currentTarget.duration, true)}
        onEnded={(e) => keep.write(e.currentTarget.duration, e.currentTarget.duration, true)}
      />
    );

  // No card, no title, no radius: full screen, the overlay around it is the
  // chrome and a rounded corner on a black field would only draw a box.
  if (layout === "full") {
    return <div className="relative aspect-video w-full bg-black">{player}</div>;
  }

  return (
    // The Video Album comp's card: the same radius and lift every other row on
    // these screens has, so a player reads as one of them rather than as an
    // embed that landed on the page.
    <div className="overflow-hidden rounded-card border border-rule bg-card shadow-card">
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
                <PlayIcon className="h-6 w-6" />
              </span>
            </span>
          </button>
        ) : (
          player
        )}
      </div>
      <p
        {...contentLang(file.title)}
        className={`${contentLang(file.title).className} px-4 py-3.5 text-title font-semibold`}
      >
        {file.title}
      </p>
    </div>
  );
}
