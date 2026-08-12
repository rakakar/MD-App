"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  CloseIcon,
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
} from "@/components/shell/icons";
import { ownsViewport } from "@/lib/routes";
import { SKIP_SECONDS, activeRendition, usePlayer } from "./PlayerProvider";

const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];
const SLEEP_OPTIONS = [10, 20, 30, 45, 60];

function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const mm = h > 0 ? String(m % 60).padStart(2, "0") : String(m);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Persistent bottom-bar player (PRD §6) — lives in the app shell, survives
 * route and workspace changes. Sits above the mobile bottom nav.
 */
export function PlayerBar() {
  const player = usePlayer();
  if (!player.source) return null;
  return <PlayerBarInner />;
}

function PlayerBarInner() {
  const player = usePlayer();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState<"rate" | "sleep" | "voice" | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  // no bottom nav to clear inside a reader, and the reader stacks its own
  // controls on top of this bar via --player-h. True of the PDF reader too:
  // it drops the same chrome, so padding for a nav that isn't there would
  // float this bar above the bottom of the screen.
  const reader = ownsViewport(usePathname());

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    // Inside a book the pill *floats over* the page rather than stacking under
    // the reader's own bar, so it takes no layout: the reader keeps its chrome
    // at the foot of the screen, as the comp draws, and the pill sits above it
    // over the text. Everywhere else the bar is real furniture and publishes
    // its height so the page can clear it.
    const publish = () => {
      const root = document.documentElement.style;
      root.setProperty("--player-h", reader ? "0px" : `${el.offsetHeight}px`);
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

  const { source } = player;
  if (!source) return null;

  const rendition = activeRendition(source);
  const device = source.kind === "device";
  const title =
    source.kind === "track" ? source.title : source.chapterTitle;
  const subtitle =
    source.kind === "tts"
      ? `${source.bookTitle}${rendition ? ` · ${rendition.voice_label}` : ""}`
      : source.kind === "device"
        ? `${source.bookTitle} · Device voice`
        : (source.subtitle ?? "");
  const paraProgress = device
    ? `${Math.min(player.deviceParaIndex + 1, source.paras.length)} / ${source.paras.length}`
    : null;

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
  if (reader) {
    return (
      <div
        ref={barRef}
        role="region"
        aria-label="Audio player"
        className="fixed inset-x-3 z-40 flex items-center gap-2 rounded-hero bg-overlay px-3 py-2.5 text-white shadow-raised"
        // Above the reader's bottom bar by the same 3.75rem the selection bar
        // clears it with. One number for "what a floating control clears",
        // rather than two that drift apart.
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 3.75rem)" }}
      >
        <button
          type="button"
          onClick={player.close}
          aria-label="Stop listening"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/70 active:bg-white/15"
        >
          <CloseIcon className="h-4.5 w-4.5" />
        </button>

        <button
          type="button"
          onClick={expand}
          aria-label="Open audio mode"
          className="flex min-w-0 flex-1 flex-col text-left"
        >
          <span className="hi w-full truncate text-sm font-semibold leading-tight">
            {title}
          </span>
          <span className="hi w-full truncate text-xs text-white/70">{subtitle}</span>
        </button>

        <button
          type="button"
          onClick={() => player.skipSeconds(-SKIP_SECONDS)}
          aria-label={device ? "Previous paragraph" : `Back ${SKIP_SECONDS} seconds`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white active:bg-white/15"
        >
          <SkipBackIcon className="h-5.5 w-5.5" seconds={device ? "¶" : SKIP_SECONDS} />
        </button>
        <button
          type="button"
          onClick={player.toggle}
          aria-label={player.playing ? "Pause" : "Play"}
          // Cream on near-black, the one filled control here: the same pairing
          // Audio Mode gives its play button, so the two read as one player.
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-audio-ink text-overlay active:scale-95"
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
          <SkipForwardIcon className="h-5.5 w-5.5" seconds={device ? "¶" : SKIP_SECONDS} />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={barRef}
      role="region"
      aria-label="Audio player"
      className={`fixed inset-x-0 z-40 border-t backdrop-blur ${
        reader
          ? "bottom-[env(safe-area-inset-bottom)] border-(--reader-rule) bg-(--reader-bg)/95 text-(--reader-ink)"
          : "bottom-[calc(3.4rem+env(safe-area-inset-bottom))] border-rule bg-card/95 lg:bottom-0 lg:left-60"
      }`}
    >
      {/* Progress. The device voice exposes no timeline, so it gets a
          paragraph-based bar with no scrubbing rather than a dead seek bar. */}
      {device ? (
        <div
          className="h-1 w-full"
          role="progressbar"
          aria-label="Reading progress"
          aria-valuemin={0}
          aria-valuemax={source.paras.length}
          aria-valuenow={player.deviceParaIndex + 1}
          style={{
            background: `linear-gradient(to right, var(--ws-color) ${
              source.paras.length
                ? ((player.deviceParaIndex + 1) / source.paras.length) * 100
                : 0
            }%, var(--color-rule) 0)`,
          }}
        />
      ) : (
        <input
          type="range"
          aria-label="Seek"
          min={0}
          max={player.durationMs || 1}
          value={Math.min(player.positionMs, player.durationMs || 0)}
          onChange={(e) => player.seekMs(Number(e.target.value))}
          className="block h-1 w-full cursor-pointer appearance-none bg-transparent align-top accent-(--ws-color)"
          style={{
            background: `linear-gradient(to right, var(--ws-color) ${
              player.durationMs ? (player.positionMs / player.durationMs) * 100 : 0
            }%, var(--color-rule) 0)`,
          }}
        />
      )}
      <div className="flex items-center gap-1.5 px-3 py-2 sm:gap-3">
        {/* Skip flanks play, as it does on every player people already use.
            The device voice has no timeline, so there the same two buttons
            step a paragraph — the label says so, and the icon shows ¶. */}
        <button
          type="button"
          onClick={() => player.skipSeconds(-SKIP_SECONDS)}
          aria-label={device ? "Previous paragraph" : `Back ${SKIP_SECONDS} seconds`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-ink/5"
        >
          <SkipBackIcon className="h-5.5 w-5.5" seconds={device ? "¶" : SKIP_SECONDS} />
        </button>

        <button
          type="button"
          onClick={player.toggle}
          aria-label={player.playing ? "Pause" : "Play"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
          style={{ background: "var(--ws-color)" }}
        >
          {player.playing ? <PauseIcon className="h-4.5 w-4.5" /> : <PlayIcon className="h-4.5 w-4.5" />}
        </button>

        <button
          type="button"
          onClick={() => player.skipSeconds(SKIP_SECONDS)}
          aria-label={device ? "Next paragraph" : `Forward ${SKIP_SECONDS} seconds`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-ink/5"
        >
          <SkipForwardIcon className="h-5.5 w-5.5" seconds={device ? "¶" : SKIP_SECONDS} />
        </button>

        {/* The title is the way back into Audio Mode — the whole strip, not a
            5mm chevron, because that is the target a thumb actually finds. */}
        <button
          type="button"
          onClick={expand}
          aria-label="Open audio mode"
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="hi block truncate text-sm font-medium leading-tight">{title}</span>
            <span className="block truncate text-xs text-ink-soft">
              {subtitle}
              {rendition?.is_stale && (
                <span className="ml-1 text-xs text-ink-soft/80" title="Text was edited after this audio was generated">
                  · Older audio
                </span>
              )}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 rotate-180 text-ink-soft" />
        </button>

        <span className="hidden text-xs tabular-nums text-ink-soft sm:block">
          {device ? `Para ${paraProgress}` : `${fmt(player.positionMs)} / ${fmt(player.durationMs)}`}
        </span>

        {/* voice picker (TTS only, multiple renditions) */}
        {source.kind === "tts" && source.renditions.length > 1 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(menuOpen === "voice" ? null : "voice")}
              className="rounded-full border border-rule px-2 py-1 text-xs font-medium"
              aria-haspopup="menu"
              aria-expanded={menuOpen === "voice"}
            >
              Voice
            </button>
            {menuOpen === "voice" && (
              <div role="menu" className="absolute bottom-full right-0 mb-2 w-44 rounded-xl border border-rule bg-card py-1 shadow-lg">
                {source.renditions.map((r) => (
                  <button
                    key={r.voice_key}
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      player.switchVoice(r.voice_key);
                      setMenuOpen(null);
                    }}
                    className={`hi block w-full px-3 py-1.5 text-left text-sm hover:bg-ink/5 ${
                      r.voice_key === source.voiceKey ? "font-bold" : ""
                    }`}
                  >
                    {r.voice_label}
                    {r.is_stale && <span className="ml-1 text-xs text-ink-soft">·</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* speed */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(menuOpen === "rate" ? null : "rate")}
            className="rounded-full border border-rule px-2 py-1 text-xs font-semibold tabular-nums"
            aria-haspopup="menu"
            aria-expanded={menuOpen === "rate"}
            aria-label={`Playback speed ${player.rate}x`}
          >
            {player.rate}×
          </button>
          {menuOpen === "rate" && (
            <div role="menu" className="absolute bottom-full right-0 mb-2 w-20 rounded-xl border border-rule bg-card py-1 shadow-lg">
              {RATES.map((r) => (
                <button
                  key={r}
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    player.setRate(r);
                    setMenuOpen(null);
                  }}
                  className={`block w-full px-3 py-1.5 text-left text-sm tabular-nums hover:bg-ink/5 ${
                    r === player.rate ? "font-bold" : ""
                  }`}
                >
                  {r}×
                </button>
              ))}
            </div>
          )}
        </div>

        {/* sleep timer */}
        <div className="relative hidden sm:block">
          <button
            type="button"
            onClick={() => setMenuOpen(menuOpen === "sleep" ? null : "sleep")}
            className={`rounded-full border border-rule px-2 py-1 text-xs font-medium ${
              player.sleepRemainingMs !== null ? "text-(--ws-ink)" : ""
            }`}
            aria-haspopup="menu"
            aria-expanded={menuOpen === "sleep"}
          >
            {player.sleepRemainingMs !== null
              ? fmt(player.sleepRemainingMs)
              : "Sleep"}
          </button>
          {menuOpen === "sleep" && (
            <div role="menu" className="absolute bottom-full right-0 mb-2 w-28 rounded-xl border border-rule bg-card py-1 shadow-lg">
              {SLEEP_OPTIONS.map((m) => (
                <button
                  key={m}
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    player.setSleepTimer(m);
                    setMenuOpen(null);
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm hover:bg-ink/5"
                >
                  {m} min
                </button>
              ))}
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  player.setSleepTimer(null);
                  setMenuOpen(null);
                }}
                className="block w-full px-3 py-1.5 text-left text-sm text-ink-soft hover:bg-ink/5"
              >
                Off
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={player.close}
          aria-label="Close player"
          className="rounded-full p-1.5 text-ink-soft hover:bg-ink/5"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
