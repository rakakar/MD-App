"use client";

import { useEffect, useState } from "react";
import { ChevronDown, PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon } from "@/components/shell/icons";
import { bookHue } from "@/lib/bookHue";
import { contentLang } from "@/lib/script";
import {
  CoverArt,
  FootBtn,
  Menu,
  MenuItem,
  NextChapterIcon,
  PrevChapterIcon,
  RATES,
  SLEEP_OPTIONS,
  ScrubBar,
  TransportBtn,
  fmt,
} from "./audioChrome";
import { SKIP_SECONDS, usePlayer } from "./PlayerProvider";

/**
 * Audio Mode for a recording — the full-screen surface for anything that is
 * not a chapter of a book.
 *
 * A discourse and a chapter want the same room and differ only in what is in the
 * middle of it. The chapter has text that follows the voice, and that text is
 * the whole point of `AudioMode`. A recording has no text at all, so the same
 * screen with an empty middle would be a screen that looks broken. Here the
 * cover takes that space instead, which is what every listening app does with
 * an album and is the right answer for the same reason: there is nothing to
 * read, so give the eye the thing being listened to.
 *
 * Everything around the middle is imported from `audioChrome`, not
 * re-implemented — the transport, the scrub bar, the speed and sleep menus
 * behave identically in both surfaces because they are literally the same
 * components. A listener who learned the controls inside a book already knows
 * them here.
 *
 * Mounted once in `AppShell`, beside the player bar, because a recording can be
 * playing from anywhere: a series page, a Resources collection, the folder tree.
 * `AudioMode` can afford to live inside the reader; this cannot.
 */
export function TrackAudioMode() {
  const player = usePlayer();
  const [menu, setMenu] = useState<"rate" | "sleep" | null>(null);
  const { source, audioModeOpen, closeAudioMode } = player;

  // Escape closes, as on every sheet in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAudioMode();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeAudioMode]);

  const open = audioModeOpen && source?.kind === "track";

  // The page behind must not scroll under the finger while this is up. Unlike
  // the reader's Audio Mode this component stays mounted, so the effect is
  // keyed on `open` and restores the moment it closes.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || source?.kind !== "track") return null;

  const title = contentLang(source.title);
  const subtitle = contentLang(source.subtitle);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Audio mode"
      className="fixed inset-0 z-50 flex flex-col bg-audio-bg text-audio-ink"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        // The same ember the chapter's Audio Mode wears. A listener who learns
        // this screen on a book must not arrive at a different one on a shivir
        // recording — the two differ in the middle and nowhere else.
        backgroundImage:
          "linear-gradient(180deg, var(--color-audio-top), var(--color-audio-bg) 38%)",
      }}
    >
      {/* ---- header ---- */}
      <div className="flex items-start gap-2 px-4 pt-3">
        <button
          type="button"
          onClick={closeAudioMode}
          aria-label="Close audio mode"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-audio-ink/10 text-audio-ink/80 active:bg-audio-ink/10"
        >
          <ChevronDown className="h-5.5 w-5.5" />
        </button>
        <div className="min-w-0 flex-1 pt-1.5 text-center">
          <p className="text-xs font-semibold tracking-[0.18em] text-audio-accent">AUDIO MODE</p>
          {source.subtitle && (
            <p {...subtitle} className={`${subtitle.className} truncate text-xs text-audio-ink/70`}>
              {source.subtitle}
            </p>
          )}
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenu(menu === "rate" ? null : "rate")}
            aria-haspopup="menu"
            aria-expanded={menu === "rate"}
            aria-label={`Playback speed ${player.rate}x`}
            className="flex h-11 min-w-11 items-center justify-center rounded-control bg-audio-ink/10 px-3 text-sm font-semibold tabular-nums"
          >
            {player.rate}×
          </button>
          {menu === "rate" && (
            <Menu className="end-0 top-full mt-1 w-24">
              {RATES.map((r) => (
                <MenuItem
                  key={r}
                  selected={r === player.rate}
                  onClick={() => {
                    player.setRate(r);
                    setMenu(null);
                  }}
                >
                  {r}×
                </MenuItem>
              ))}
            </Menu>
          )}
        </div>
      </div>

      {/* ---- the cover, given the room the text has in a chapter ---- */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-4">
        <div className="flex w-full max-w-sm scale-125 flex-col items-center sm:scale-150">
          <CoverArt
            src={source.coverImage}
            hue={bookHue(source.subtitle ?? source.title)}
            fallback={source.title?.[0] ?? "◉"}
          />
        </div>
        <p
          {...title}
          className={`${title.className} mt-10 line-clamp-3 text-center text-lg font-semibold sm:mt-14`}
        >
          {source.title}
        </p>
        <p className="mt-1 text-xs tabular-nums text-audio-ink/55">
          {fmt(player.positionMs)} / {fmt(player.durationMs)}
        </p>
      </div>

      {/* ---- transport ---- */}
      <div className="shrink-0 border-t border-audio-ink/10 bg-audio-bg px-5 pb-2 pt-3">
        <ScrubBar
          positionMs={player.positionMs}
          durationMs={player.durationMs}
          onSeek={player.seekMs}
        />

        <div className="mt-2 flex items-center justify-between gap-1">
          <TransportBtn
            onClick={() => player.chapterNav?.prev?.()}
            disabled={!player.chapterNav?.prev}
            label="Previous track"
          >
            <PrevChapterIcon />
          </TransportBtn>
          <TransportBtn
            onClick={() => player.skipSeconds(-SKIP_SECONDS)}
            label={`Back ${SKIP_SECONDS} seconds`}
            big
          >
            <SkipBackIcon className="h-6 w-6" seconds={SKIP_SECONDS} />
          </TransportBtn>
          <button
            type="button"
            onClick={player.toggle}
            aria-label={player.playing ? "Pause" : "Play"}
            /* Terracotta to start, cream to stop — the same pair the chapter
               player wears. `audioChrome`'s whole reason for existing is that a
               listener must not relearn the controls on a recording. */
            className={`flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full shadow-lg transition-colors active:scale-95 ${
              player.playing ? "bg-audio-ink text-audio-bg" : "text-white"
            }`}
            style={player.playing ? undefined : { background: "var(--ws-color)" }}
          >
            {player.playing ? <PauseIcon className="h-7 w-7" /> : <PlayIcon className="ms-0.5 h-7 w-7" />}
          </button>
          <TransportBtn
            onClick={() => player.skipSeconds(SKIP_SECONDS)}
            label={`Forward ${SKIP_SECONDS} seconds`}
            big
          >
            <SkipForwardIcon className="h-6 w-6" seconds={SKIP_SECONDS} />
          </TransportBtn>
          <TransportBtn
            onClick={() => player.chapterNav?.next?.()}
            disabled={!player.chapterNav?.next}
            label="Next track"
          >
            <NextChapterIcon />
          </TransportBtn>
        </div>

        <div className="mt-1 flex items-center justify-center gap-1 text-xs">
          <div className="relative">
            <FootBtn
              onClick={() => setMenu(menu === "sleep" ? null : "sleep")}
              active={player.sleepRemainingMs !== null}
            >
              {player.sleepRemainingMs !== null ? fmt(player.sleepRemainingMs) : "Sleep"}
            </FootBtn>
            {menu === "sleep" && (
              <Menu className="bottom-full left-1/2 mb-1 w-32 -translate-x-1/2">
                {SLEEP_OPTIONS.map((m) => (
                  <MenuItem
                    key={m}
                    onClick={() => {
                      player.setSleepTimer(m);
                      setMenu(null);
                    }}
                  >
                    {m} min
                  </MenuItem>
                ))}
                <MenuItem
                  muted
                  onClick={() => {
                    player.setSleepTimer(null);
                    setMenu(null);
                  }}
                >
                  Off
                </MenuItem>
              </Menu>
            )}
          </div>
          {/* Same promise the reader's Audio Mode makes: closing is not
              stopping. The bar keeps playing and its ⌃ brings this back. */}
          <FootBtn onClick={closeAudioMode}>Close</FootBtn>
        </div>
      </div>
    </div>
  );
}
