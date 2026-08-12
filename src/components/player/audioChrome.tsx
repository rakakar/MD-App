"use client";

import type { ReactNode } from "react";
import { coverGradient, type BookHue } from "@/lib/bookHue";

/**
 * The pieces both full-screen listening surfaces are built from.
 *
 * There are two surfaces because there are two things to listen to, and they
 * differ in the middle of the screen and nowhere else: a chapter has text that
 * follows the voice, a shivir recording has nothing but its own length. Around
 * that difference everything is the same — the fixed dark palette, the cover,
 * the scrub bar, the transport, the sleep timer — and it has to *stay* the
 * same, because a listener who learns the controls on a book must not have to
 * learn them again on a recording. Shared parts rather than a copy is what
 * keeps that promise honest.
 */

export const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];
export const SLEEP_OPTIONS = [10, 20, 30, 45, 60];

/** m:ss, or h:mm:ss once there is an hour to show. */
export function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const mm = h > 0 ? String(m % 60).padStart(2, "0") : String(m);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function TransportBtn({
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
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex shrink-0 items-center justify-center rounded-full text-audio-ink active:bg-audio-ink/10 disabled:opacity-25 ${
        big ? "h-14 w-14 bg-audio-ink/8" : "h-12 w-12"
      }`}
    >
      {children}
    </button>
  );
}

export function FootBtn({
  onClick,
  active,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      lang="hi"
      className={`hi min-h-11 rounded-full px-3 text-xs tabular-nums ${
        active ? "text-audio-accent" : "text-audio-ink/60"
      }`}
    >
      {children}
    </button>
  );
}

export function PrevChapterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
      <path d="M7 5.5h2v13H7zM19 5.5v13l-9-6.5z" />
    </svg>
  );
}

export function NextChapterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
      <path d="M15 5.5h2v13h-2zM5 5.5v13l9-6.5z" />
    </svg>
  );
}

/**
 * The square of artwork at the top.
 *
 * A cover is rarely square and never the right square, so its own colours are
 * blurred behind it to fill what a portrait image leaves over — the same
 * treatment the shelf tiles use, and for the same reason: a derived hue behind
 * a photographed cover reads as two objects rather than one.
 */
export function CoverArt({
  src,
  hue,
  fallback,
}: {
  src?: string | null;
  hue: BookHue;
  /** first letter, shown when there is no cover at all */
  fallback: string;
}) {
  return (
    <div
      className="relative h-[38vw] max-h-44 w-[38vw] max-w-44 shrink-0 overflow-hidden rounded-hero shadow-raised ring-1 ring-audio-ink/10"
      style={{ background: coverGradient(hue) }}
    >
      {src ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full scale-125 object-cover blur-xl saturate-125"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="absolute inset-0 h-full w-full object-contain" />
        </>
      ) : (
        <span
          aria-hidden
          lang="hi"
          className="hi absolute inset-0 flex items-center justify-center text-4xl leading-none text-white/90"
        >
          {fallback}
        </span>
      )}
    </div>
  );
}

/** Position, a draggable timeline, and total — the bar under the cover. */
export function ScrubBar({
  positionMs,
  durationMs,
  onSeek,
}: {
  positionMs: number;
  durationMs: number;
  onSeek: (ms: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-11 shrink-0 text-xs tabular-nums text-audio-ink/55">
        {fmt(positionMs)}
      </span>
      <input
        type="range"
        aria-label="Seek"
        min={0}
        max={durationMs || 1}
        value={Math.min(positionMs, durationMs || 0)}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="audio-scrub h-6 min-w-0 flex-1 cursor-pointer appearance-none bg-transparent"
        style={{
          background: `linear-gradient(to right, var(--color-audio-accent) ${
            durationMs ? (positionMs / durationMs) * 100 : 0
          }%, color-mix(in srgb, var(--color-audio-ink) 16%, transparent) 0)`,
        }}
      />
      <span className="w-11 shrink-0 text-end text-xs tabular-nums text-audio-ink/55">
        {fmt(durationMs)}
      </span>
    </div>
  );
}

/** The speed / sleep popovers, which behave identically in both surfaces. */
export function Menu({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="menu"
      className={`absolute z-10 overflow-hidden rounded-tile bg-audio-raised py-1 shadow-2xl ring-1 ring-audio-ink/10 ${className}`}
    >
      {children}
    </div>
  );
}

export function MenuItem({
  onClick,
  selected,
  muted,
  children,
}: {
  onClick: () => void;
  selected?: boolean;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      role="menuitem"
      type="button"
      onClick={onClick}
      className={`block w-full px-4 py-2 text-start text-sm tabular-nums ${
        selected ? "font-bold text-audio-accent" : muted ? "text-audio-ink/55" : "text-audio-ink/85"
      }`}
    >
      {children}
    </button>
  );
}
