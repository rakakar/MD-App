"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CloseIcon,
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
} from "@/components/shell/icons";
import { ownsViewport } from "@/lib/routes";
import { SKIP_SECONDS, usePlayer, type PlayerSource } from "./PlayerProvider";

/**
 * How long the pill takes to leave — the same 280ms its entrance takes, and
 * the number the stylesheet animates over. Kept here because the pill has to
 * stay mounted for exactly that long after the player has already stopped.
 */
const LEAVE_MS = 280;



/**
 * Persistent bottom-bar player (PRD §6) — lives in the app shell, survives
 * route and workspace changes. Sits above the mobile bottom nav.
 */
export function PlayerBar() {
  const player = usePlayer();
  // The last thing that was playing, kept so the pill has something to draw
  // while it leaves: `close` clears the source in the same tick, and a pill
  // whose title vanished mid-slide would be a strip of empty ground sliding
  // off the screen.
  const last = useRef<PlayerSource | null>(null);
  if (player.source) last.current = player.source;

  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (player.source) {
      setLeaving(false);
      return;
    }
    if (!last.current) return;
    setLeaving(true);
    const timer = setTimeout(() => {
      last.current = null;
      setLeaving(false);
    }, LEAVE_MS);
    return () => clearTimeout(timer);
  }, [player.source]);

  const source = player.source ?? (leaving ? last.current : null);
  if (!source) return null;
  return <PlayerBarInner source={source} leaving={leaving} />;
}

function PlayerBarInner({
  source,
  /** stopped, and on its way out — see `PlayerBar` */
  leaving,
}: {
  source: PlayerSource;
  leaving: boolean;
}) {
  const player = usePlayer();
  const router = useRouter();
  const barRef = useRef<HTMLDivElement>(null);
  // Only where it sits differs now: inside a book it clears the reader's own
  // bottom bar, everywhere else the tab bar.
  const reader = ownsViewport(usePathname());

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    // The pill floats over the page in both places, so it takes no layout in
    // either — `--player-h` stays 0 and the shelf no longer reserves a strip
    // for it. That is the trade the pill makes: it is a lighter object over
    // the content instead of a band under it, and the last row of a list can
    // pass beneath it. Scroll a thumb's width and the row is clear.
    const publish = () => {
      const root = document.documentElement.style;
      root.setProperty("--player-h", "0px");
      // What a *floating* control has to clear to sit above the pill. The
      // reader's selection bar is the one other thing that floats in this
      // corner, and without this it lands on top of the pill — both were
      // clearing the same bar and neither knew about the other.
      root.setProperty("--player-float-h", reader ? `${el.offsetHeight + 10}px` : "0px");
    };
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.setProperty("--player-h", "0px");
      document.documentElement.style.setProperty("--player-float-h", "0px");
    };
  }, [reader]);

  const device = source.kind === "device";
  /**
   * The overlay pill names the book first and the chapter second, which is the
   * other way round from the bar's `title`/`subtitle`. The bar is a strip on a
   * shelf where the book is not otherwise on screen; the pill floats inside the
   * book, over its own pages, under a top bar that already reads book-then-
   * chapter. A recording is not a chapter of anything, so there it is the
   * track's own pair either way.
   */
  const pillTitle = source.kind === "track" ? source.title : source.bookTitle;
  const pillSubtitle =
    source.kind === "track" ? (source.subtitle ?? "") : source.chapterTitle;

  /**
   * Back up to the full listening screen.
   *
   * A chapter's Audio Mode is drawn by the reader, because it follows the
   * chapter's text — so from anywhere else this first goes to the chapter that
   * is playing and lets the reader put it up on arrival, which is also the
   * honest thing for the tap to do: it takes you to what you are listening to.
   *
   * A recording has no text and no page to return to, so `TrackAudioMode`
   * hangs off the shell and simply opens where you stand.
   */
  const chapter =
    source.kind === "tts" || source.kind === "device"
      ? { code: source.bookCode, number: source.chapterNumber }
      : null;
  const expand = chapter
    ? () => {
        if (!reader) {
          router.push(`/books/${encodeURIComponent(chapter.code)}/${chapter.number}`);
        }
        player.openAudioMode();
      }
    : () => player.openAudioMode();

  /**
   * Inside a book: **the overlay pill** (comp "Read mode - Audio widget
   * overlay").
   *
   * The reader is the one screen with no room for a bar. Its own chrome already
   * owns the foot of the window, the page owns everything above it, and a
   * full-width strip between them turned the bottom fifth of a reading screen
   * into three stacked bands of controls. So here the player is a floating pill
   * on the same near-black `overlay` the selection bar uses — the app's one
   * surface that sits *over* the page — carrying only what a reader listening
   * to a chapter reaches for without looking: stop, ±15 seconds, pause.
   *
   * Everything else it drops is a tap away and better placed: the scrub bar,
   * the speed, the sleep timer and the voice picker are all in Audio Mode,
   * which is what the title opens.
   */
  return (
    <div
      ref={barRef}
      role="region"
      aria-label="Audio player"
      // Re-keyed on the audio-mode flag so collapsing remounts the pill and
      // its entrance replays. It stays mounted the whole time Audio Mode is
      // up — merely covered — so without this it would simply be revealed.
      key={player.audioModeOpen ? "expanded" : "collapsed"}
      // Nothing to press on the way out: the source is already gone, so the
      // controls would be acting on a player that has stopped.
      inert={leaving || undefined}
      // `player-pill` carries the ground — see globals; the equaliser is
      // painted there rather than here because it is six gradient layers and
      // a sweep, which is a stylesheet's job and not a class list's.
      className={`player-pill ${
        leaving ? "player-pill-out" : "player-pill-in"
      } fixed inset-x-3 z-40 flex items-center gap-2 rounded-2xl px-3 py-2.5 text-white shadow-raised lg:left-[15.75rem]`}
      style={{
        // Inside a book it clears the reader's own bottom bar; everywhere else
        // it clears the tab bar. Same pill, one number apart — on a desktop
        // there is neither, so it sits on the floor beside the sidebar.
        bottom: reader
          ? "calc(env(safe-area-inset-bottom) + 3.75rem)"
          : "calc(env(safe-area-inset-bottom) + 3.9rem)",
      }}
    >
      <button
        type="button"
        onClick={player.close}
        aria-label="Stop listening"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/70 active:bg-white/15"
      >
        <CloseIcon className="h-4.5 w-4.5" />
      </button>

      {/* The book on top, the chapter under it — the same order as the
          reader's own top bar, so the pill reads as the strip that was
          already there rather than as a second, differently-ordered one. */}
      <button
        type="button"
        onClick={expand}
        aria-label="Open audio mode"
        className="flex min-w-0 flex-1 flex-col text-left"
      >
        <span className="hi hi-tight w-full truncate text-sm font-semibold">
          {pillTitle}
        </span>
        <span className="hi hi-tight w-full truncate text-xs text-white/70">
          {pillSubtitle}
        </span>
      </button>

      <button
        type="button"
        onClick={() => player.skipSeconds(-SKIP_SECONDS)}
        aria-label={device ? "Previous paragraph" : `Back ${SKIP_SECONDS} seconds`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white active:bg-white/15"
      >
        <SkipBackIcon className="h-5.5 w-5.5" seconds={device ? "\u00b6" : SKIP_SECONDS} />
      </button>
      <button
        type="button"
        onClick={player.toggle}
        aria-label={player.playing ? "Pause" : "Play"}
        // Terracotta to start, cream to stop — the same pair Audio Mode's own
        // play button wears, so the two read as one player in two sizes.
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors active:scale-95 ${
          player.playing ? "bg-audio-ink text-overlay" : "text-white"
        }`}
        style={player.playing ? undefined : { background: "var(--ws-color)" }}
      >
        {player.playing ? (
          <PauseIcon className="h-5 w-5" />
        ) : (
          <PlayIcon className="ms-0.5 h-5 w-5" />
        )}
      </button>
      <button
        type="button"
        onClick={() => player.skipSeconds(SKIP_SECONDS)}
        aria-label={device ? "Next paragraph" : `Forward ${SKIP_SECONDS} seconds`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white active:bg-white/15"
      >
        <SkipForwardIcon className="h-5.5 w-5.5" seconds={device ? "\u00b6" : SKIP_SECONDS} />
      </button>
    </div>
  );
}
