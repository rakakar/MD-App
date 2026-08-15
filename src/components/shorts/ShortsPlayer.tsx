"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CloseIcon, PlayIcon } from "@/components/shell/icons";
import { track } from "@/lib/analytics";
import { contentLang } from "@/lib/script";
import type { Short } from "@/lib/shorts";
import { loadIframeApi, type YouTubePlayer } from "@/lib/youtubeIframe";

/**
 * **The shorts feed — one clip on screen, the next one a swipe away.**
 *
 * A vertical scroll-snap column, one clip per screen, with **exactly one player
 * alive at a time**: the clip you are looking at. Every other slide is its own
 * still. That is not a memory optimisation dressed up as design — sixty YouTube
 * iframes would each open their own connections and start their own buffers, and
 * a feed that took a phone's whole network to show one clip would stutter
 * precisely while being swiped.
 *
 * **Swiping is the browser's own scroll**, not a gesture handler. Scroll-snap
 * gives momentum, rubber-banding, trackpads, mouse wheels, arrow keys, screen
 * readers and page-up all at once, and every hand-written swipe recogniser gives
 * back a worse version of the first two and none of the rest.
 *
 * **Sound.** These are people speaking, so a muted feed would be pointless —
 * which rules out the usual autoplay trick. Browsers only allow sound after the
 * viewer has interacted with *this page*, and arriving here from a tap on the
 * previous one does not count. So the first clip may need one tap, and the
 * overlay that asks for it appears only when the player really has been blocked
 * (a watchdog, not a guess). After that tap every swipe plays on its own, which
 * is the behaviour a feed has to have to be a feed.
 */
/**
 * How much of the screen's height is kept off the picture, for the caption and
 * the swipe hint beneath it. Enough for two lines of Devanagari, a channel name
 * and the hint — and it costs nothing on a phone, where the picture is limited
 * by the screen's width long before its height.
 */
const CAPTION_SPACE = "7rem";

export function ShortsPlayer({ clips, startIndex }: { clips: Short[]; startIndex: number }) {
  const router = useRouter();
  const scroller = useRef<HTMLDivElement | null>(null);
  const host = useRef<HTMLDivElement | null>(null);
  const player = useRef<YouTubePlayer | null>(null);
  const [active, setActive] = useState(startIndex);
  /** the player is up but the browser refused to start it — ask for a tap */
  const [blocked, setBlocked] = useState(false);
  /** hidden the moment they move: it is an instruction, not a label */
  const [showHint, setShowHint] = useState(clips.length > 1);

  const clip = clips[active];

  // Land on the clip that was tapped. Instant, not animated: this is where the
  // screen starts, and scrolling to it would look like it had scrolled away —
  // which is also why the scroller does not carry `scroll-smooth` as a class.
  // Assigning `scrollTop` obeys that CSS, so the class would animate this too.
  useEffect(() => {
    const el = scroller.current;
    if (!el || startIndex === 0) return;
    el.scrollTop = startIndex * el.clientHeight;
  }, [startIndex]);

  // Hidden once they have actually moved to another clip — **not** on the first
  // scroll event, which is the line above doing the landing and would put the
  // instruction out of sight before it had been read.
  useEffect(() => {
    if (active !== startIndex) setShowHint(false);
  }, [active, startIndex]);

  // Which clip is on screen. A threshold rather than the scroll position, so a
  // half-finished swipe that snaps back does not count as an arrival.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (!Number.isNaN(index)) setActive(index);
        }
      },
      { root: el, threshold: 0.6 }
    );
    for (const section of el.querySelectorAll("[data-index]")) io.observe(section);
    return () => io.disconnect();
  }, [clips.length]);

  // The one live player, rebuilt whenever the clip on screen changes.
  useEffect(() => {
    const current = clips[active];
    const mount = host.current;
    if (!current || !current.isEmbeddable || !mount) return;

    let cancelled = false;
    let watchdog: ReturnType<typeof setTimeout> | null = null;
    setBlocked(false);

    void loadIframeApi().then(() => {
      if (cancelled || !window.YT || !host.current) return;
      player.current = new window.YT.Player(host.current, {
        videoId: current.videoId,
        playerVars: {
          autoplay: 1,
          // Without this iOS Safari takes the video full screen in its own
          // player the moment it starts, which loses the feed and the swipe.
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          // A short that stops on its last frame is a black screen asking to be
          // swiped; looping is what the form does. `playlist` is how the embed
          // loops a single video — it has no other meaning here.
          loop: 1,
          playlist: current.videoId,
        },
        events: {
          onReady: (e) => {
            e.target.playVideo?.();
            // Blocked autoplay looks exactly like slow autoplay for the first
            // moment, so the overlay waits to be sure rather than flashing on
            // every clip.
            watchdog = setTimeout(() => {
              if (cancelled) return;
              const playing = window.YT?.PlayerState?.PLAYING ?? 1;
              if (e.target.getPlayerState?.() !== playing) setBlocked(true);
            }, 1500);
          },
          onStateChange: (e) => {
            if (e.data === (window.YT?.PlayerState?.PLAYING ?? 1)) {
              setBlocked(false);
              track("short_play", { id: current.videoId });
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (watchdog !== null) clearTimeout(watchdog);
      // Frees the iframe and stops the audio. Without it the clip you swiped
      // away from keeps talking underneath the one you are watching.
      player.current?.destroy?.();
      player.current = null;
    };
  }, [active, clips]);

  const step = useCallback((by: number) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ top: by * el.clientHeight, behavior: "smooth" });
  }, []);

  const close = useCallback(() => {
    // Back keeps the home page's scroll position and the rail where it was. A
    // shared link has no history to go back to, so it lands on Home instead.
    if (window.history.length > 1) router.back();
    else router.push("/");
  }, [router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        step(1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        step(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, step]);

  return (
    <div className="fixed inset-0 z-50 bg-black text-white">
      <div
        ref={scroller}
        className="h-dvh snap-y snap-mandatory overflow-y-auto overscroll-contain"
      >
        {clips.map((c, i) => (
          <section
            key={c.id}
            data-index={i}
            aria-label={c.title}
            className="relative flex h-dvh snap-start flex-col items-center justify-center overflow-hidden"
          >
            {/*
              The box the clip plays in: 9:16, as tall as the screen allows and
              never wider than it. Letting the player fill the viewport instead
              would letterbox a vertical video inside a taller phone screen and
              strand it in the middle of a desktop one — this way the picture is
              the largest it can honestly be.

              `CAPTION_SPACE` is held back from its height so the words below
              always have somewhere to be. Overlaying them on the picture was the
              first thing tried and it lost to YouTube's own control bar, which
              sits in exactly that place and, on a desktop with a mouse resting
              over the player, never goes away.
            */}
            <div
              className="relative aspect-9/16 w-full"
              style={{
                maxHeight: `calc(100dvh - ${CAPTION_SPACE})`,
                maxWidth: `calc((100dvh - ${CAPTION_SPACE}) * 9 / 16)`,
              }}
            >
              {/* The still, under everything: it is what the clip looks like
                  before its player exists, and what it looks like on the slides
                  that have none. */}
              {c.poster && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.poster}
                  alt=""
                  // Sixty stills at ~50 kB each is three megabytes to open a
                  // screen showing one of them. Lazy leaves that to the browser,
                  // which fetches the ones near the viewport and no more —
                  // except the one being opened, which is wanted now.
                  loading={i === startIndex ? "eager" : "lazy"}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}

              {i === active && c.isEmbeddable && (
                // Wrapped, and keyed on the clip. The IFrame API *replaces* the
                // element it is given, so React must only ever be asked to
                // remove this wrapper — never the node that is no longer there.
                <div key={c.videoId} className="absolute inset-0">
                  <div ref={host} className="h-full w-full" />
                </div>
              )}

              {/* A clip its uploader has blocked from embedding. It stays in the
                  feed — hiding it would leave a gap nobody could explain — and
                  says what it is instead of failing silently. */}
              {!c.isEmbeddable && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/55 px-8 text-center">
                  <p className="text-sm text-white/80">
                    This clip can only be played on YouTube.
                  </p>
                  <a
                    href={c.watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white px-5 font-semibold text-black"
                  >
                    Watch on YouTube <span aria-hidden>↗</span>
                  </a>
                </div>
              )}

              {i === active && blocked && c.isEmbeddable && (
                <button
                  type="button"
                  onClick={() => {
                    player.current?.playVideo?.();
                    setBlocked(false);
                  }}
                  className="absolute inset-0 flex items-center justify-center bg-black/35"
                  aria-label={`Play ${c.title}`}
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-black">
                    <PlayIcon className="h-7 w-7" />
                  </span>
                </button>
              )}

            </div>

            {/* Under the picture, in the space held back for it. Its width is
                the picture's, so the words line up with the frame above them. */}
            <div
              className="w-full px-4 pt-3"
              style={{ maxWidth: `calc((100dvh - ${CAPTION_SPACE}) * 9 / 16)` }}
            >
              <p
                {...contentLang(c.title)}
                className={`${contentLang(c.title).className} hi-tight line-clamp-2 text-base font-semibold`}
              >
                {c.title}
              </p>
              <p className="mt-1 text-xs text-white/60">{c.channel.title}</p>
              {/* Always mounted, faded rather than removed: taking it out would
                  re-centre everything above it the moment they scroll. */}
              <p
                className={`mt-2 text-xs text-white/45 transition-opacity ${
                  showHint ? "opacity-100" : "opacity-0"
                }`}
              >
                Swipe up for the next one
              </p>
            </div>
          </section>
        ))}
      </div>

      {/* Chrome, above the scroller so it stays put while the feed moves. */}
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm"
      >
        <CloseIcon className="h-5 w-5" />
      </button>

      {/* Screen readers get the position; sighted viewers have the scrollbar and
          the clip itself, and a counter over the picture would be one more thing
          in front of it. */}
      <p className="sr-only" aria-live="polite">
        Clip {active + 1} of {clips.length}
        {clip ? `: ${clip.title}` : ""}
      </p>
    </div>
  );
}
