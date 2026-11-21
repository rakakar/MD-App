"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * **Moving the pill out of the way, on a desktop** (Raka, 21 Nov 2026).
 *
 * The pill floats over the page, and on a grid of cards that means it sits on
 * a row of them. A desktop has a mouse and room to spare, so the pill can be
 * picked up and put down wherever it covers nothing — and stays there, across
 * pages and visits, because a listener who moved it once wants it there.
 *
 * Picked up from anywhere on it, buttons included: past a few pixels of travel
 * a press is a drag and the click it would have been is swallowed, short of
 * that it is a click as before. The ground between the buttons is a sliver, so
 * a grip that only worked there would be a grip nobody finds.
 *
 * The offset is a `transform`, which the pill's entrance and exit leave alone —
 * they animate the separate `translate` property, so the two add up and the
 * pill still rises from, and drops to, wherever it was left.
 *
 * Not on a phone: there the pill spans the screen between thumbs and the tab
 * bar, and a drag on it would be a scroll that went wrong.
 */
const THRESHOLD = 4;
/** how close to the window's edge it may be put */
const MARGIN = 8;

type Offset = { x: number; y: number };

export function usePillDrag(
  ref: React.RefObject<HTMLElement | null>,
  enabled: boolean,
  storageKey: string
) {
  const key = `md-pill-offset:${storageKey}`;
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const offsetRef = useRef(offset);
  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  /** keep the whole pill inside the window, whatever the offset asks for */
  const clamp = useCallback(
    (want: Offset, from: Offset = offsetRef.current): Offset => {
      const el = ref.current;
      if (!el) return want;
      const r = el.getBoundingClientRect();
      // where it would sit with no offset at all
      const left = r.left - from.x;
      const top = r.top - from.y;
      const minX = MARGIN - left;
      const maxX = innerWidth - MARGIN - (left + r.width);
      const minY = MARGIN - top;
      const maxY = innerHeight - MARGIN - (top + r.height);
      return {
        x: Math.min(Math.max(want.x, minX), Math.max(minX, maxX)),
        y: Math.min(Math.max(want.y, minY), Math.max(minY, maxY)),
      };
    },
    [ref]
  );

  // Where it was left last time — read after mount, so the first paint
  // matches the server's and the clamp has a real element to measure.
  useEffect(() => {
    if (!enabled) return;
    let saved: Offset | null = null;
    try {
      const raw = localStorage.getItem(key);
      if (raw) saved = JSON.parse(raw) as Offset;
    } catch {
      // no storage, or junk in it — the pill just starts where it always did
    }
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      setOffset(clamp(saved, { x: 0, y: 0 }));
    }
  }, [enabled, key, clamp]);

  // A narrower window must not strand it off the edge.
  useEffect(() => {
    if (!enabled) return;
    const onResize = () => setOffset((o) => clamp(o));
    addEventListener("resize", onResize);
    return () => removeEventListener("resize", onResize);
  }, [enabled, clamp]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!enabled || e.button !== 0) return;
      const el = ref.current;
      if (!el) return;
      const startX = e.clientX;
      const startY = e.clientY;
      const start = offsetRef.current;
      const id = e.pointerId;
      let moved = false;

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== id) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!moved) {
          if (Math.hypot(dx, dy) < THRESHOLD) return;
          moved = true;
          setDragging(true);
          // Captured only now: capturing on the press would send the click
          // to the pill instead of the button under the finger.
          try {
            el.setPointerCapture(id);
          } catch {}
        }
        ev.preventDefault();
        const next = clamp({ x: start.x + dx, y: start.y + dy }, start);
        offsetRef.current = next;
        setOffset(next);
      };
      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== id) return;
        removeEventListener("pointermove", onMove);
        removeEventListener("pointerup", onUp);
        removeEventListener("pointercancel", onUp);
        if (!moved) return;
        setDragging(false);
        // the click a drag ends in is not a press of whatever it ended on
        const swallow = (c: MouseEvent) => {
          c.stopPropagation();
          c.preventDefault();
        };
        addEventListener("click", swallow, { capture: true, once: true });
        setTimeout(() => removeEventListener("click", swallow, { capture: true }), 0);
        try {
          localStorage.setItem(key, JSON.stringify(offsetRef.current));
        } catch {}
      };
      addEventListener("pointermove", onMove);
      addEventListener("pointerup", onUp);
      addEventListener("pointercancel", onUp);
    },
    [enabled, ref, clamp, key]
  );

  /** double-click the ground to send it home */
  const onDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!enabled || (e.target as HTMLElement).closest("button")) return;
      setOffset({ x: 0, y: 0 });
      try {
        localStorage.removeItem(key);
      } catch {}
    },
    [enabled, key]
  );

  if (!enabled) return { dragProps: {}, dragStyle: undefined, dragClass: "" };
  return {
    dragProps: { onPointerDown, onDoubleClick },
    dragStyle:
      offset.x || offset.y ? { transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` } : undefined,
    dragClass: dragging ? "cursor-grabbing select-none" : "cursor-grab select-none",
  };
}
