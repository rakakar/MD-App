"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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

/**
 * Opening and closing a listening surface — **the gesture, shared by both**.
 *
 * Tapping the pill used to swap one screen for another between two frames, and
 * ⌄ used to swap it back. Nothing was wrong with either, and both felt like a
 * fault: a full-screen surface that arrives instantly reads as a navigation,
 * and the whole point of this one is that it is the pill, opened — the same
 * recording, still playing, seen larger. Motion is what says that. It rises,
 * and it goes back down the way it came.
 *
 * **The drag is the other half of the same sentence.** A sheet that came up
 * from the bottom is one a thumb expects to be able to push back down, and on
 * a phone that gesture is quicker than reaching for a 44px target in the top
 * corner. Past `DISMISS_PX` it carries on by itself; short of it, it springs
 * back — which is what makes the drag safe to start out of curiosity.
 *
 * Returns the flags and the props to spread on the sheet's own root. It is a
 * hook rather than a wrapper component because both surfaces already own their
 * root element, its gradient and its safe-area padding, and a wrapper would
 * have meant a second full-screen box around each.
 */
export function useSheetDismiss(onClose: () => void) {
  /** how far the sheet has to be pushed before letting go dismisses it */
  const DISMISS_PX = 110;
  /** the drop's own length — `.audio-mode-out` animates over the same */
  const OUT_MS = 260;

  const [closing, setClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  /** let go past the threshold — on its way out under its own momentum */
  const [dismissing, setDismissing] = useState(false);
  const from = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    []
  );

  /**
   * Hand over to the provider once the sheet has finished leaving — and put
   * this hook back the way it started.
   *
   * The reset is not tidiness. `TrackAudioMode` is mounted for the whole life
   * of the app and returns `null` while closed, so this state outlives the
   * surface it describes: without it, the second opening arrives wearing the
   * exit's end frame — a screen already faded out and 14% down — and its
   * button, guarded against a double press, never fires again.
   */
  const finish = useCallback(() => {
    if (timer.current !== null) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      onClose();
      setClosing(false);
      setDragging(false);
      setDismissing(false);
      setDragY(0);
    }, OUT_MS);
  }, [onClose]);

  /** the ⌄ button, Escape, and the Close in the foot */
  const collapse = useCallback(() => {
    // Reduced motion skips the wait entirely rather than shortening it: a held
    // frame with no movement in it is only lag.
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }
    setClosing(true);
    finish();
  }, [onClose, finish]);

  /**
   * Whether a touch starting here is a drag on the sheet or something else.
   *
   * A control is not a handle — the transport is finger-sized and a stray few
   * pixels while pressing pause must not start pulling the screen down. Nor is
   * a list that has been scrolled: the follow-along text scrolls under the
   * thumb, and stealing that would make a chapter's own words undraggable in
   * the one place they matter. At the top of its scroll it is fair game, which
   * is the rule every sheet on a phone uses.
   */
  const isHandle = (target: EventTarget | null): boolean => {
    let el = target instanceof Element ? target : null;
    while (el) {
      if (el.closest("button, a, input, select, textarea, [role='slider'], [data-no-drag]")) {
        return false;
      }
      if (el.scrollHeight > el.clientHeight + 1 && el.scrollTop > 0) return false;
      el = el.parentElement;
    }
    return true;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (closing || e.pointerType === "mouse" || !isHandle(e.target)) return;
    from.current = e.clientY;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (from.current === null) return;
    const dy = e.clientY - from.current;
    // Downward only. Up is where the sheet already is, and rubber-banding it
    // off the top of the screen says it might go somewhere, which it may not.
    if (dy <= 0) {
      if (dragY !== 0) setDragY(0);
      return;
    }
    if (!dragging) setDragging(true);
    setDragY(dy);
  };

  const release = (e: React.PointerEvent) => {
    if (from.current === null) return;
    const dy = e.clientY - from.current;
    from.current = null;
    setDragging(false);
    if (dy > DISMISS_PX) {
      // Carries on the way the thumb was going, rather than cutting to the
      // button's drop-and-shrink: a flick that ends in a different animation
      // than it started reads as the app taking over.
      setDismissing(true);
      setDragY(typeof window === "undefined" ? 1000 : window.innerHeight);
      finish();
      return;
    }
    setDragY(0);
  };

  return {
    /** on its way out by the button — the CSS drop-and-shrink */
    closing,
    collapse,
    sheetProps: {
      className: closing ? "audio-mode-out" : dragY === 0 && !dragging ? "audio-mode-in" : "",
      style: {
        // While the thumb is down the sheet tracks it exactly; on release it
        // either springs back or carries on, both over the same 260ms.
        transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
        opacity: dragY > 0 && !dismissing ? Math.max(0.35, 1 - dragY / 900) : undefined,
        transition: dragging ? "none" : `transform ${OUT_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${OUT_MS}ms`,
        touchAction: "pan-y" as const,
      },
      onPointerDown,
      onPointerMove,
      onPointerUp: release,
      onPointerCancel: release,
    },
  };
}
