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
 * A vertical scroll-snap column, one clip per screen, over **one player that
 * lives for the whole screen** and is handed a new video as the feed moves.
 * Every slide is its own still; the player is a single element floating above
 * them, on whichever slide is current.
 *
 * **That the player is reused is the load-bearing decision.** Building a fresh
 * one per clip is the obvious shape and it fails on a phone: iOS grants
 * permission to play to a *player*, not to a page, so the second clip — built
 * after the swipe, with no tap of its own — sat there showing YouTube's idle
 * screen and its red Shorts button until it was tapped. One player keeps the
 * permission the first clip earned, and `loadVideoById` starts the next video
 * inside it.
 *
 * **The player is only on screen while it is actually playing.** Underneath is
 * the slide's own still, which is what shows while a video is loading, while
 * the feed is being swiped, and while it is paused. That is not a nicety: the
 * one thing `controls: 0` cannot take off a YouTube embed is the idle state —
 * the title, the channel, the share arrow and the red Shorts mark it draws
 * before it starts — and the only way to keep them off this screen is to not
 * show the player until there is a picture in it.
 *
 * **Swiping is the browser's own scroll**, not a gesture handler. Scroll-snap
 * gives momentum, rubber-banding, trackpads, mouse wheels, arrow keys, screen
 * readers and page-up all at once, and every hand-written swipe recogniser
 * gives back a worse version of the first two and none of the rest.
 *
 * **It plays by itself, muted, and asks once for sound.** Browsers will always
 * autoplay a muted video and will not reliably autoplay an audible one, so the
 * clip starts silent and the first tap turns the sound on — for that clip and
 * every one after it.
 *
 * **One ends, the next begins.** The clip does not loop; on its last frame the
 * feed scrolls itself on, which is what makes this something to be carried by
 * rather than a thing to keep swiping.
 */
export function ShortsPlayer({ clips, startIndex }: { clips: Short[]; startIndex: number }) {
  const router = useRouter();
  const scroller = useRef<HTMLDivElement | null>(null);
  const host = useRef<HTMLDivElement | null>(null);
  const player = useRef<YouTubePlayer | null>(null);
  const [active, setActive] = useState(startIndex);

  /**
   * The player has a picture in it — it has reported PLAYING for the clip now
   * on screen. Until then the still is what is shown, which is how YouTube's
   * idle screen is kept off this one.
   */
  const [started, setStarted] = useState(false);
  /** paused by the viewer, after it had started — the frame stays on screen */
  const [paused, setPaused] = useState(false);
  /** mid-swipe: the player is a fixed element and does not travel with the slides */
  const [scrolling, setScrolling] = useState(false);
  /** the player is up but the browser refused to start it even muted */
  const [blocked, setBlocked] = useState(false);

  /**
   * Sound, once asked for, stays on for the rest of the session — a viewer who
   * turned it on for one clip has said what they want from the feed, and asking
   * again at every swipe would be a tap per clip. Held as a ref as well, so the
   * player's own callbacks can read it without being rebuilt.
   */
  const [sound, setSound] = useState(false);
  const soundRef = useRef(false);

  /** how far through the clip on screen is, 0–1 */
  const [progress, setProgress] = useState(0);

  /**
   * The clip's true shape.
   *
   * A short is not always 9:16 — this channel's are square, a portrait on black
   * — and YouTube fits a video into whatever box it is given. Sizing the box by
   * the clip's own ratio is what puts the picture at the screen's full width
   * with its whole frame intact, rather than inside margins of our making.
   *
   * Measured from `oardefault.jpg`, YouTube's *original aspect ratio* still,
   * which the feed is already loading for the slide.
   */
  const [ratio, setRatio] = useState(9 / 16);
  /** hidden the moment they move: it is an instruction, not a label */
  const [showHint, setShowHint] = useState(clips.length > 1);

  const clip = clips[active];
  const playable = clip?.isEmbeddable ?? false;
  /** the picture is up, so the still beneath it can be covered */
  const showPlayer = started && !scrolling && playable;

  /**
   * The page itself goes black while the feed is up.
   *
   * The feed is `position: fixed`, which covers the *layout* viewport — and on
   * iOS the visual viewport is taller than that whenever Safari's toolbar is
   * retracted, so the app's own paper showed through as a white band along the
   * bottom of a black screen. Nothing sized in `dvh` can close that gap,
   * because the gap is outside what the fixed layer is measured against; the
   * only thing that reaches it is the document's own background.
   */
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.backgroundColor;
    root.style.backgroundColor = "#000";
    return () => {
      root.style.backgroundColor = previous;
    };
  }, []);

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

  // Whether the feed is moving. The player is one fixed element rather than a
  // child of a slide, so during a swipe it would hang in the middle of the
  // screen while the pictures slid past it; hidden, the slides' own stills do
  // the travelling and it reappears when the feed settles.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let idle: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      setScrolling(true);
      if (idle !== null) clearTimeout(idle);
      idle = setTimeout(() => setScrolling(false), 140);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (idle !== null) clearTimeout(idle);
    };
  }, []);

  // The shape of the clip now on screen, from its own still.
  useEffect(() => {
    const poster = clips[active]?.poster;
    if (!poster) {
      setRatio(9 / 16);
      return;
    }
    let cancelled = false;
    const probe = new window.Image();
    probe.onload = () => {
      if (!cancelled && probe.naturalHeight > 0) {
        setRatio(probe.naturalWidth / probe.naturalHeight);
      }
    };
    probe.src = poster;
    return () => {
      cancelled = true;
      probe.onload = null;
    };
  }, [active, clips]);

  /** how far to scroll the feed, in whole screens — set below, called from the
   *  player's own callbacks, which are built once and outlive any one clip */
  const stepRef = useRef<(by: number) => void>(() => {});

  // **The player, built once for the screen.** Not per clip: see the note at
  // the top of the file — a player built after a swipe has no permission to
  // play and stops dead on iOS.
  useEffect(() => {
    const first = clips[startIndex];
    if (!first?.isEmbeddable || !host.current) return;

    let cancelled = false;
    let watchdog: ReturnType<typeof setTimeout> | null = null;

    void loadIframeApi().then(() => {
      if (cancelled || !window.YT || !host.current) return;
      player.current = new window.YT.Player(host.current, {
        videoId: first.videoId,
        playerVars: {
          autoplay: 1,
          // Muted unless the viewer has already asked for sound. This is the
          // whole of why the feed plays on arrival: an audible autoplay is at
          // the browser's discretion and a silent one is not.
          mute: soundRef.current ? 0 : 1,
          // Without this iOS Safari takes the video full screen in its own
          // player the moment it starts, which loses the feed and the swipe.
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          // Nothing of YouTube's over the picture *while it plays*; its idle
          // screen is dealt with by not showing the player until it does.
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
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
            }, 2000);
          },
          onStateChange: (e) => {
            const states = window.YT?.PlayerState;
            if (e.data === (states?.PLAYING ?? 1)) {
              setBlocked(false);
              setPaused(false);
              setStarted(true);
              track("short_play");
            } else if (e.data === (states?.PAUSED ?? 2)) {
              setPaused(true);
            } else if (e.data === (states?.ENDED ?? 0)) {
              // On to the next one by itself. The clip does not loop: a feed
              // that repeats the same sixty seconds asks the viewer to decide
              // when to leave it, and the whole point of the form is that it
              // carries them.
              stepRef.current(1);
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (watchdog !== null) clearTimeout(watchdog);
      player.current?.destroy?.();
      player.current = null;
    };
    // Once. `startIndex` is the address this screen was opened at and does not
    // change under it; every later clip arrives through `loadVideoById` below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The clip on screen, handed to the player that is already running. Hiding it
  // first is what keeps YouTube's loading screen — red button and all — from
  // being the thing a swipe reveals.
  useEffect(() => {
    const current = clips[active];
    if (!current?.isEmbeddable) return;
    setStarted(false);
    setPaused(false);
    setProgress(0);
    const p = player.current;
    if (!p?.loadVideoById) return;
    p.loadVideoById({ videoId: current.videoId });
    if (!soundRef.current) p.mute?.();
  }, [active, clips]);

  /**
   * How far through the clip is — polled, because the IFrame API has no event
   * for it. Four times a second, which is finer than the eye reads a 3px line
   * and far cheaper than the animation frame a smoother bar would cost.
   */
  useEffect(() => {
    const id = setInterval(() => {
      const p = player.current;
      if (!p) return;
      // The player's own length where it has one, the BE's seconds until it
      // does — so the bar is honest from the first tick rather than sitting at
      // zero while the video loads.
      const total = p.getDuration?.() || clips[active]?.seconds || 0;
      const at = p.getCurrentTime?.() ?? 0;
      if (total > 0) setProgress(Math.min(1, at / total));
    }, 250);
    return () => clearInterval(id);
  }, [active, clips]);

  const step = useCallback((by: number) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ top: by * el.clientHeight, behavior: "smooth" });
  }, []);

  /**
   * The last clip has nowhere to scroll on, so it starts again rather than
   * stopping on a black frame — the only place the feed repeats itself.
   */
  const stepOrReplay = useCallback(
    (by: number) => {
      if (by > 0 && active >= clips.length - 1) {
        player.current?.playVideo?.();
        return;
      }
      step(by);
    },
    [active, clips.length, step]
  );

  useEffect(() => {
    stepRef.current = stepOrReplay;
  }, [stepOrReplay]);

  /** The first tap is for sound; after that a tap is play/pause. */
  const tap = useCallback(() => {
    if (!soundRef.current) {
      soundRef.current = true;
      setSound(true);
      player.current?.unMute?.();
      player.current?.playVideo?.();
      return;
    }
    const states = window.YT?.PlayerState;
    if (player.current?.getPlayerState?.() === (states?.PLAYING ?? 1)) {
      player.current?.pauseVideo?.();
    } else {
      player.current?.playVideo?.();
    }
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
        stepOrReplay(1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        stepOrReplay(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, stepOrReplay]);

  /** the stage: the screen on a phone, a phone-shaped column on a desktop */
  const stage = "relative h-dvh w-full max-w-[calc(100dvh*9/16)]";

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
            className="relative flex h-dvh snap-start items-center justify-center overflow-hidden"
          >
            <div className={stage}>
              {/*
                The still — and on this screen it is not a placeholder. It is
                what shows while a clip loads, while the feed is being swiped
                and while it is paused, which between them are every moment the
                player is not to be seen.

                Contained, like the player above it: these clips are square, and
                cropping to fill would take the top of his head off to avoid
                bands of the black the picture is mostly made of.
              */}
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
                  className="absolute inset-0 h-full w-full object-contain"
                />
              )}

              {/* A clip its uploader has blocked from embedding. It stays in the
                  feed — hiding it would leave a gap nobody could explain — and
                  says what it is instead of failing silently. This is the one
                  place a link out is the whole answer. */}
              {!c.isEmbeddable && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/55 px-8 text-center">
                  <p className="text-sm text-white/80">This clip can only be played on YouTube.</p>
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

              {/*
                The picture is also the button — play, pause, and the first tap
                of all, which is the one that turns the sound on. It sits over
                the player on purpose twice over: `controls: 0` leaves nothing
                to press, and an iframe swallows the drag of a swipe, so the
                feed scrolls far better with a layer of our own on top of it.
              */}
              {i === active && c.isEmbeddable && (
                <button
                  type="button"
                  onClick={tap}
                  aria-label={
                    sound ? (paused ? `Play ${c.title}` : `Pause ${c.title}`) : "Turn on sound"
                  }
                  className="absolute inset-0 z-20 h-full w-full"
                >
                  {(paused || blocked) && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-black">
                        <PlayIcon className="h-7 w-7" />
                      </span>
                    </span>
                  )}
                  {/* Said out loud while it is silent, rather than left to be
                      discovered: these are people talking, and a viewer who does
                      not know the sound is one tap away is watching a mime. */}
                  {!sound && !paused && !blocked && (
                    <span className="absolute left-1/2 top-[calc(1.25rem+env(safe-area-inset-top))] -translate-x-1/2 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
                      Tap for sound
                    </span>
                  )}
                </button>
              )}

              {/*
                How far through, along the very foot of the screen — under the
                caption rather than over the picture, which is where a feed puts
                it and where it can be read without being looked at. A readout,
                not a scrubber: a 3px drag target under a thumb that is there to
                swipe would be a control that mostly misfires.
              */}
              {i === active && c.isEmbeddable && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[3px] bg-white/20"
                >
                  <div
                    className="h-full bg-white/90 transition-[width] duration-200 ease-linear"
                    style={{ width: `${Math.round(progress * 1000) / 10}%` }}
                  />
                </div>
              )}

              {/* Over the foot of the picture. Always mounted, the hint faded
                  rather than removed: taking it out would re-centre everything
                  above it the moment they scroll. */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-10">
                <p
                  {...contentLang(c.title)}
                  /* A size up from `text-base`. It is the only writing on the
                     screen and it is read at arm's length over a moving
                     picture, which is the one place in this app where 16px was
                     doing the work of a caption on a poster. */
                  className={`${contentLang(c.title).className} hi-tight line-clamp-2 text-lg font-semibold`}
                >
                  {c.title}
                </p>
                <p
                  className={`mt-1.5 text-xs text-white/55 transition-opacity ${
                    showHint ? "opacity-100" : "opacity-0"
                  }`}
                >
                  Swipe up for the next one
                </p>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/*
        **The player itself** — one element for the whole screen, over whichever
        slide is current. `pointer-events-none`, so the tap layer on the slide
        below owns every touch; invisible until it has a picture, so YouTube's
        idle screen is never what a swipe reveals.
      */}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <div className={`${stage} overflow-hidden`}>
          <div
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-150 ${
              showPlayer ? "opacity-100" : "opacity-0"
            }`}
            style={{
              // The stage's full width, unless the clip is tall enough that its
              // own height would then overflow — in which case the height
              // decides. Either way the whole frame is on screen.
              width: `min(100%, calc(100dvh * ${ratio}))`,
              aspectRatio: `${ratio}`,
            }}
          >
            <div ref={host} className="h-full w-full" />
            {/*
              **The lid**, and it belongs to the picture rather than to the
              screen. YouTube writes its title and channel across the top of
              *the player*, which with bands above and below is not the top of
              the screen — a scrim pinned to the window would cover black and
              leave the title showing on the picture underneath it.
            */}
            <div
              aria-hidden
              /* `z-10` is not decoration: this wrapper is transformed, which
                 promotes the iframe inside it to its own compositing layer, and
                 an overlay left at `z-index: auto` paints *under* it however
                 late it comes in the DOM. Losing this line is how YouTube's
                 title, channel and Shorts mark came back over the picture. */
              className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-black via-black/85 to-transparent"
            />
          </div>
        </div>
      </div>

      {/* Chrome, above everything, so it stays put while the feed moves. */}
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-40 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm"
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
