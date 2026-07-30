"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProvenanceBadge } from "@/components/resources/ProvenanceBadge";
import { CloseIcon } from "@/components/shell/icons";
import type { ResourceItem } from "@/lib/types";

/**
 * A collection's images — thumbnails, then full screen with pinch-zoom.
 *
 * Charts are the reason the lightbox is not optional. A मध्यस्थ दर्शन chart is
 * a dense diagram of small Devanagari labels; at thumbnail size it is a grey
 * texture, and at page width on a 375px phone it is still unreadable. Being
 * able to zoom into one corner of it is the whole feature, so zoom is
 * implemented here rather than left to the browser: inside a fixed, scroll-
 * locked overlay, the page's own pinch gesture does nothing on most phones.
 */
export function ImageGallery({ items }: { items: ResourceItem[] }) {
  const [openAt, setOpenAt] = useState<number | null>(null);

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item, i) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => setOpenAt(i)}
              className="group block w-full text-left"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.title}
                loading="lazy"
                className="aspect-[4/3] w-full rounded-xl border border-rule bg-white object-contain transition-shadow group-hover:shadow-md"
              />
              <span lang="hi" className="hi mt-1.5 block truncate text-xs font-medium">
                {item.title}
              </span>
              <ProvenanceBadge
                provenance={item.provenance}
                provenanceHi={item.provenance_hi}
              />
            </button>
          </li>
        ))}
      </ul>

      {openAt !== null && (
        <Lightbox
          items={items}
          index={openAt}
          onIndex={setOpenAt}
          onClose={() => setOpenAt(null)}
        />
      )}
    </>
  );
}

const MAX_SCALE = 6;

function Lightbox({
  items,
  index,
  onIndex,
  onClose,
}: {
  items: ResourceItem[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const item = items[index];
  const stageRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  // Live pointers, by id. Not state: they change every frame of a pinch, and
  // re-rendering on each one drops the gesture on a mid-range phone.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; scale: number } | null>(null);
  const lastTap = useRef(0);

  // A new image starts unzoomed — carrying the previous one's transform over
  // lands the reader in the middle of a chart they have not seen yet.
  useEffect(() => setView({ scale: 1, x: 0, y: 0 }), [index]);

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
    // drag would slide a fitted image off its own frame for no reason.
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
  };

  /** double-tap toggles a readable zoom — the gesture people try first */
  const onPointerUp = (e: React.PointerEvent) => {
    endPointer(e);
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
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
    >
      <div className="flex items-start gap-3 p-3 text-white">
        <div className="min-w-0 flex-1">
          <p lang="hi" className="hi truncate text-sm font-semibold">
            {item.title}
          </p>
          <p className="mt-0.5 text-xs text-white/60">
            {index + 1} / {items.length}
            {view.scale > 1.05 && ` · ${view.scale.toFixed(1)}×`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white"
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
          src={item.url}
          alt={item.title}
          draggable={false}
          className="max-h-full max-w-full object-contain"
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            transformOrigin: "center",
          }}
        />
      </div>

      <div className="flex items-center justify-between gap-3 p-3">
        <NavButton
          label="पिछला"
          onClick={() => onIndex(index - 1)}
          disabled={index === 0}
        />
        <p className="text-center text-[11px] text-white/50">
          <span lang="hi" className="hi">दो उँगलियों से बड़ा करें</span> · pinch or
          double-tap to zoom
        </p>
        <NavButton
          label="अगला"
          onClick={() => onIndex(index + 1)}
          disabled={index === items.length - 1}
        />
      </div>
    </div>
  );
}

function NavButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white disabled:opacity-30"
    >
      <span lang="hi" className="hi">{label}</span>
    </button>
  );
}
