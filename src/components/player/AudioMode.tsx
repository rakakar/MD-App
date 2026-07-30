"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CloseIcon,
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
} from "@/components/shell/icons";
import { coverGradient, bookHue } from "@/lib/bookHue";
import type { Paragraph } from "@/lib/types";
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
 *    that सूत्र to me again" — and a scrub bar cannot express it.
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
    ? (player.deviceVoiceLabel ?? "डिवाइस की आवाज़")
    : (rendition?.voice_label ?? "");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Audio mode"
      className="fixed inset-0 z-50 flex flex-col bg-[#100d0b] text-[#f2ece2]"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* ---- header ---- */}
      <div className="flex items-start gap-2 px-4 pt-3">
        <button
          type="button"
          onClick={closeAudioMode}
          aria-label="Close audio mode and return to the page"
          className="-ms-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#f2ece2]/80 active:bg-white/10"
        >
          <CloseIcon className="h-5.5 w-5.5" />
        </button>
        <div className="min-w-0 flex-1 pt-1.5 text-center">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[#e08b3e]">
            AUDIO MODE
          </p>
          <p lang="hi" className="hi truncate text-[13px] text-[#f2ece2]/70">
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
            className="flex h-11 min-w-11 items-center justify-center rounded-full bg-white/10 px-3 text-sm font-semibold tabular-nums"
          >
            {player.rate}×
          </button>
          {menu === "rate" && (
            <div
              role="menu"
              className="absolute end-0 top-full z-10 mt-1 w-24 overflow-hidden rounded-xl bg-[#241e19] py-1 shadow-2xl ring-1 ring-white/10"
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
                    r === player.rate ? "font-bold text-[#e08b3e]" : "text-[#f2ece2]/85"
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
        <div
          className="relative h-[38vw] max-h-44 w-[38vw] max-w-44 shrink-0 overflow-hidden rounded-2xl shadow-[0_18px_40px_-16px_rgba(0,0,0,.8)] ring-1 ring-white/10"
          style={{ background: coverGradient(hue) }}
        >
          {cover ? (
            <>
              {/* The cover's own colours, blurred, filling what a portrait
                  cover leaves in a square — the same treatment the shelf
                  tiles use, and for the same reason: a derived hue behind a
                  photographed cover reads as two objects. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full scale-125 object-cover blur-xl saturate-125"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover}
                alt=""
                className="absolute inset-0 h-full w-full object-contain"
              />
            </>
          ) : (
            <span
              aria-hidden
              lang="hi"
              className="hi absolute inset-0 flex items-center justify-center text-4xl leading-none text-white/90"
            >
              {source.bookTitle?.[0] ?? "ग्र"}
            </span>
          )}
        </div>
        <p lang="hi" className="hi mt-4 line-clamp-2 text-center text-base font-semibold">
          {source.chapterTitle}
        </p>
        <p className="mt-1 text-xs tabular-nums text-[#f2ece2]/55">
          {device
            ? `पैरा ${paraProgress}`
            : `${fmt(player.positionMs)} / ${fmt(player.durationMs)}`}
          {voiceLabel && <span lang="hi" className="hi"> · {voiceLabel}</span>}
        </p>
        {/* The one honest sentence this mode owes the listener: the device
            voice is not background audio, and finding that out with the phone
            already in a pocket is how an app loses trust. */}
        {device && (
          <p lang="hi" className="hi mt-2 text-center text-[11px] leading-snug text-[#e08b3e]/85">
            डिवाइस की आवाज़ — स्क्रीन बंद होने पर रुक जाएगी
          </p>
        )}
        {rendition?.is_stale && (
          <p lang="hi" className="hi mt-2 text-center text-[11px] text-[#f2ece2]/45">
            यह audio पाठ के पिछले संस्करण का है
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
                    ? "text-lg font-semibold text-[#f7f2e8]"
                    : "text-base text-[#f2ece2]/38"
                }`}
              >
                {p.text_hi}
              </button>
            );
          })}
          {lines.length === 0 && (
            <p className="py-10 text-center text-sm text-[#f2ece2]/45">
              इस अध्याय का पाठ यहाँ नहीं है।
            </p>
          )}
        </div>
      </div>

      {/* ---- transport ---- */}
      <div className="shrink-0 border-t border-white/10 bg-[#100d0b] px-5 pb-2 pt-3">
        {device ? (
          <div
            className="h-1 w-full overflow-hidden rounded-full bg-white/12"
            role="progressbar"
            aria-label="Listening progress"
            aria-valuemin={0}
            aria-valuemax={source.paras.length}
            aria-valuenow={player.deviceParaIndex + 1}
          >
            <div
              className="h-full rounded-full bg-[#e08b3e]"
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
          <div className="flex items-center gap-3">
            <span className="w-11 shrink-0 text-[11px] tabular-nums text-[#f2ece2]/55">
              {fmt(player.positionMs)}
            </span>
            <input
              type="range"
              aria-label="Seek"
              min={0}
              max={player.durationMs || 1}
              value={Math.min(player.positionMs, player.durationMs || 0)}
              onChange={(e) => player.seekMs(Number(e.target.value))}
              className="audio-scrub h-6 min-w-0 flex-1 cursor-pointer appearance-none bg-transparent"
              style={{
                background: `linear-gradient(to right, #e08b3e ${
                  player.durationMs ? (player.positionMs / player.durationMs) * 100 : 0
                }%, rgba(255,255,255,.14) 0)`,
              }}
            />
            <span className="w-11 shrink-0 text-end text-[11px] tabular-nums text-[#f2ece2]/55">
              {fmt(player.durationMs)}
            </span>
          </div>
        )}

        <div className="mt-2 flex items-center justify-between gap-1">
          <TransportBtn
            onClick={() => player.chapterNav?.prev?.()}
            disabled={!player.chapterNav?.prev}
            label={prevChapterTitle ? `पिछला अध्याय: ${prevChapterTitle}` : "पिछला अध्याय"}
          >
            <PrevChapterIcon />
          </TransportBtn>
          <TransportBtn
            onClick={() => player.skipSeconds(-SKIP_SECONDS)}
            label={device ? "पिछला पैरा" : `${SKIP_SECONDS} सेकंड पीछे`}
            big
          >
            <SkipBackIcon className="h-6 w-6" seconds={device ? "¶" : SKIP_SECONDS} />
          </TransportBtn>
          <button
            type="button"
            onClick={player.toggle}
            aria-label={player.playing ? "Pause" : "Play"}
            className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full bg-[#f7f2e8] text-[#100d0b] shadow-lg active:scale-95"
          >
            {player.playing ? (
              <PauseIcon className="h-7 w-7" />
            ) : (
              <PlayIcon className="ms-0.5 h-7 w-7" />
            )}
          </button>
          <TransportBtn
            onClick={() => player.skipSeconds(SKIP_SECONDS)}
            label={device ? "अगला पैरा" : `${SKIP_SECONDS} सेकंड आगे`}
            big
          >
            <SkipForwardIcon className="h-6 w-6" seconds={device ? "¶" : SKIP_SECONDS} />
          </TransportBtn>
          <TransportBtn
            onClick={() => player.chapterNav?.next?.()}
            disabled={!player.chapterNav?.next}
            label={nextChapterTitle ? `अगला अध्याय: ${nextChapterTitle}` : "अगला अध्याय"}
          >
            <NextChapterIcon />
          </TransportBtn>
        </div>

        {/* ---- the row that makes it a listening app, not a play button ---- */}
        <div className="mt-1 flex items-center justify-center gap-1 text-xs">
          {onOpenContents && (
            <FootBtn
              onClick={() => {
                closeAudioMode();
                onOpenContents();
              }}
            >
              अध्याय
            </FootBtn>
          )}
          {source.kind === "tts" && source.renditions.length > 1 && (
            <div className="relative">
              <FootBtn onClick={() => setMenu(menu === "voice" ? null : "voice")}>
                आवाज़
              </FootBtn>
              {menu === "voice" && (
                <div
                  role="menu"
                  className="absolute bottom-full left-1/2 z-10 mb-1 w-44 -translate-x-1/2 overflow-hidden rounded-xl bg-[#241e19] py-1 shadow-2xl ring-1 ring-white/10"
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
                          ? "font-bold text-[#e08b3e]"
                          : "text-[#f2ece2]/85"
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
              {player.sleepRemainingMs !== null
                ? fmt(player.sleepRemainingMs)
                : "स्लीप टाइमर"}
            </FootBtn>
            {menu === "sleep" && (
              <div
                role="menu"
                className="absolute bottom-full left-1/2 z-10 mb-1 w-32 -translate-x-1/2 overflow-hidden rounded-xl bg-[#241e19] py-1 shadow-2xl ring-1 ring-white/10"
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
                    className="block w-full px-4 py-2 text-start text-sm text-[#f2ece2]/85"
                  >
                    {m} मिनट
                  </button>
                ))}
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    player.setSleepTimer(null);
                    setMenu(null);
                  }}
                  className="block w-full px-4 py-2 text-start text-sm text-[#f2ece2]/55"
                >
                  बंद
                </button>
              </div>
            )}
          </div>
          {/* The read↔listen handoff, said out loud. Closing keeps the audio
              running and the page behind is already scrolled to this very
              paragraph, so it is a switch of mode, not a stop. */}
          <FootBtn onClick={closeAudioMode}>पढ़ें</FootBtn>
        </div>
      </div>
    </div>
  );
}

function TransportBtn({
  onClick,
  label,
  disabled,
  big,
  children,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  big?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex shrink-0 items-center justify-center rounded-full text-[#f2ece2] active:bg-white/10 disabled:opacity-25 ${
        big ? "h-14 w-14 bg-white/8" : "h-12 w-12"
      }`}
    >
      {children}
    </button>
  );
}

function FootBtn({
  onClick,
  active,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      lang="hi"
      className={`hi min-h-11 rounded-full px-3 text-xs tabular-nums ${
        active ? "text-[#e08b3e]" : "text-[#f2ece2]/60"
      }`}
    >
      {children}
    </button>
  );
}

function PrevChapterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
      <path d="M7 5.5h2v13H7zM19 5.5v13l-9-6.5z" />
    </svg>
  );
}

function NextChapterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
      <path d="M15 5.5h2v13h-2zM5 5.5v13l9-6.5z" />
    </svg>
  );
}
