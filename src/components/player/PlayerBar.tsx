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
import { useIsDesktop } from "@/components/ui/Dialog";
import { RATES, fmt } from "./audioChrome";
import { ownsViewport } from "@/lib/routes";
import {
  SKIP_SECONDS,
  activeRendition,
  paraAtPosition,
  usePlayer,
  type PlayerSource,
} from "./PlayerProvider";

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
  //
  // State rather than a ref, because a ref would have to be written during
  // render to be ready in the same paint — and a render that writes is a
  // render React is allowed to throw away and redo.
  const [last, setLast] = useState<PlayerSource | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (player.source) {
      setLast(player.source);
      setLeaving(false);
      return;
    }
    if (!last) return;
    setLeaving(true);
    const timer = setTimeout(() => {
      setLast(null);
      setLeaving(false);
    }, LEAVE_MS);
    return () => clearTimeout(timer);
  }, [player.source, last]);

  const source = player.source ?? (leaving ? last : null);
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
  const desktop = useIsDesktop();

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

  if (reader && desktop && source.kind !== "track") {
    return (
      <DesktopReaderPill
        barRef={barRef}
        source={source}
        leaving={leaving}
        onExpand={expand}
      />
    );
  }

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
      // Deliberately *not* re-keyed on the audio-mode flag. It used to be, so
      // that collapsing remounted the pill and replayed its entrance — which
      // read as being uncovered while the entrance was a 22px settle. Now that
      // the pill rises its whole height from below the floor, the same replay
      // landed as a second, unrelated movement after the sheet had already
      // gone: the jump at the end of the collapse. The pill has been standing
      // there the whole time; the sheet dropping off it is the animation.
      // Nothing to press on the way out: the source is already gone, so the
      // controls would be acting on a player that has stopped.
      inert={leaving || undefined}
      // `player-pill` carries the ground — see globals; the equaliser is
      // painted there rather than here because it is six gradient layers and
      // a sweep, which is a stylesheet's job and not a class list's.
      className={`player-pill ${
        leaving ? "player-pill-out" : "player-pill-in"
      } fixed inset-x-3 z-40 flex flex-col rounded-2xl px-3 pb-2 pt-2.5 text-white shadow-raised lg:left-[15.75rem]`}
      style={{
        // Inside a book it clears the reader's own bottom bar; everywhere else
        // it clears the tab bar. Same pill, one number apart — on a desktop
        // there is neither, so it sits on the floor beside the sidebar.
        bottom: reader
          ? "calc(env(safe-area-inset-bottom) + 3.75rem)"
          : "calc(env(safe-area-inset-bottom) + 3.9rem)",
      }}
    >
      <div className="flex w-full items-center gap-2">
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
        aria-label={`Back ${SKIP_SECONDS} seconds`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white active:bg-white/15"
      >
        <SkipBackIcon className="h-5.5 w-5.5" seconds={SKIP_SECONDS} />
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
        aria-label={`Forward ${SKIP_SECONDS} seconds`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white active:bg-white/15"
      >
        <SkipForwardIcon className="h-5.5 w-5.5" seconds={SKIP_SECONDS} />
      </button>
      </div>

      {/* A recording and a recorded chapter are measured in time; the device
          voice has no timeline at all and is measured in paragraphs, which is
          the same question — how far in, how much left — asked of the only
          unit it has.

          The bar alone there, with no numbers at its ends. "¶ 4" and "52" are
          true and nobody wants them: a timecode is a thing a listener reaches
          for — how long until this is over — and a paragraph ordinal is only
          the machine explaining how it is counting. The length of the bar says
          the useful half by itself. The screen reader still gets the numbers,
          where a shape says nothing. */}
      {device && source.kind === "device" ? (
        <PillProgress
          percent={
            source.paras.length > 0
              ? ((player.deviceParaIndex + 1) / source.paras.length) * 100
              : 0
          }
          valueText={`Paragraph ${Math.min(
            player.deviceParaIndex + 1,
            source.paras.length
          )} of ${source.paras.length}`}
        />
      ) : player.durationMs > 0 ? (
        <PillProgress
          percent={(player.positionMs / player.durationMs) * 100}
          start={fmt(player.positionMs)}
          end={fmt(player.durationMs)}
          valueText={`${fmt(player.positionMs)} of ${fmt(player.durationMs)}`}
        />
      ) : null}
    </div>
  );
}

/**
 * How far in, and how far there is to go — **the pill's own floor**.
 *
 * The pill said what was playing and offered to move it, and never once said
 * where in a ninety-minute recording it had got to. Audio Mode has the scrub
 * bar, but that is a tap and a full screen away, and "how much of this is
 * left" is the question a listener asks most often and can least afford to
 * open a new surface for.
 *
 * A readout, not a scrubber. The pill is three finger-sized controls in a
 * 62px-tall strip; a drag target three pixels high wedged between them would
 * be a control that mostly misses, and the scrub bar that *is* draggable is
 * one tap away on the title. So this reports, and the ends carry the numbers.
 *
 * It takes a percentage and, optionally, the two labels — because the two
 * things it measures are not the same unit, and only one of them has ends
 * worth printing. See the caller.
 */
function PillProgress({
  percent,
  start,
  end,
  valueText,
}: {
  percent: number;
  /** the left end — where the listener is; omitted where that is not a time */
  start?: string;
  /** the right end — how much there is altogether */
  end?: string;
  valueText: string;
}) {
  const width = Math.min(100, Math.max(0, percent));

  return (
    <div className="mt-1.5 flex w-full items-center gap-2">
      {start && (
        <span className="shrink-0 text-xs font-medium tabular-nums text-white/70">{start}</span>
      )}
      <span
        role="progressbar"
        aria-label="Playback position"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(width)}
        aria-valuetext={valueText}
        className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-white/25"
      >
        <span className="block h-full rounded-full bg-white/90" style={{ width: `${width}%` }} />
      </span>
      {end && (
        <span className="shrink-0 text-xs font-medium tabular-nums text-white/70">{end}</span>
      )}
    </div>
  );
}

/**
 * **The desktop reader's mini player** (desktop revision, 3 Oct 2026): one
 * row floating at the foot of the page, centred under the reading column.
 * A desktop has the width the phone's pill lacks, so it carries what the
 * phone sends you to Audio mode for — the clock, the paragraph, the speed —
 * and keeps Audio mode one click away on ⤢. Speed steps through the rates on
 * each click; a menu for six values in a 40px button is a click too many.
 */
function DesktopReaderPill({
  barRef,
  source,
  leaving,
  onExpand,
}: {
  barRef: React.RefObject<HTMLDivElement | null>;
  source: Extract<PlayerSource, { kind: "tts" | "device" }>;
  leaving: boolean;
  onExpand: () => void;
}) {
  const player = usePlayer();
  const device = source.kind === "device";

  let para: { at: number; of: number } | null = null;
  if (source.kind === "device") {
    para = { at: Math.min(player.deviceParaIndex + 1, source.paras.length), of: source.paras.length };
  } else {
    const r = activeRendition(source);
    if (r) {
      const seqs = Object.keys(r.para_timings).map(Number).sort((a, b) => a - b);
      const seq = paraAtPosition(r.para_timings, player.positionMs);
      para = { at: seq === null ? 1 : seqs.indexOf(seq) + 1, of: seqs.length };
    }
  }
  const percent = device
    ? para && para.of
      ? (para.at / para.of) * 100
      : 0
    : player.durationMs
      ? (player.positionMs / player.durationMs) * 100
      : 0;
  const nextRate = RATES[(RATES.indexOf(player.rate) + 1) % RATES.length] ?? 1;

  const btn =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10";

  return (
    <div
      ref={barRef}
      role="region"
      aria-label="Audio player"
      inert={leaving || undefined}
      // Centred by its margins, not a translate: the pill's entrance and exit
      // animate `transform`, which would replace a -50% and push it right.
      className={`player-pill ${
        leaving ? "player-pill-out" : "player-pill-in"
      } fixed inset-x-0 bottom-6 z-40 mx-auto flex w-[min(40rem,calc(100%-2rem))] items-center gap-2 rounded-2xl py-2.5 pe-3 ps-2.5 text-white shadow-raised`}
    >
      <button
        type="button"
        onClick={player.toggle}
        aria-label={player.playing ? "Pause" : "Play"}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors active:scale-95 ${
          player.playing ? "bg-audio-ink text-overlay" : "text-white"
        }`}
        style={player.playing ? undefined : { background: "var(--ws-color)" }}
      >
        {player.playing ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="ms-0.5 h-5 w-5" />}
      </button>
      <button type="button" onClick={() => player.skipSeconds(-SKIP_SECONDS)} aria-label={`Back ${SKIP_SECONDS} seconds`} className={btn}>
        <SkipBackIcon className="h-5 w-5" seconds={SKIP_SECONDS} />
      </button>
      <button type="button" onClick={() => player.skipSeconds(SKIP_SECONDS)} aria-label={`Forward ${SKIP_SECONDS} seconds`} className={btn}>
        <SkipForwardIcon className="h-5 w-5" seconds={SKIP_SECONDS} />
      </button>

      <button type="button" onClick={onExpand} aria-label="Open audio mode" className="mx-2 min-w-0 flex-1 text-left">
        <span className="flex items-baseline gap-2">
          <span lang="hi" className="hi hi-tight min-w-0 truncate text-sm font-semibold">
            {source.chapterTitle}
          </span>
          {para && (
            <span className="shrink-0 text-xs tabular-nums text-white/55">
              Para {para.at} / {para.of}
            </span>
          )}
          {!device && player.durationMs > 0 && (
            <span className="ml-auto shrink-0 text-xs tabular-nums text-white/70">
              {fmt(player.positionMs)} / {fmt(player.durationMs)}
            </span>
          )}
        </span>
        <span
          role="progressbar"
          aria-label="Playback position"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percent)}
          className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/20"
        >
          <span className="block h-full rounded-full bg-audio-accent" style={{ width: `${Math.min(100, percent)}%` }} />
        </span>
      </button>

      <button
        type="button"
        onClick={() => player.setRate(nextRate)}
        aria-label={`Playback speed ${player.rate}x — change to ${nextRate}x`}
        className="flex h-8 min-w-10 shrink-0 items-center justify-center rounded-full border border-white/25 px-2 text-xs font-semibold tabular-nums transition-colors hover:bg-white/10"
      >
        {player.rate}×
      </button>
      <button type="button" onClick={onExpand} aria-label="Open audio mode" className={btn}>
        <ExpandIcon className="h-4.5 w-4.5" />
      </button>
      <button type="button" onClick={player.close} aria-label="Stop listening" className={btn}>
        <CloseIcon className="h-4.5 w-4.5" />
      </button>
    </div>
  );
}

/** two corners pulling apart — "open this larger" */
function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
    </svg>
  );
}
