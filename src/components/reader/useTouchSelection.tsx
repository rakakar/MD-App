"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { textNodes } from "@/lib/highlights";

/**
 * **The reader's own text selection, on touch screens.**
 *
 * With the phone doing the selecting, Android puts its own pill over the page
 * (Copy · Select all · Web search) and Chrome adds Google's "Tap to see search
 * results" sheet under it — two menus fighting the reader's own bar, and the
 * designer's call (13 Oct 2026) was that they go. No browser lets a page keep
 * a native selection and hide its menu, so on a touch screen the book's text
 * is not selectable at all (`[data-touch-select]` in globals.css) and this
 * draws the selection instead:
 *
 * - press and hold a word: it is selected, and dragging without lifting
 *   extends it, a word at a time;
 * - two handles adjust either end afterwards;
 * - either can run on into the next paragraph, or back into the one before.
 *   What it hands the reader is one part per paragraph, because that is how a
 *   highlight is stored: as words within one paragraph's text.
 *
 * Mouse and keyboard keep the browser's selection — they never had a pill.
 *
 * Each end is held as a paragraph and a character offset into its text nodes
 * (the same nodes `selectionSpan` counts), and turned into live Ranges only
 * to measure them. Hit-testing is done by measuring characters rather than with
 * `caretRangeFromPoint`, which has nothing to land on in unselectable text.
 */

const HOLD_MS = 450;
const SLOP = 10;
/** the knob's diameter, and the square a finger can grab it by */
const KNOB = 26;
const GRAB = 60;

/** A place in the book's text: a paragraph, and a character offset into it. */
interface Pos {
  host: HTMLElement;
  offset: number;
}

/** `start` is never after `end`. */
interface Sel {
  start: Pos;
  end: Pos;
}

/** What a selection hands the reader: the words it covers in each paragraph. */
export interface TouchPart {
  host: HTMLElement;
  range: Range;
}

/** Document order: negative when `a` comes first. */
function cmp(a: Pos, b: Pos): number {
  if (a.host === b.host) return a.offset - b.offset;
  return a.host.compareDocumentPosition(b.host) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

/** The paragraphs on show, in order — not a margin note's. */
function hostsOf(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>("[data-ref]")].filter(
    (h) => !h.parentElement?.closest("[data-margin]") && !h.hasAttribute("data-margin")
  );
}

/** Text nodes the reader can select: the paragraph's, minus a margin note. */
function nodesOf(host: HTMLElement): Text[] {
  return textNodes(host).filter((n) => !n.parentElement?.closest("[data-margin]"));
}

function textOf(host: HTMLElement): string {
  return nodesOf(host)
    .map((n) => n.data)
    .join("");
}

/** A live Range over offsets `start…end` of the host's selectable text. */
function rangeOf(host: HTMLElement, start: number, end: number): Range | null {
  const r = document.createRange();
  let seen = 0;
  let setStart = false;
  for (const n of nodesOf(host)) {
    const len = n.data.length;
    if (!setStart && start <= seen + len) {
      r.setStart(n, start - seen);
      setStart = true;
    }
    if (setStart && end <= seen + len) {
      r.setEnd(n, end - seen);
      return r;
    }
    seen += len;
  }
  return null;
}

/**
 * The character nearest a point, as an offset into the host's text. Vertical
 * distance is weighted so a point between two lines lands on the nearer line
 * rather than on a nearer letter of the wrong one. `strict` asks for a point
 * near a letter — a long press out in blank space selects nothing.
 */
function charAt(host: HTMLElement, x: number, y: number, strict: boolean): number | null {
  let best = Infinity;
  let at: number | null = null;
  let seen = 0;
  const r = document.createRange();
  for (const n of nodesOf(host)) {
    r.selectNodeContents(n);
    const box = r.getBoundingClientRect();
    const far = Math.max(0, box.top - y, y - box.bottom) * 3;
    if (far <= best) {
      for (let i = 0; i < n.data.length; i++) {
        r.setStart(n, i);
        r.setEnd(n, i + 1);
        const c = r.getBoundingClientRect();
        if (c.width < 0.5) continue;
        const dx = Math.max(0, c.left - x, x - c.right);
        const dy = Math.max(0, c.top - y, y - c.bottom);
        const d = dy * 3 + dx;
        if (d < best) {
          best = d;
          // past a letter's middle means after it
          at = seen + i + (x > c.left + c.width / 2 ? 1 : 0);
        }
      }
    }
    seen += n.data.length;
  }
  // A finger is not a cursor: the lines are set wide apart, and a press in
  // the gap between two of them, or just past a line's end, still means the
  // word beside it. (Weighted: about 15px off the line, or 45 along it.)
  if (strict && best > 45) return null;
  return at;
}

type Segmenter = { segment(s: string): Iterable<{ index: number; segment: string; isWordLike?: boolean }> };

/** Word boundaries around offset `i` — Devanagari-aware where the browser is. */
function wordAt(text: string, i: number): { start: number; end: number } {
  const Seg = (Intl as unknown as { Segmenter?: new (l: string, o: object) => Segmenter }).Segmenter;
  if (Seg) {
    // The word under `i`; on a space or a danda, the word before it, or
    // failing that the one after.
    let before: { start: number; end: number } | null = null;
    let onGap = false;
    for (const s of new Seg("hi", { granularity: "word" }).segment(text)) {
      const span = { start: s.index, end: s.index + s.segment.length };
      const word = s.isWordLike !== false;
      if (onGap) {
        if (word) return span;
        continue;
      }
      if (i >= span.start && i < span.end) {
        if (word) return span;
        if (before) return before;
        onGap = true;
        continue;
      }
      if (word) before = span;
    }
    if (before) return before;
  }
  const isWord = (c: string) => !/[\s.,;:!?।॥"“”'‘’()\[\]{}\-–—]/.test(c);
  let start = Math.min(i, text.length - 1);
  if (!isWord(text[start] ?? " ") && start > 0) start--;
  let end = start;
  while (start > 0 && isWord(text[start - 1])) start--;
  while (end < text.length && isWord(text[end])) end++;
  return { start, end: Math.max(end, start + 1) };
}

/** The word at a place, as two places. */
function wordOf(p: Pos): { start: Pos; end: Pos } {
  const text = textOf(p.host);
  const w = wordAt(text, Math.max(0, Math.min(p.offset, text.length - 1)));
  return { start: { host: p.host, offset: w.start }, end: { host: p.host, offset: w.end } };
}

/**
 * The place nearest a point anywhere in the text: the paragraph whose box is
 * nearest it (it is usually inside one), then the letter nearest in that.
 */
function hitAt(root: HTMLElement, x: number, y: number): Pos | null {
  let host: HTMLElement | null = null;
  let best = Infinity;
  for (const h of hostsOf(root)) {
    const b = h.getBoundingClientRect();
    const d = Math.max(0, b.top - y, y - b.bottom);
    if (d < best) {
      best = d;
      host = h;
    }
    if (d === 0) break;
  }
  if (!host) return null;
  const at = charAt(host, x, y, false);
  return at === null ? null : { host, offset: at };
}

/** One Range per paragraph the selection touches. */
function partsOf(root: HTMLElement, s: Sel): TouchPart[] {
  const hosts = hostsOf(root);
  const from = hosts.indexOf(s.start.host);
  const to = hosts.indexOf(s.end.host);
  if (from === -1 || to === -1) return [];
  const out: TouchPart[] = [];
  for (const host of hosts.slice(from, to + 1)) {
    const a = host === s.start.host ? s.start.offset : 0;
    const b = host === s.end.host ? s.end.offset : textOf(host).length;
    if (b <= a) continue;
    const range = rangeOf(host, a, b);
    if (range && range.toString().trim()) out.push({ host, range });
  }
  return out;
}

export function useTouchSelection({
  contentRef,
  onSelect,
}: {
  contentRef: React.RefObject<HTMLDivElement | null>;
  /** a finished selection, one part per paragraph, in order */
  onSelect: (parts: TouchPart[]) => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [sel, setSel] = useState<Sel | null>(null);
  const selRef = useRef<Sel | null>(null);
  const lastSelectAt = useRef(0);
  /** when the last press-and-hold landed on a word */
  const heldAt = useRef(0);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // A coarse pointer is a finger; a laptop with a touch screen keeps the
  // mouse's native selection.
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setEnabled(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const set = useCallback((next: Sel | null) => {
    selRef.current = next;
    setSel(next);
  }, []);

  const commit = useCallback(() => {
    const s = selRef.current;
    const root = contentRef.current;
    if (!s || !root) return;
    const parts = partsOf(root, s);
    if (parts.length === 0) return;
    lastSelectAt.current = Date.now();
    onSelectRef.current(parts);
  }, [contentRef]);

  const clear = useCallback(() => set(null), [set]);
  /** the first paragraph's part, for anything that needs to measure it */
  const range = useCallback(() => {
    const s = selRef.current;
    const root = contentRef.current;
    return s && root ? (partsOf(root, s)[0]?.range ?? null) : null;
  }, [contentRef]);
  const justSelected = useCallback(() => Date.now() - lastSelectAt.current < 500, []);
  const madeSince = useCallback((t: number) => heldAt.current >= t, []);

  // ---- press and hold, then drag to extend ----
  // On the document, with the text area looked up per press: the reader
  // mounts its text after the first render, and a listener attached to the
  // element at that moment was attached to nothing.
  useEffect(() => {
    if (!enabled) return;
    const inText = (el: Element | null) => !!el && !!contentRef.current?.contains(el);
    let timer: ReturnType<typeof setTimeout> | null = null;
    let origin: { x: number; y: number } | null = null;
    let anchor: Sel | null = null;

    const cancel = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };

    const onStart = (e: TouchEvent) => {
      cancel();
      anchor = null;
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const el = e.target as HTMLElement;
      if (!inText(el)) return;
      if (el.closest("[data-sel-handle],a,button,input,textarea,select,label,[data-margin]")) return;
      origin = { x: t.clientX, y: t.clientY };
      timer = setTimeout(() => {
        timer = null;
        const { x, y } = origin!;
        const host = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-ref]");
        if (!host || !inText(host) || host.closest("[data-margin]")) return;
        const at = charAt(host, x, y, true);
        if (at === null) return;
        anchor = wordOf({ host, offset: at });
        heldAt.current = Date.now();
        set(anchor);
        navigator.vibrate?.(8);
      }, HOLD_MS);
    };

    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      if (timer && origin && Math.hypot(t.clientX - origin.x, t.clientY - origin.y) > SLOP) cancel();
      if (!anchor) return;
      // the press became a selection: the page must not scroll under it
      if (e.cancelable) e.preventDefault();
      const root = contentRef.current;
      const hit = root && hitAt(root, t.clientX, t.clientY);
      if (!hit) return;
      const w = wordOf(hit);
      set({
        start: cmp(w.start, anchor.start) < 0 ? w.start : anchor.start,
        end: cmp(w.end, anchor.end) > 0 ? w.end : anchor.end,
      });
    };

    const onEnd = () => {
      cancel();
      if (anchor) {
        anchor = null;
        commit();
      }
    };

    // Android's long-press menu (and an image's "save" sheet) is the
    // phone's, not the reader's.
    const onMenu = (e: Event) => {
      if (inText(e.target as Element)) e.preventDefault();
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd);
    document.addEventListener("touchcancel", onEnd);
    document.addEventListener("contextmenu", onMenu);
    return () => {
      cancel();
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
      document.removeEventListener("contextmenu", onMenu);
    };
  }, [enabled, contentRef, set, commit]);

  // ---- what to draw: the selected lines and the two handles ----
  const [rects, setRects] = useState<{ left: number; top: number; width: number; height: number }[]>([]);
  const measure = useCallback(() => {
    const s = selRef.current;
    const root = contentRef.current;
    if (!s || !root) {
      setRects([]);
      return;
    }
    const o = root.getBoundingClientRect();
    setRects(
      partsOf(root, s)
        .flatMap((p) => [...p.range.getClientRects()])
        .filter((c) => c.width > 1)
        .map((c) => ({ left: c.left - o.left, top: c.top - o.top, width: c.width, height: c.height }))
    );
  }, [contentRef]);

  useLayoutEffect(measure, [sel, measure]);
  useEffect(() => {
    if (!sel) return;
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [sel, measure]);

  // ---- the handles ----
  const drag = useRef<"start" | "end" | null>(null);
  /**
   * How far below the line it moves the finger is. The handle hangs under the
   * text, so the point a finger means is above where it is; measured at the
   * press rather than fixed, so it holds at every text size.
   */
  const lift = useRef(0);
  const onHandleDown = (which: "start" | "end", lineHeight: number) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    drag.current = which;
    const lineMid = (e.currentTarget as HTMLElement).getBoundingClientRect().top - lineHeight / 2;
    lift.current = e.clientY - lineMid;
    try {
      // so the drag keeps coming here once the finger leaves the handle
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* a pointer already gone — the drag simply ends on the next up */
    }
  };
  const onHandleMove = (e: React.PointerEvent) => {
    const s = selRef.current;
    const root = contentRef.current;
    if (!drag.current || !s || !root) return;
    e.stopPropagation();
    const hit = hitAt(root, e.clientX, e.clientY - lift.current);
    if (!hit) return;
    const w = wordOf(hit);
    // Dragged past the other end, the handles trade places: the one in hand
    // carries on as the other, and the end it passed keeps its whole word.
    if (drag.current === "start") {
      if (cmp(w.start, s.end) < 0) set({ start: w.start, end: s.end });
      else {
        drag.current = "end";
        set({ start: wordOf({ ...s.end, offset: s.end.offset - 1 }).start, end: w.end });
      }
    } else {
      if (cmp(w.end, s.start) > 0) set({ start: s.start, end: w.end });
      else {
        drag.current = "start";
        set({ start: w.start, end: wordOf(s.start).end });
      }
    }
  };
  const onHandleUp = (e: React.PointerEvent) => {
    if (!drag.current) return;
    e.stopPropagation();
    drag.current = null;
    commit();
  };

  const first = rects[0];
  const last = rects[rects.length - 1];
  /*
   * A stem up the selected line's edge, so it is plain which letter the
   * selection starts or stops at, and under it a knob big enough for a thumb —
   * the designer's call, 13 Oct 2026, after 16px proved too small to catch.
   * The knob wears a ring of the page so it stands off the tint behind it.
   */
  const handle = (which: "start" | "end", left: number, top: number, lineHeight: number) => (
    <span
      key={which}
      data-sel-handle
      aria-hidden
      onPointerDown={onHandleDown(which, lineHeight)}
      onPointerMove={onHandleMove}
      onPointerUp={onHandleUp}
      onPointerCancel={onHandleUp}
      className="pointer-events-auto absolute flex -translate-x-1/2 touch-none justify-center"
      style={{ left, top, width: GRAB, height: GRAB }}
    >
      <span
        className="absolute bottom-full w-0.5"
        style={{ height: lineHeight, background: "var(--ws-color)" }}
      />
      <span
        className="block rounded-full"
        style={{
          width: KNOB,
          height: KNOB,
          background: "var(--ws-color)",
          boxShadow: "0 0 0 2px var(--reader-bg), 0 1px 4px rgb(0 0 0 / 0.3)",
        }}
      />
    </span>
  );

  const overlay =
    enabled && sel && first ? (
      <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
        {rects.map((c, i) => (
          <span
            key={i}
            className="absolute"
            style={{
              ...c,
              background: "color-mix(in srgb, var(--ws-color) 26%, transparent)",
            }}
          />
        ))}
        {handle("start", first.left, first.top + first.height, first.height)}
        {handle("end", last.left + last.width, last.top + last.height, last.height)}
      </div>
    ) : null;

  return {
    /** the book's text is the reader's to select here, not the phone's */
    enabled,
    active: sel !== null,
    /** the live range, for anything that needs to measure it */
    range,
    clear,
    /** a press-and-hold just ended: the tap it leaves behind is not a tap */
    justSelected,
    /** whether a press that began at `t` is the one that made the selection */
    madeSince,
    overlay,
  };
}
