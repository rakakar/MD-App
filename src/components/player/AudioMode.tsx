"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
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
import { useIsDesktop } from "@/components/ui/Dialog";
import { bookHue } from "@/lib/bookHue";
import { parseRef } from "@/lib/refs";
import type { AudioRendition, Paragraph } from "@/lib/types";
import {
  CoverArt,
  FootBtn,
  NextChapterIcon,
  PrevChapterIcon,
  RATES,
  ScrubBar,
  TransportBtn,
  fmt,
  useSheetDismiss,
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
 * 1. **Leaving is not stopping.** ⌄ collapses to the pill and the audio keeps
 *    playing; tapping the pill's title brings this back. The control is a
 *    chevron down rather than a cross for exactly that reason — a listener
 *    should never have to wonder whether the button they are about to press
 *    will silence the thing they are listening to.
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
}: AudioModeProps) {
  const player = usePlayer();
  const desktop = useIsDesktop();
  const [menu, setMenu] = useState<"rate" | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const { source } = player;

  /**
   * Arriving and leaving, including the thumb pushing it back down — all of it
   * in `useSheetDismiss`, which the recording's own surface shares. React
   * unmounts on the tick it is told to, so the hook holds this one for its
   * animation's 260ms before handing over to the provider; the pill, mounted
   * underneath the whole time, replays its entrance as it is uncovered.
   */
  const closeAudioMode = player.closeAudioMode;
  const { collapse, sheetProps } = useSheetDismiss(closeAudioMode);

  // Escape closes, as it does on every sheet in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") collapse();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [collapse]);

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
    if (!el) return;
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

  if (desktop) {
    return (
      <DesktopAudioMode
        lines={lines}
        activeSeq={activeSeq}
        onSeekPara={onSeekPara}
        onCollapse={collapse}
        sheetProps={sheetProps}
        activeRef={activeRef}
        prevChapterTitle={prevChapterTitle}
        nextChapterTitle={nextChapterTitle}
      />
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Audio mode"
      {...sheetProps}
      className={`fixed inset-0 z-50 flex flex-col bg-audio-bg text-audio-ink ${sheetProps.className}`}
      style={{
        ...sheetProps.style,
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
          onClick={collapse}
          aria-label="Collapse to the mini player"
          /* A chevron down, not a cross. This does not stop anything — the
             audio keeps playing and the pill takes over — and a cross on a
             control that leaves the sound running is a promise it does not
             keep. Down is where it goes, and the pill is what it becomes.
             A rounded square, not a circle, as the comp draws both corners of
             this header: round is the play button's shape here, and giving it
             to a control that does the opposite thing was the one place this
             screen contradicted itself. */
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-audio-ink/10 text-audio-ink/80 active:bg-audio-ink/20"
        >
          <ChevronDown className="h-5.5 w-5.5" />
        </button>
        <div className="min-w-0 flex-1 pt-1.5 text-center">
          <p className="text-xs font-semibold tracking-[0.18em] text-audio-accent">
            AUDIO MODE
          </p>
          {/* The book. The chapter is named twice already below this — as the
              heading under the cover and, when there is text, on the line the
              voice is reading — so a third naming here spent the one line this
              strip has on the thing least in doubt. */}
          <p lang="hi" className="hi hi-tight truncate text-xs text-audio-ink/70">
            {source.bookTitle}
          </p>
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
        {/* The clock, and nothing else. The voice's name — "स्वरा (Azure)" —
            was the engine that made the file, which is a fact about how this
            was produced rather than about what is playing, and it sat on the
            one line under the chapter where a listener looks to see how far in
            they are. */}
        <p className="mt-1 text-xs tabular-nums text-audio-ink/55">
          {device
            ? `Para ${paraProgress}`
            : `${fmt(player.positionMs)} / ${fmt(player.durationMs)}`}
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

      {/* ---- transport ----
          24px under the controls. It was 8, which was enough while the foot row
          sat below them and gave the play button something to stand on; with
          that row gone the transport was the last thing on the screen and ended
          a thumb's width from the edge. */}
      <div className="shrink-0 border-t border-audio-ink/10 bg-audio-bg px-5 pb-6 pt-3">
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
            label={`Back ${SKIP_SECONDS} seconds`}
            big
          >
            <SkipBackIcon className="h-6 w-6" seconds={SKIP_SECONDS} />
          </TransportBtn>
          <button
            type="button"
            onClick={player.toggle}
            aria-label={player.playing ? "Pause" : "Play"}
            /* Terracotta to start it, cream to stop it. The accent is what the
               app means by "press this"; once it is running the button's job
               is to be found and not to shout, and cream on the near-black is
               the quieter of the two. */
            className={`flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full shadow-lg transition-colors active:scale-95 ${
              player.playing ? "bg-audio-ink text-audio-bg" : "text-white"
            }`}
            style={player.playing ? undefined : { background: "var(--ws-color)" }}
          >
            {player.playing ? (
              <PauseIcon className="h-7 w-7" />
            ) : (
              <PlayIcon className="ms-0.5 h-7 w-7" />
            )}
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
            label={nextChapterTitle ? `Next chapter: ${nextChapterTitle}` : "Next chapter"}
          >
            <NextChapterIcon />
          </TransportBtn>
        </div>

        {/* The foot row is gone at the designer's decision — it held
            Chapters, Voice, Sleep, the offline save and Read.

            Two of those had nowhere else to be, and the loss is real rather
            than tidied away: **the sleep timer** exists on the shelf's player
            bar but that control is `hidden sm:block`, so on a phone there is
            now no way to set one at all; and **saving a chapter's audio for
            offline** was only ever offered here — the book hero's download
            button caches text, not audio. `SaveChapterButton` below is kept
            for whatever surface takes it next.

            The other three lost nothing. Chapters is the two chapter buttons
            in the transport above; Read is the chevron in the header, which
            does exactly what it did; Voice is on the shelf's bar. */}
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
/**
 * Save this chapter's audio for offline, as a foot-row button.
 *
 * Exported with no caller, which is deliberate and the honest version of what
 * the comment upstairs promises: the foot row it lived in is gone, and the
 * book hero's download button caches text rather than audio, so this is the
 * app's only implementation of saving a recording and there is currently
 * nowhere to press it. Exported rather than left local so it is a thing
 * waiting for a surface instead of dead code with a lint warning on it.
 */
export function SaveChapterButton({
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

/**
 * **Audio mode on a desktop** (desktop revision, 3 Oct 2026): two columns
 * instead of one tall phone screen. What is playing on the left — the cover,
 * the chapter, how far in — and the chapter's text on the right, the line
 * being spoken lit, every line a place to listen from. The transport runs the
 * width of the window underneath, the way a desktop player's does, with speed
 * and Stop at its end rather than up in a header a pointer has to travel to.
 *
 * Same rules as the phone's: ⌄ "Back to reading" leaves the voice playing;
 * Stop is the one control that silences it, and it says so.
 */
function DesktopAudioMode({
  lines,
  activeSeq,
  onSeekPara,
  onCollapse,
  sheetProps,
  activeRef,
  prevChapterTitle,
  nextChapterTitle,
}: {
  lines: Paragraph[];
  activeSeq: number | null;
  onSeekPara: (p: Paragraph) => void;
  onCollapse: () => void;
  sheetProps: ReturnType<typeof useSheetDismiss>["sheetProps"];
  activeRef: React.RefObject<HTMLButtonElement | null>;
  prevChapterTitle?: string | null;
  nextChapterTitle?: string | null;
}) {
  const player = usePlayer();
  const [rateOpen, setRateOpen] = useState(false);
  const source = player.source;
  if (!source || source.kind === "track") return null;
  const device = source.kind === "device";

  const at = lines.findIndex((p) => p.sequence === activeSeq);
  const activePage = at >= 0 ? parseRef(lines[at].canonical_ref)?.page : undefined;
  const pageLabel = (pg?: string) => (pg && pg === String(Number(pg)) ? `Page ${pg}` : pg ?? "");
  const where = [
    lines.length ? `Para ${Math.max(1, at + 1)} / ${lines.length}` : "",
    pageLabel(activePage),
  ]
    .filter(Boolean)
    .join(" · ");

  // the page each line is on, and whether it opens one — for the labels
  const pages = lines.map((p) => parseRef(p.canonical_ref)?.page);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Audio mode"
      {...sheetProps}
      className={`fixed inset-0 z-50 flex flex-col bg-audio-bg text-audio-ink ${sheetProps.className}`}
      style={{
        ...sheetProps.style,
        backgroundImage: "linear-gradient(180deg, var(--color-audio-top), var(--color-audio-bg) 30%)",
      }}
    >
      {/* ---- header ---- */}
      <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 pt-5">
        <div>
          <button
            type="button"
            onClick={onCollapse}
            className="inline-flex h-10 items-center gap-2 rounded-control bg-audio-ink/10 pe-4 ps-3 text-sm font-semibold transition-colors hover:bg-audio-ink/15"
          >
            <ChevronDown className="h-4.5 w-4.5" />
            Back to reading
          </button>
        </div>
        <div className="min-w-0 text-center">
          <p className="text-xs font-semibold tracking-[0.18em] text-audio-accent">AUDIO MODE</p>
          <p lang="hi" className="hi hi-tight truncate text-xs text-audio-ink/70">
            {source.bookTitle}
          </p>
        </div>
        <div />
      </div>

      {/* ---- what is playing · the text ---- */}
      <div className="mt-4 grid min-h-0 flex-1 grid-cols-[minmax(20rem,26rem)_1fr]">
        <div className="flex flex-col items-center justify-center border-r border-audio-ink/10 px-10 pb-10">
          <CoverArt
            large
            src={source.coverImage}
            hue={bookHue(source.bookCode)}
            fallback={source.bookTitle?.[0] ?? "\u0917\u094D\u0930"}
          />
          <p lang="hi" className="hi hi-tight mt-6 line-clamp-2 text-center text-xl font-semibold">
            {source.chapterNumber > 0 ? `अध्याय ${source.chapterNumber} · ` : ""}
            {source.chapterTitle}
          </p>
          {where && (
            <p className="hi-tight mt-2 text-sm tabular-nums text-audio-ink/55">
              {where}
            </p>
          )}
          {device && (
            <p className="mt-4 text-center text-sm text-audio-accent/90">
              Device voice. Stops when the screen locks.
            </p>
          )}
        </div>

        <div className="min-h-0 overflow-y-auto overscroll-contain px-12">
          <div className="max-w-3xl py-10">
            <p className="mb-6 text-xs text-audio-ink/45">Click any paragraph to listen from there</p>
            {lines.map((p, i) => {
              const on = p.sequence === activeSeq;
              const page = pages[i];
              const newPage = i === 0 || page !== pages[i - 1];
              return (
                <div key={p.canonical_ref}>
                  {newPage && page && (
                    <p className="hi-tight mb-2 mt-6 text-xs text-audio-ink/40 first:mt-0">
                      {pageLabel(page)}
                    </p>
                  )}
                  <button
                    ref={on ? activeRef : undefined}
                    type="button"
                    onClick={() => onSeekPara(p)}
                    aria-current={on ? "true" : undefined}
                    lang="hi"
                    className={`hi mb-2 block w-full rounded-r-card border-l-2 px-4 py-3 text-start text-lg leading-[1.85] transition-colors ${
                      on
                        ? "border-audio-accent text-audio-ink"
                        : "border-transparent text-audio-ink/50 hover:text-audio-ink/80"
                    }`}
                    style={on ? { background: "color-mix(in srgb, var(--color-audio-accent) 14%, transparent)" } : undefined}
                  >
                    {p.text_hi}
                  </button>
                </div>
              );
            })}
            {lines.length === 0 && (
              <p className="py-10 text-sm text-audio-ink/60">The text of this chapter isn&apos;t here.</p>
            )}
          </div>
        </div>
      </div>

      {/* ---- transport ---- */}
      <div className="shrink-0 border-t border-audio-ink/10 px-8 pb-5 pt-3">
        {device ? (
          <div className="flex h-6 items-center">
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
                  width: `${source.paras.length ? ((player.deviceParaIndex + 1) / source.paras.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <ScrubBar positionMs={player.positionMs} durationMs={player.durationMs} onSeek={player.seekMs} />
        )}

        <div className="relative mt-2 flex items-center justify-center gap-4">
          <TransportBtn
            onClick={() => player.chapterNav?.prev?.()}
            disabled={!player.chapterNav?.prev}
            label={prevChapterTitle ? `Previous chapter: ${prevChapterTitle}` : "Previous chapter"}
          >
            <PrevChapterIcon />
          </TransportBtn>
          <TransportBtn onClick={() => player.skipSeconds(-SKIP_SECONDS)} label={`Back ${SKIP_SECONDS} seconds`} big>
            <SkipBackIcon className="h-6 w-6" seconds={SKIP_SECONDS} />
          </TransportBtn>
          <button
            type="button"
            onClick={player.toggle}
            aria-label={player.playing ? "Pause" : "Play"}
            className={`flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full shadow-lg transition-colors active:scale-95 ${
              player.playing ? "bg-audio-ink text-audio-bg" : "text-white"
            }`}
            style={player.playing ? undefined : { background: "var(--ws-color)" }}
          >
            {player.playing ? <PauseIcon className="h-7 w-7" /> : <PlayIcon className="ms-0.5 h-7 w-7" />}
          </button>
          <TransportBtn onClick={() => player.skipSeconds(SKIP_SECONDS)} label={`Forward ${SKIP_SECONDS} seconds`} big>
            <SkipForwardIcon className="h-6 w-6" seconds={SKIP_SECONDS} />
          </TransportBtn>
          <TransportBtn
            onClick={() => player.chapterNav?.next?.()}
            disabled={!player.chapterNav?.next}
            label={nextChapterTitle ? `Next chapter: ${nextChapterTitle}` : "Next chapter"}
          >
            <NextChapterIcon />
          </TransportBtn>

          <div className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setRateOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={rateOpen}
                aria-label={`Playback speed ${player.rate}x`}
                className="flex h-10 min-w-12 items-center justify-center rounded-control border border-audio-ink/20 px-3 text-sm font-semibold tabular-nums transition-colors hover:bg-audio-ink/10"
              >
                {player.rate}×
              </button>
              {rateOpen && (
                <div
                  role="menu"
                  className="absolute bottom-full end-0 z-10 mb-2 w-24 overflow-hidden rounded-tile bg-audio-raised py-1 shadow-2xl ring-1 ring-audio-ink/10"
                >
                  {RATES.map((r) => (
                    <button
                      key={r}
                      role="menuitem"
                      type="button"
                      onClick={() => {
                        player.setRate(r);
                        setRateOpen(false);
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
            {/* Stop, in words: the one control here that silences the voice,
                beside "Back to reading", which does not. */}
            <button
              type="button"
              onClick={player.close}
              className="h-10 rounded-control px-3 text-sm font-semibold text-audio-ink/75 transition-colors hover:bg-audio-ink/10 hover:text-audio-ink"
            >
              Stop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
