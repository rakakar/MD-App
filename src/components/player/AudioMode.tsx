"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CloseIcon,
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
} from "@/components/shell/icons";
import {
  audioSupported,
  formatBytes,
  isAudioSaved,
  removeAudio,
  renditionBytes,
  saveAudio,
} from "@/lib/audioCache";
import { bookHue } from "@/lib/bookHue";
import { contentLang } from "@/lib/script";
import type { AudioRendition, Paragraph } from "@/lib/types";
import {
  CoverArt,
  FootBtn,
  NextChapterIcon,
  PrevChapterIcon,
  RATES,
  SLEEP_OPTIONS,
  ScrubBar,
  TransportBtn,
  fmt,
} from "./audioChrome";
import { SKIP_SECONDS, activeRendition, usePlayer, type TtsSource } from "./PlayerProvider";

export interface AudioModeProps {
  /** the chapter's paragraphs, in reading order — the text that gets sung */
  paragraphs: Paragraph[];
  /** paragraph currently being spoken, resolved by the surface that owns it */
  activeSeq: number | null;
  /** play from this paragraph */
  onSeekPara: (para: Paragraph) => void;
  prevChapterTitle?: string | null;
  nextChapterTitle?: string | null;
  /** open this chapter's contents, so a listener can pick another chapter */
  onOpenContents?: () => void;
}

/**
 * Audio Mode — the full-screen listening surface (design "Audio mode").
 *
 * It exists because listening and reading want opposite screens. Reading wants
 * the page and nothing else; listening wants the cover, a big play button, a
 * scrub bar and *one* line of text at a time, held at eye level, from three
 * feet away, one-handed, often with the phone about to go into a pocket.
 *
 * Two rules shape everything here:
 *
 * 1. **Leaving is not stopping.** ✕ returns to the page and the audio keeps
 *    playing in the bottom bar; that bar's ⌃ brings this back. The listener
 *    should never learn to fear the close button.
 * 2. **The text is a control, not decoration.** Tapping a paragraph plays from
 *    it. For a study text that is the most-wanted action in the room — "read
 *    that sutra to me again" — and a scrub bar cannot express it.
 *
 * Its palette is fixed dark rather than inherited from the reader's theme: the
 * screen is mostly a cover and a couple of lines, it is often the last thing
 * looked at before sleep, and a sepia page behind a play button reads as a
 * page that has gone wrong.
 */
export function AudioMode({
  paragraphs,
  activeSeq,
  onSeekPara,
  prevChapterTitle,
  nextChapterTitle,
  onOpenContents,
}: AudioModeProps) {
  const player = usePlayer();
  const [menu, setMenu] = useState<"rate" | "sleep" | "voice" | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const { source } = player;

  const closeAudioMode = player.closeAudioMode;

  // Escape closes, as it does on every sheet in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAudioMode();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeAudioMode]);

  // While this is up, the page behind it must not scroll under the finger.
  // Mount-only: re-running it would capture "hidden" as the value to restore
  // and leave the reader unscrollable after Audio Mode closes.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Keep the spoken line in the middle of the window. `nearest` would leave it
  // pinned to an edge for a whole paragraph, which is where a karaoke view
  // stops feeling like it is following the voice.
  useEffect(() => {
    const el = activeRef.current;
    if (!el || !listRef.current) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeSeq]);

  // Only paragraphs that are actually spoken can be tapped to play — a table
  // has no timestamp, so offering it would be a button that does nothing.
  const spokenSeqs = useMemo(() => {
    if (!source || source.kind === "track") return null;
    if (source.kind === "device") return new Set(source.paras.map((p) => p.sequence));
    const r = activeRendition(source);
    return r ? new Set(Object.keys(r.para_timings).map(Number)) : null;
  }, [source]);
  const lines = useMemo(
    () =>
      paragraphs.filter(
        (p) => p.text_hi.trim().length > 0 && (!spokenSeqs || spokenSeqs.has(p.sequence))
      ),
    [paragraphs, spokenSeqs]
  );

  if (!source || source.kind === "track") return null;

  const device = source.kind === "device";
  const rendition = activeRendition(source);
  const cover = source.coverImage;
  const hue = bookHue(source.bookCode);
  const paraProgress = device
    ? `${Math.min(player.deviceParaIndex + 1, source.paras.length)} / ${source.paras.length}`
    : null;
  const voiceLabel = device
    ? (player.deviceVoiceLabel ?? "Device voice")
    : (rendition?.voice_label ?? "");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Audio mode"
      className="fixed inset-0 z-50 flex flex-col bg-audio-bg text-audio-ink"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        // The comp's gradient, sampled at both ends: a warm ember at the top
        // behind the cover, falling to near-black by the time it reaches the
        // text. Held to the top third rather than run over the whole screen —
        // a gradient still moving behind the follow-along lines is a gradient
        // the eye keeps re-reading as the page scrolling.
        backgroundImage:
          "linear-gradient(180deg, var(--color-audio-top), var(--color-audio-bg) 38%)",
      }}
    >
      {/* ---- header ---- */}
      <div className="flex items-start gap-2 px-4 pt-3">
        <button
          type="button"
          onClick={closeAudioMode}
          aria-label="Close audio mode and return to the page"
          /* A rounded square, not a circle, as the comp draws both corners of
             this header: round is the play button's shape here, and giving it
             to a control that does the opposite thing was the one place this
             screen contradicted itself. */
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-tile bg-audio-ink/10 text-audio-ink/80 active:bg-audio-ink/20"
        >
          <CloseIcon className="h-5.5 w-5.5" />
        </button>
        <div className="min-w-0 flex-1 pt-1.5 text-center">
          <p className="text-xs font-semibold tracking-[0.18em] text-audio-accent">
            AUDIO MODE
          </p>
          <p lang="hi" className="hi truncate text-xs text-audio-ink/70">
            {source.bookTitle} · {source.chapterTitle}
          </p>
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenu(menu === "rate" ? null : "rate")}
            aria-haspopup="menu"
            aria-expanded={menu === "rate"}
            aria-label={`Playback speed ${player.rate}x`}
            className="flex h-11 min-w-11 items-center justify-center rounded-tile bg-audio-ink/10 px-3 text-sm font-semibold tabular-nums"
          >
            {player.rate}×
          </button>
          {menu === "rate" && (
            <div
              role="menu"
              className="absolute end-0 top-full z-10 mt-1 w-24 overflow-hidden rounded-tile bg-audio-raised py-1 shadow-2xl ring-1 ring-audio-ink/10"
            >
              {RATES.map((r) => (
                <button
                  key={r}
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    player.setRate(r);
                    setMenu(null);
                  }}
                  className={`block w-full px-4 py-2 text-start text-sm tabular-nums ${
                    r === player.rate ? "font-bold text-audio-accent" : "text-audio-ink/85"
                  }`}
                >
                  {r}×
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---- cover + what is playing ---- */}
      <div className="flex flex-col items-center px-6 pt-5">
        <CoverArt src={cover} hue={hue} fallback={source.bookTitle?.[0] ?? "\u0917\u094D\u0930"} />
        <p lang="hi" className="hi mt-4 line-clamp-2 text-center text-base font-semibold">
          {source.chapterTitle}
        </p>
        <p className="mt-1 text-xs tabular-nums text-audio-ink/55">
          {device
            ? `Para ${paraProgress}`
            : `${fmt(player.positionMs)} / ${fmt(player.durationMs)}`}
          {voiceLabel && <span {...contentLang(voiceLabel)}> · {voiceLabel}</span>}
        </p>
        {/* The one honest sentence this mode owes the listener: the device
            voice is not background audio, and finding that out with the phone
            already in a pocket is how an app loses trust. */}
        {device && (
          <p className="mt-2 text-center text-xs leading-snug text-audio-accent/85">
            Device voice — stops when the screen locks
          </p>
        )}
        {rendition?.is_stale && (
          <p className="mt-2 text-center text-xs text-audio-ink/60">
            This audio is of an earlier version of the text
          </p>
        )}
      </div>

      {/* ---- the text, following the voice ---- */}
      <div
        ref={listRef}
        className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain px-6"
      >
        <div className="mx-auto flex max-w-prose flex-col gap-3 py-6">
          {lines.map((p) => {
            const on = p.sequence === activeSeq;
            return (
              <button
                key={p.canonical_ref}
                ref={on ? activeRef : undefined}
                type="button"
                onClick={() => onSeekPara(p)}
                aria-current={on ? "true" : undefined}
                lang="hi"
                className={`hi rounded-lg px-1 py-0.5 text-center leading-[1.85] transition-colors ${
                  on
                    ? "text-lg font-semibold text-audio-ink"
                    : "text-base text-audio-ink/55"
                }`}
              >
                {p.text_hi}
              </button>
            );
          })}
          {lines.length === 0 && (
            <p className="py-10 text-center text-sm text-audio-ink/60">
              The text of this chapter isn&apos;t here.
            </p>
          )}
        </div>
      </div>

      {/* ---- transport ---- */}
      <div className="shrink-0 border-t border-audio-ink/10 bg-audio-bg px-5 pb-2 pt-3">
        {device ? (
          <div
            className="h-1 w-full overflow-hidden rounded-full bg-audio-ink/12"
            role="progressbar"
            aria-label="Listening progress"
            aria-valuemin={0}
            aria-valuemax={source.paras.length}
            aria-valuenow={player.deviceParaIndex + 1}
          >
            <div
              className="h-full rounded-full bg-audio-accent"
              style={{
                width: `${
                  source.paras.length
                    ? ((player.deviceParaIndex + 1) / source.paras.length) * 100
                    : 0
                }%`,
              }}
            />
          </div>
        ) : (
          <ScrubBar
            positionMs={player.positionMs}
            durationMs={player.durationMs}
            onSeek={player.seekMs}
          />
        )}

        <div className="mt-2 flex items-center justify-between gap-1">
          <TransportBtn
            onClick={() => player.chapterNav?.prev?.()}
            disabled={!player.chapterNav?.prev}
            label={prevChapterTitle ? `Previous chapter: ${prevChapterTitle}` : "Previous chapter"}
          >
            <PrevChapterIcon />
          </TransportBtn>
          <TransportBtn
            onClick={() => player.skipSeconds(-SKIP_SECONDS)}
            label={device ? "Previous paragraph" : `Back ${SKIP_SECONDS} seconds`}
            big
          >
            <SkipBackIcon className="h-6 w-6" seconds={device ? "¶" : SKIP_SECONDS} />
          </TransportBtn>
          <button
            type="button"
            onClick={player.toggle}
            aria-label={player.playing ? "Pause" : "Play"}
            className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full bg-audio-ink text-audio-bg shadow-lg active:scale-95"
          >
            {player.playing ? (
              <PauseIcon className="h-7 w-7" />
            ) : (
              <PlayIcon className="ms-0.5 h-7 w-7" />
            )}
          </button>
          <TransportBtn
            onClick={() => player.skipSeconds(SKIP_SECONDS)}
            label={device ? "Next paragraph" : `Forward ${SKIP_SECONDS} seconds`}
            big
          >
            <SkipForwardIcon className="h-6 w-6" seconds={device ? "¶" : SKIP_SECONDS} />
          </TransportBtn>
          <TransportBtn
            onClick={() => player.chapterNav?.next?.()}
            disabled={!player.chapterNav?.next}
            label={nextChapterTitle ? `Next chapter: ${nextChapterTitle}` : "Next chapter"}
          >
            <NextChapterIcon />
          </TransportBtn>
        </div>

        {/* ---- the row that makes it a listening app, not a play button ----
            Scrolls rather than wraps: five short labels fit a 390pt phone, and
            a narrower one should shorten the row, not double its height and
            push the play button up. */}
        <div className="mt-1 flex items-center justify-center gap-1 overflow-x-auto text-xs [scrollbar-width:none]">
          {onOpenContents && (
            <FootBtn
              onClick={() => {
                closeAudioMode();
                onOpenContents();
              }}
            >
              Chapters
            </FootBtn>
          )}
          {source.kind === "tts" && source.renditions.length > 1 && (
            <div className="relative">
              <FootBtn onClick={() => setMenu(menu === "voice" ? null : "voice")}>
                Voice
              </FootBtn>
              {menu === "voice" && (
                <div
                  role="menu"
                  className="absolute bottom-full left-1/2 z-10 mb-1 w-44 -translate-x-1/2 overflow-hidden rounded-tile bg-audio-raised py-1 shadow-2xl ring-1 ring-audio-ink/10"
                >
                  {source.renditions.map((r) => (
                    <button
                      key={r.voice_key}
                      role="menuitem"
                      type="button"
                      lang="hi"
                      onClick={() => {
                        player.switchVoice(r.voice_key);
                        setMenu(null);
                      }}
                      className={`hi block w-full px-4 py-2 text-start text-sm ${
                        r.voice_key === source.voiceKey
                          ? "font-bold text-audio-accent"
                          : "text-audio-ink/85"
                      }`}
                    >
                      {r.voice_label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="relative">
            <FootBtn
              onClick={() => setMenu(menu === "sleep" ? null : "sleep")}
              active={player.sleepRemainingMs !== null}
            >
              {player.sleepRemainingMs !== null ? fmt(player.sleepRemainingMs) : "Sleep"}
            </FootBtn>
            {menu === "sleep" && (
              <div
                role="menu"
                className="absolute bottom-full left-1/2 z-10 mb-1 w-32 -translate-x-1/2 overflow-hidden rounded-tile bg-audio-raised py-1 shadow-2xl ring-1 ring-audio-ink/10"
              >
                {SLEEP_OPTIONS.map((m) => (
                  <button
                    key={m}
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      player.setSleepTimer(m);
                      setMenu(null);
                    }}
                    className="block w-full px-4 py-2 text-start text-sm text-audio-ink/85"
                  >
                    {m} min
                  </button>
                ))}
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    player.setSleepTimer(null);
                    setMenu(null);
                  }}
                  className="block w-full px-4 py-2 text-start text-sm text-audio-ink/55"
                >
                  Off
                </button>
              </div>
            )}
          </div>
          {source.kind === "tts" && rendition && (
            <SaveChapterButton source={source} rendition={rendition} />
          )}
          {/* The read↔listen handoff, said out loud. Closing keeps the audio
              running and the page behind is already scrolled to this very
              paragraph, so it is a switch of mode, not a stop. */}
          <FootBtn onClick={closeAudioMode}>Read</FootBtn>
        </div>
      </div>
    </div>
  );
}

/**
 * Save this chapter's audio for offline listening.
 *
 * Two things make this button unusual, and both come from the files being WAV
 * at 48 kB/s (see src/lib/audioCache.ts):
 *
 * - **The size is on the button**, before the tap. A control that says "Save"
 *   and silently pulls 70 MB over mobile data is a control that lies.
 * - **Anything large asks twice.** Over 40 MB the first tap only shows the
 *   number and waits, which is cheaper than an undo that costs the download
 *   again. Removing asks twice for the same reason.
 *
 * There is no progress bar: the media host sends no CORS headers, so the
 * response is opaque and its body cannot be read to count bytes. Better an
 * honest spinner than a fake percentage.
 */
function SaveChapterButton({
  source,
  rendition,
}: {
  source: TtsSource;
  rendition: AudioRendition;
}) {
  const [state, setState] = useState<"idle" | "confirm" | "saving" | "saved" | "removing" | "failed">(
    "idle"
  );
  /** 0…1 while the bytes arrive; null when this host won't let us count them */
  const [progress, setProgress] = useState<number | null>(null);
  const bytes = renditionBytes(rendition);
  const url = rendition.audio_url;

  useEffect(() => {
    let live = true;
    setState("idle");
    void isAudioSaved(url).then((yes) => {
      if (live && yes) setState("saved");
    });
    return () => {
      live = false;
    };
  }, [url]);

  if (!audioSupported()) return null;

  const size = formatBytes(bytes);
  const heavy = bytes > 40_000_000;

  const onClick = () => {
    if (state === "saving") return;
    if (state === "saved") {
      setState("removing");
      return;
    }
    if (state === "removing") {
      void removeAudio(url).then(() => setState("idle"));
      return;
    }
    if (state === "idle" && heavy) {
      setState("confirm");
      return;
    }
    setState("saving");
    setProgress(0);
    void saveAudio(
      {
        url,
        book_code: source.bookCode,
        book_title: source.bookTitle,
        chapter_number: source.chapterNumber,
        chapter_title: source.chapterTitle,
        voice_label: rendition.voice_label,
        bytes,
      },
      setProgress
    ).then((ok) => setState(ok ? "saved" : "failed"));
  };

  const label =
    state === "saved"
      ? "✓ Saved"
      : state === "removing"
        ? "Remove?"
        : state === "saving"
          ? // A percentage where the bytes can be counted, and a plain "saving"
            // where they cannot — never a number this button had to invent.
            progress === null
            ? "Saving…"
            : `${Math.round(progress * 100)}%`
          : state === "confirm"
            ? `${size} — sure?`
            : state === "failed"
              ? "Not saved"
              : `⤓ ${size}`;

  return (
    <FootBtn onClick={onClick} active={state === "saved" || state === "confirm" || state === "removing"}>
      {label}
    </FootBtn>
  );
}
