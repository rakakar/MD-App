"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CloseIcon } from "@/components/shell/icons";
import type { LibraryFile } from "@/lib/types";

/**
 * The full-screen photo viewer — one picture, and the way to the next.
 *
 * Lifted out of `ImageGallery`, where it was private, because the shelf's photo
 * strip wants the same thing: tapping a photograph should open the photograph,
 * not a filtered list with the photograph somewhere in it. Two viewers would
 * have been two sets of gestures for one job.
 *
 * Charts are the reason the zoom is not optional. A Madhyasth Darshan chart is a
 * dense diagram of small Devanagari labels; at thumbnail size it is a grey
 * texture, and at page width on a 375px phone it is still unreadable. Being able
 * to zoom into one corner of it is the whole feature, so zoom is implemented
 * here rather than left to the browser: inside a fixed, scroll-locked overlay
 * the page's own pinch gesture does nothing on most phones.
 *
 * Four ways to the next picture, because four kinds of reader arrive here: a
 * swipe, the arrow keys, the buttons, and the reel along the foot. The reel is
 * the one that says how many there are and where you are in them without
 * anybody having to read a number.
 */
const MAX_SCALE = 6;
/** how far a flat drag must travel to count as a swipe rather than a tap */
const SWIPE_PX = 48;

export function Lightbox({
  items,
  index,
  onIndex,
  onClose,
  total,
}: {
  items: LibraryFile[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  /**
   * How many there are altogether, when that is more than has been loaded.
   *
   * The counter says the true figure — "12 / 171" — while the reel and the
   * navigation work on what has actually arrived. A reader who is told 60 and
   * then finds there are 171 has been misinformed by the app once; a reader
   * told 171 while the next twenty are still coming has been told the truth
   * slightly early.
   */
  total?: number;
}) {
  const item = items[index];
  const stageRef = useRef<HTMLDivElement>(null);
  const reelRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  // Live pointers, by id. Not state: they change every frame of a pinch, and
  // re-rendering on each one drops the gesture on a mid-range phone.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; scale: number } | null>(null);
  const lastTap = useRef(0);
  /** where a single pointer went down, for telling a swipe from a tap */
  const swipeFrom = useRef<{ x: number; y: number } | null>(null);

  // A new image starts unzoomed — carrying the previous one's transform over
  // lands the reader in the middle of a chart they have not seen yet.
  useEffect(() => setView({ scale: 1, x: 0, y: 0 }), [index]);

  // Keep the reel's current thumbnail in view, however the picture was
  // changed. Swiping through twenty photographs while the reel sits on the
  // first five is a reel that has stopped describing anything.
  useEffect(() => {
    const el = reelRef.current?.querySelector<HTMLElement>('[data-current="true"]');
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [index]);

  // The thumbnail is already in the browser's cache — whatever opened this
  // overlay just drew it — so showing it here is free and instant. A 6MB
  // original over mobile data is several seconds of black screen otherwise,
  // and a reader who taps a photograph and sees nothing taps again.
  //
  // The swap is a state change rather than an `onLoad` on the visible <img>,
  // because swapping a live element's `src` blanks it while the new bytes
  // decode; loading the original off-screen first means the soft picture is
  // replaced by the sharp one in a single frame.
  //
  // Held as *which* original has arrived rather than as a boolean, so moving
  // to the next picture makes this false by derivation. A boolean would need
  // an effect to reset it on `index` — a second render, and a frame of the new
  // photograph wearing the old one's "ready".
  const [loaded, setLoaded] = useState<string | null>(null);
  const ready = !item.thumbnail_url || loaded === item.url;
  useEffect(() => {
    if (!item.thumbnail_url) return;
    const src = item.url;
    const full = new window.Image();
    full.onload = () => setLoaded(src);
    // No `onerror`: a picture that will not load leaves the thumbnail on
    // screen, blurry but readable, rather than the alt text of a broken <img>.
    full.src = src;
    return () => {
      full.onload = null;
    };
  }, [item.url, item.thumbnail_url]);

  // The page behind must not scroll while a full-screen chart is open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index < items.length - 1) onIndex(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onIndex, index, items.length]);

  /** zoom about a point in stage coordinates, so the pinch stays under the fingers */
  const zoomAbout = useCallback((nextScale: number, cx: number, cy: number) => {
    setView((v) => {
      const scale = Math.min(MAX_SCALE, Math.max(1, nextScale));
      const box = stageRef.current?.getBoundingClientRect();
      if (!box) return { ...v, scale };
      const originX = cx - box.left - box.width / 2;
      const originY = cy - box.top - box.height / 2;
      const ratio = scale / v.scale;
      // Back at 1× the image is centred again, so a reader can always get out
      // of a zoom without hunting for the edges.
      if (scale === 1) return { scale: 1, x: 0, y: 0 };
      return {
        scale,
        x: originX - (originX - v.x) * ratio,
        y: originY - (originY - v.y) * ratio,
      };
    });
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    swipeFrom.current =
      pointers.current.size === 1 ? { x: e.clientX, y: e.clientY } : null;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale: view.scale };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const previous = pointers.current.get(e.pointerId);
    if (!previous) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current.distance > 0) {
        zoomAbout(
          (pinch.current.scale * distance) / pinch.current.distance,
          (a.x + b.x) / 2,
          (a.y + b.y) / 2
        );
      }
      return;
    }
    // One finger pans, but only once there is something to pan: at 1× the
    // drag would slide a fitted image off its own frame for no reason — and at
    // 1× a flat drag is the swipe instead, resolved when the finger lifts.
    if (view.scale > 1) {
      setView((v) => ({
        ...v,
        x: v.x + (e.clientX - previous.x),
        y: v.y + (e.clientY - previous.y),
      }));
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) swipeFrom.current = null;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const from = swipeFrom.current;
    const wasSingle = pointers.current.size === 1;
    endPointer(e);

    // A swipe only when the picture is not zoomed — once it is, a sideways drag
    // is how you look at the left edge of a chart, and stealing that to change
    // photograph would make the zoom useless.
    if (wasSingle && from && view.scale <= 1.05) {
      const dx = e.clientX - from.x;
      const dy = e.clientY - from.y;
      // Horizontal *and* decisively so: a diagonal drag on a phone is usually
      // someone starting to scroll, not asking for the next picture.
      if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0 && index < items.length - 1) onIndex(index + 1);
        if (dx > 0 && index > 0) onIndex(index - 1);
        lastTap.current = 0;
        return;
      }
    }

    /** double-tap toggles a readable zoom — the gesture people try first */
    const now = Date.now();
    if (now - lastTap.current < 300) {
      zoomAbout(view.scale > 1.05 ? 1 : 2.5, e.clientX, e.clientY);
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      // Padded for the notch like `VideoStage`: this overlay covers the app's
      // own header, so without the inset the title sits under the status bar.
      className="fixed inset-0 z-50 flex flex-col bg-black/95 pt-[env(safe-area-inset-top)]"
    >
      <div className="flex items-start gap-3 p-3 text-white">
        <div className="min-w-0 flex-1">
          <p lang="hi" className="hi hi-tight truncate text-sm font-semibold">
            {item.title}
          </p>
          <p className="mt-0.5 text-xs text-white/60">
            {index + 1} / {total ?? items.length}
            {view.scale > 1.05 && ` · ${view.scale.toFixed(1)}×`}
            {/* Said out loud, because until the original lands the picture on
                screen is a 480px thumbnail: a reader who pinches into a chart
                and finds it soft should know it is still arriving rather than
                conclude the scan is bad. */}
            {!ready && <> · <span>Loading full image…</span></>}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-white/10 text-white"
        >
          <CloseIcon />
        </button>
      </div>

      <div
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={endPointer}
        onWheel={(e) => zoomAbout(view.scale * (e.deltaY < 0 ? 1.15 : 0.87), e.clientX, e.clientY)}
        // The browser's own gestures are turned off here on purpose: inside a
        // scroll-locked overlay they do nothing useful and they steal the
        // pointer stream this zoom is built on.
        className="flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ready ? item.url : (item.thumbnail_url ?? item.url)}
          alt={item.title}
          draggable={false}
          className="max-h-full max-w-full object-contain"
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            transformOrigin: "center",
          }}
        />
      </div>

      {/* Arrows flanking the reel rather than a row of their own: on a desktop
          there is no swipe, and a pointer wants somewhere to click that is not
          a thumbnail. Hidden from a screen reader — the reel below is the same
          set of destinations, named. */}
      <div className="flex items-center gap-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        <NavButton
          label="Previous photo"
          glyph="‹"
          onClick={() => onIndex(index - 1)}
          disabled={index === 0}
        />
        <div
          ref={reelRef}
          className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none]"
        >
          {items.map((thumb, i) => (
            <button
              key={thumb.id}
              type="button"
              data-current={i === index}
              onClick={() => onIndex(i)}
              aria-label={thumb.title}
              aria-current={i === index ? "true" : undefined}
              className={`h-12 w-12 shrink-0 overflow-hidden rounded-control border-2 transition-opacity ${
                i === index ? "opacity-100" : "border-transparent opacity-45"
              }`}
              style={i === index ? { borderColor: "var(--ws-color)" } : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumb.thumbnail_url ?? thumb.url}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
        <NavButton
          label="Next photo"
          glyph="›"
          onClick={() => onIndex(index + 1)}
          disabled={index === items.length - 1}
        />
      </div>
    </div>
  );
}

function NavButton({
  label,
  glyph,
  onClick,
  disabled,
}: {
  label: string;
  glyph: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-12 w-9 shrink-0 items-center justify-center rounded-control bg-white/10 text-lg text-white transition-opacity disabled:opacity-25"
    >
      <span aria-hidden>{glyph}</span>
    </button>
  );
}
