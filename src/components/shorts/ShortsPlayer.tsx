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
 * **It plays by itself, muted, and asks once for sound.** A feed that opens on
 * a still with a play button in the middle of it is not a feed. Browsers will
 * always autoplay a muted video and will not reliably autoplay an audible one,
 * so the clip starts silent and the first tap anywhere turns the sound on — for
 * that clip and every one after it, since the choice is remembered for the
 * session. These are people speaking, so the offer is on screen the whole time
 * it is silent rather than being something to discover.
 *
 * **Nothing of YouTube's is on the picture.** `controls: 0` takes the bar, the
 * title, the channel and the Watch-on-YouTube button off it: this screen exists
 * so that a clip can be watched *here*, and a permanent link out of it is the
 * one thing on it that contradicts that. What that removes has to be given back
 * in our own terms, so a tap on the picture is play/pause and the caption sits
 * over the foot of it — which it now can, having lost the control bar it used
 * to collide with.
 *
 * **One ends, the next begins.** The clip does not loop; on its last frame the
 * feed scrolls itself on, which is what makes this something a reader can put
 * down and keep watching rather than a thing to keep swiping.
 */

export function ShortsPlayer({ clips, startIndex }: { clips: Short[]; startIndex: number }) {
  const router = useRouter();
  const scroller = useRef<HTMLDivElement | null>(null);
  const host = useRef<HTMLDivElement | null>(null);
  const player = useRef<YouTubePlayer | null>(null);
  const [active, setActive] = useState(startIndex);
  /** the player is up but the browser refused to start it even muted */
  const [blocked, setBlocked] = useState(false);
  /**
   * Sound, once asked for, stays on for the rest of the session — a viewer who
   * turned it on for one clip has said what they want from the feed, and asking
   * again at every swipe would be a tap per clip.
   */
  const [sound, setSound] = useState(false);
  /**
   * The same answer, readable from inside the player effect without being one
   * of its dependencies. Turning the sound on must *not* rebuild the player —
   * that would restart the clip from zero at the exact moment the viewer asked
   * to hear it — so the live player is unmuted in place and only the next one
   * is constructed differently.
   */
  const soundRef = useRef(false);
  const [paused, setPaused] = useState(false);
  /** how far through the clip on screen is, 0–1 */
  const [progress, setProgress] = useState(0);
  /**
   * The clip's true shape, so the picture can be made to *cover* the screen.
   *
   * A short is not always 9:16. This channel's are square — the portrait on
   * black, 1080×1080 — and YouTube fits a video into whatever box it is given,
   * so a square clip in a 9:16 box is a square with a black band above and
   * below it, which is exactly the letterboxing this screen exists not to have.
   * Sizing the box by the clip's own ratio instead means the picture always
   * fills the screen and the crop falls on the parts a centred subject can
   * spare.
   *
   * Measured from `oardefault.jpg`, YouTube's *original aspect ratio* still,
   * which the feed is already loading for the slide. 9:16 until it answers,
   * which is the shape most shorts are and the one that crops least if it is
   * wrong.
   */
  const [ratio, setRatio] = useState(9 / 16);
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

  /** how far to scroll the feed, in whole screens */
  const stepRef = useRef<(by: number) => void>(() => {});

  /**
   * How far through the clip is — polled, because the IFrame API has no event
   * for it.
   *
   * Four times a second, which is finer than the eye reads a 3px line and far
   * cheaper than the animation frame a smoother bar would cost. One timer for
   * the whole feed, not one per slide: only the clip on screen has a player,
   * and the bar is only drawn there.
   */
  useEffect(() => {
    setProgress(0);
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

  // The one live player, rebuilt whenever the clip on screen changes.
  useEffect(() => {
    const current = clips[active];
    const mount = host.current;
    if (!current || !current.isEmbeddable || !mount) return;

    let cancelled = false;
    let watchdog: ReturnType<typeof setTimeout> | null = null;
    setBlocked(false);
    setPaused(false);

    void loadIframeApi().then(() => {
      if (cancelled || !window.YT || !host.current) return;
      player.current = new window.YT.Player(host.current, {
        videoId: current.videoId,
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
          // Nothing of YouTube's over the picture: no control bar, no title,
          // no channel, no Watch-on-YouTube, no annotations, no keyboard
          // shortcuts belonging to a player the viewer cannot see. Play and
          // pause come back as a tap on the picture, below.
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
        },
        events: {
          onReady: (e) => {
            if (soundRef.current) e.target.unMute?.();
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
            const states = window.YT?.PlayerState;
            if (e.data === (states?.PLAYING ?? 1)) {
              setBlocked(false);
              setPaused(false);
              track("short_play", { id: current.videoId });
            } else if (e.data === (states?.PAUSED ?? 2)) {
              setPaused(true);
            } else if (e.data === (states?.ENDED ?? 0)) {
              // On to the next one by itself. The clip no longer loops: a feed
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
            className="relative flex h-dvh snap-start items-center justify-center overflow-hidden"
          >
            {/*
              **The whole clip, across the whole width.**

              These are not 9:16 clips — this channel's are square, a portrait on
              black — and there is no way to fill a phone screen with a square
              picture except by throwing a third of it away. The face is the
              subject: cropping to fit would take the top of his head off to
              avoid two bands of the black the picture is mostly made of.

              So it is as wide as the screen and as tall as its own ratio makes
              it, centred, whole. A clip that really is 9:16 fills the screen
              exactly — the width gives it the height. What is left above and
              below is the black this screen is anyway.
            */}
            {/* The stage. On a phone it *is* the screen; on a desktop window it
                is a phone-shaped column in the middle of one, because a square
                clip made to cover a 1280px window would be cropped to a band
                across the middle of itself. Everything below — picture, tap
                layer, caption — lives inside it, so the words stay with the
                picture at every width. */}
            <div className="relative h-dvh w-full max-w-[calc(100dvh*9/16)] overflow-hidden">
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
                  // Contained, like the player it stands in for — a still that
                  // filled the screen would jump to a smaller picture the moment
                  // the video arrived.
                  className="absolute inset-0 h-full w-full object-contain"
                />
              )}

              {i === active && c.isEmbeddable && (
                // Wrapped, and keyed on the clip. The IFrame API *replaces* the
                // element it is given, so React must only ever be asked to
                // remove this wrapper — never the node that is no longer there.
                <div
                  key={c.videoId}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    // The stage's full width, unless the clip is tall enough
                    // that its own height would then overflow — in which case
                    // the height decides. Either way the whole frame is on
                    // screen.
                    width: `min(100%, calc(100dvh * ${ratio}))`,
                    aspectRatio: `${ratio}`,
                  }}
                >
                  <div ref={host} className="h-full w-full" />
                  {/*
                    **The lid**, and it belongs to the picture rather than to the
                    screen. YouTube writes its title and channel across the top
                    of *the player*, which with bands above and below is not the
                    top of the screen — a scrim pinned to the window would cover
                    black and leave the title showing on the picture underneath
                    it. Opaque where their strip sits, fading out below it.
                  */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-black via-black/85 to-transparent"
                  />
                </div>
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
              The picture is also the button — play, pause, and the first tap of
              all, which is the one that turns the sound on. It sits over the
              iframe on purpose twice over: `controls: 0` left the player with
              nothing to press, and an iframe swallows the drag of a swipe, so
              the feed scrolls far better with a layer of our own on top of it.
            */}
            {i === active && c.isEmbeddable && (
              <button
                type="button"
                onClick={tap}
                aria-label={sound ? (paused ? `Play ${c.title}` : `Pause ${c.title}`) : "Turn on sound"}
                className="absolute inset-0 z-10 h-full w-full"
              >
                {(paused || blocked) && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25">
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
              swipe would be a control that mostly misfires, and the clip is a
              minute long.
            */}
            {i === active && c.isEmbeddable && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[3px] bg-white/20"
              >
                <div
                  className="h-full bg-white/90 transition-[width] duration-200 ease-linear"
                  style={{ width: `${Math.round(progress * 1000) / 10}%` }}
                />
              </div>
            )}

            {/* Over the foot of the picture now, not in a strip below it. The
                strip existed because YouTube's control bar sat here and won
                every argument about the space; with the controls gone the words
                can be where the form puts them, on a scrim dark enough to hold
                them against any frame. */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-10">
              <p
                {...contentLang(c.title)}
                className={`${contentLang(c.title).className} hi-tight line-clamp-2 text-base font-semibold`}
              >
                {c.title}
              </p>
              {/* Always mounted, faded rather than removed: taking it out would
                  re-centre everything above it the moment they scroll. */}
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

      {/* Chrome, above the scroller so it stays put while the feed moves. */}
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        /* Above the slides' own scrims (`z-10`), which sit above the player's
           compositing layer: three levels, and the way out is the top one. */
        className="absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm"
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
