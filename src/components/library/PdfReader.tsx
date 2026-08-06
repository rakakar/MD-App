"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  PDFPageProxy,
  RenderTask,
} from "pdfjs-dist";
import { useReaderChrome } from "@/components/reader/useReaderChrome";
import { BackIcon } from "@/components/shell/icons";
import { useDisplay } from "@/components/shell/DisplayProvider";
import { contentLang } from "@/lib/script";
import { DEFAULT_PREFS, getPrefs, type ResolvedTheme } from "@/lib/storage";

/**
 * An error, in the few words a fix can be built from.
 *
 * Deliberately the machine's own words rather than a friendly paraphrase:
 * this is read off a screenshot from a phone that cannot be borrowed, and
 * `ChunkLoadError` names a cause that "something went wrong" never will.
 */
function describe(e: unknown): string {
  const err = e as { name?: string; message?: string } | null;
  const name = err?.name || "Error";
  const message = (err?.message || "").slice(0, 120);
  return message ? `${name}: ${message}` : name;
}

/**
 * A PDF rendered **by us**, page by page, onto canvas.
 *
 * The whole reason this exists rather than an `<iframe>`: a browser's built-in
 * viewer is a cross-origin black box. It cannot be asked which page a reader
 * reached, so a PDF was the one thing in the library nobody could pick up
 * where they left off. Everything below — the observer, the page store, the
 * resume card two files away — hangs off that one missing number.
 *
 * What it renders is not in question. pdf.js draws text, raster scans and
 * vector charts through the same code path, and the library's PDFs are all
 * three: a 220-page book set in a pre-Unicode Devanagari face, 38-page sheets
 * that are one JPEG per page, and charts built from a thousand vector paths.
 * All render; the legacy face renders correctly because it is embedded, even
 * though its *text* extracts as mojibake — which costs us selection and search,
 * and nothing that is drawn.
 *
 * **What it cannot do is make a heavy file light.** Opening a document means
 * walking its cross-reference table, and the library's big scans were OCR'd
 * after they were linearized, which leaves the fast-open hint table stale and
 * sends pdf.js chasing the xref chain backwards in 64 KB chunks — 382 requests
 * and twenty-odd seconds on a 97 MB file before page one exists. There is no
 * flag for that; the file has to be repaired at source. So this reports
 * failure instead of pretending, and `PdfView` above it puts the reader back
 * on the native viewer when it does.
 */

/**
 * How long before we *offer* a way out — never before we take one.
 *
 * The first PDF a reader opens pays for ~1.6 MB of pdf.js on top of the
 * document itself, and on mobile data that is legitimately slow rather than
 * broken. An earlier version treated this as failure and switched to the
 * browser's own viewer, which on Android is not a viewer at all: Chrome there
 * has no inline PDF support, so the "fallback" was a grey placeholder and a
 * download button. Giving up on the reader's behalf has to be the reader's
 * decision, so this only surfaces the offer and the loading continues behind it.
 */
const SLOW_MS = 10_000;

/** Pages kept drawn either side of the one being read. */
const WINDOW = 2;

/**
 * How many decoded page proxies to hold before letting the oldest go.
 *
 * Wider than the drawn window on purpose: turning back one page should not
 * mean decoding it again. pdf.js's viewer keeps ten for the same reason.
 */
const PAGE_CACHE = 12;

/**
 * Under this, fetch the whole document rather than page-by-page ranges.
 *
 * Twelve megabytes is roughly three photographs, and buys every page of a
 * document instantly for the rest of the session. Above it, a reader who opens
 * a 97 MB scan to check one page should not be charged for all of it.
 */
const EAGER_MAX_BYTES = 12 * 1024 * 1024;

/**
 * How far below the top edge the "page you are reading" is judged from.
 *
 * Not the very top: a reader who has scrolled two centimetres into page 7 is
 * reading page 7, but its top edge has already left the screen, and measuring
 * at zero would call that page 8 and save the wrong place.
 */
const READING_LINE = 80;

/** A flick fires hundreds of scroll events; only the rest at the end counts. */
const SETTLE_MS = 120;

/** How far two fingers must spread or close before the scale steps. */
const PINCH_IN = 0.77;
const PINCH_OUT = 1.3;

/** distance between two touches */
function spread(t: React.TouchList): number {
  return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
}

/**
 * Cap on canvas backing-store density. A phone reporting DPR 3 on a 390-page
 * scan buys sharpness nobody asked for at nine times the pixels per page, and
 * pages are the thing we hold several of at once.
 */
const MAX_DPR = 2;

/** Fit-width, then two steps up. Down is what the browser's own pinch is for. */
const ZOOMS = [1, 1.5, 2.25];

/**
 * Paper is white and the app may not be.
 *
 * The dark case is the standard inversion — a scan is black ink on white, so
 * rotating the hue back after inverting leaves photographs approximately
 * themselves while the page becomes ink-on-dark. Sepia only warms; the page is
 * already close.
 */
const THEME_FILTER: Record<ResolvedTheme, string> = {
  light: "none",
  sepia: "sepia(0.22) saturate(0.94) brightness(0.98)",
  dark: "invert(1) hue-rotate(180deg) brightness(0.92) contrast(1.05)",
};

/**
 * Give back the canvases of every page outside `from..to`.
 *
 * Five canvases at a capped DPR is a bounded cost on a 390-page document;
 * keeping all 390 is not. Module-level rather than a hook: it mutates the box
 * records, and the React compiler rightly treats values reached through a
 * memoised callback as frozen.
 *
 * **It no longer touches the page proxies.** It used to call `cleanup()` on
 * each one as it went, which is what left pages permanently blank: a cleaned
 * proxy stayed in the cache and was handed back to the next render, which drew
 * nothing and never recovered — reliably, a handful of pages into a scroll.
 * pdf.js's own viewer does not do this either; it cleans up on an idle timer,
 * not on every scroll. Proxies are bounded by {@link trimPages} instead.
 */
function release(boxes: Map<number, PageBox>, from: number, to: number): void {
  for (const [n, box] of boxes) {
    if (n >= from && n <= to) continue;
    box.task?.cancel();
    box.task = null;
    if (box.canvas) {
      box.el.replaceChildren();
      box.canvas = null;
      box.drawnAt = 0;
    }
  }
}

/**
 * Keep the page-proxy cache bounded, oldest first — and **only** clean up a
 * proxy on its way out, never one that might be drawn again.
 *
 * A `Map` keeps insertion order, so the oldest entries are the front of it.
 */
function trimPages(cache: Map<number, PDFPageProxy>, keep: number): void {
  while (cache.size > keep) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) return;
    cache.get(oldest)?.cleanup();
    cache.delete(oldest);
  }
}

interface PageBox {
  /** the wrapper we measure and draw into */
  el: HTMLDivElement;
  canvas: HTMLCanvasElement | null;
  task: RenderTask | null;
  /** the scale it was drawn at, so a zoom knows what is stale */
  drawnAt: number;
}

export function PdfReader({
  url,
  title,
  startPage = 1,
  onPage,
  onSlow,
  onFail,
  backHref,
  fileSize = null,
}: {
  url: string;
  title: string;
  /** where to open — a saved place, or page 1 */
  startPage?: number;
  /** the page being read, reported as it changes; never called before first paint */
  onPage?: (page: number, pageCount: number) => void;
  /**
   * Still working after {@link SLOW_MS}. An invitation for the parent to offer
   * a way out — **not** a failure, and not a reason to unmount this: the
   * document is still loading and usually still arrives.
   */
  onSlow?: () => void;
  /**
   * This document genuinely cannot be read here — the parent should fall back.
   *
   * Carries the error's own name and message, and the fallback puts it on
   * screen. Not for the reader's benefit: a PDF that dies instantly on one
   * make of phone and works everywhere else is unreproducible on a desk, and
   * "it just says Open the document" is not something a fix can be built from.
   * One screenshot with `ChunkLoadError` or `TypeError: … is not a function`
   * in it names the cause immediately.
   */
  onFail?: (detail: string) => void;
  /** where the back control goes; without it the reader draws none */
  backHref?: string;
  /** bytes, when known — decides whether the file is fetched whole or rationed */
  fileSize?: number | null;
}) {
  const { resolved } = useDisplay();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  // Never locked: this reader has no sheet or dialog to pin the chrome open for.
  const chrome = useReaderChrome("scroll", false, scrollerRef);
  const [tapZones, setTapZones] = useState(DEFAULT_PREFS.tapZones);
  /**
   * The bar's height, held as a number and spent as top padding on the page
   * list. The bar overlays the pages rather than sitting above them, so that
   * hiding it slides it away over the document instead of reflowing the column
   * — a reflow would resize every page and redraw the lot, which is a heavy
   * price for a bar politely getting out of the way.
   */
  const [barHeight, setBarHeight] = useState(0);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [current, setCurrent] = useState(startPage);
  const [zoom, setZoom] = useState(0);
  const [ready, setReady] = useState(false);
  /** how much of the document has arrived, 0–100; only meaningful before it opens */
  const [loadedPct, setLoaded] = useState(0);
  /**
   * Page one's shape, applied to every placeholder — which is what gives a
   * 390-page document an honest scroll height from the first frame instead of
   * one that grows under the reader's thumb as pages arrive. Read from page
   * one alone because asking 390 pages for their dimensions to lay out a
   * scrollbar is 390 requests; a document whose pages differ simply has a
   * slightly wrong placeholder until that page is drawn.
   */
  const [aspect, setAspect] = useState(1.414); // A4 until page one says otherwise

  // Everything the render loop mutates lives in refs: it is driven by an
  // IntersectionObserver and a resize, neither of which is a render, and
  // putting canvases in state would redraw the document to move a scrollbar.
  const boxes = useRef(new Map<number, PageBox>());
  const pageCache = useRef(new Map<number, PDFPageProxy>());
  const failed = useRef(false);
  const jumped = useRef(false);
  const appliedZoom = useRef(zoom);
  /**
   * "A page has painted", readable from `draw` without being a dependency of
   * it. As state alone it rebuilt `draw` the instant the first page landed,
   * and that cascade re-entered the render — see the note on `draw`.
   */
  const readyRef = useRef(false);

  // The page being read, reachable from effects that must not *depend* on it:
  // a zoom or a rotation redraws around wherever the reader is, but listing
  // `current` as a dependency would rerun those on every page turn and redraw
  // the window at a scale it is already drawn at.
  const currentRef = useRef(current);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  /**
   * The page last *asked for*, updated the instant it is asked rather than
   * when the scroll settles. What Prev/Next and the edge taps count from —
   * see {@link jump}.
   */
  const targetRef = useRef(startPage);

  const fail = useCallback(
    (detail: string) => {
      if (failed.current) return; // one verdict per document
      failed.current = true;
      onFail?.(detail);
    },
    [onFail]
  );

  // ---- open the document ----
  //
  // **Every callback this depends on must be memoised by the caller.** Reopening
  // is not a cheap re-render: it tears down the worker and fetches the document
  // again, so an inline arrow passed as `onSlow` or `onFail` would re-download a
  // 27 MB file on every parent render. `PdfView` wraps all of them.
  useEffect(() => {
    let cancelled = false;
    // The *loading task*, not the document: `destroy()` lives here in pdf.js 6
    // and it is what aborts in-flight range requests and tears down the
    // worker. A document alone has only `cleanup()`, which frees decoded pages
    // and leaves the network and the worker running — so a reader who closes a
    // 390-page scan mid-open would keep downloading it.
    let loading: PDFDocumentLoadingTask | null = null;

    // Armed before the library is even fetched: on a bad connection the import
    // itself is most of what the reader is waiting through, so a timer that
    // only covered the document would say nothing during the longest part.
    const timer = setTimeout(() => {
      if (!cancelled) onSlow?.();
    }, SLOW_MS);

    (async () => {
      try {
        // Dynamic, and the single reason this is a client component of its
        // own: pdf.js is ~400 KB that no reader who never opens a PDF should
        // pay for, and every other library page would otherwise carry it.
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();
        if (cancelled) return;

        loading = pdfjs.getDocument({
          url,
          rangeChunkSize: 65536,
          /*
           * **Small files are fetched whole; only the heavy ones are rationed.**
           *
           * `disableAutoFetch` was on for everything, which meant every page a
           * reader reached needed its own range request — one round trip per
           * page, on mobile latency, forever. On a 441 KB book that is absurd:
           * the whole document costs less than a single photograph, and paying
           * for it once buys every one of its 220 pages instantly. It is also
           * what pdf.js's own viewer does by default, and why it feels
           * immediate after the first moment.
           *
           * Above the threshold the rationing earns its keep: a 97 MB scan
           * fetched eagerly is 97 MB of someone's data plan for a document
           * they may read three pages of.
           */
          disableAutoFetch: (fileSize ?? 0) > EAGER_MAX_BYTES,
        });
        // What the reader is actually waiting for, said in numbers. A bare
        // "Opening…" over a 27 MB document is indistinguishable from a hang,
        // and that guess is what makes people leave.
        loading.onProgress = ({ loaded, total }: { loaded: number; total: number }) => {
          if (cancelled || !total) return;
          setLoaded(Math.min(100, Math.round((loaded / total) * 100)));
        };

        const opened = await loading.promise;
        if (cancelled) return; // the cleanup below destroys the loading task

        const first = await opened.getPage(1);
        const vp = first.getViewport({ scale: 1 });
        pageCache.current.set(1, first);

        clearTimeout(timer);
        setAspect(vp.height / vp.width);
        setPageCount(opened.numPages);
        setDoc(opened);
      } catch (e) {
        clearTimeout(timer);
        if (!cancelled) fail(describe(e));
      }
    })();

    // Captured now rather than read at teardown: the maps themselves never
    // change identity, but the lint rule cannot know that and the copy costs
    // nothing.
    const drawn = boxes.current;
    const cached = pageCache.current;
    return () => {
      cancelled = true;
      clearTimeout(timer);
      for (const box of drawn.values()) box.task?.cancel();
      drawn.clear();
      cached.clear();
      void loading?.destroy();
    };
  }, [url, fail, onSlow, fileSize]);

  // ---- draw one page ----
  //
  // Called only by the queue below, and therefore never concurrently. That is
  // the whole design: pdf.js's own viewer renders one page at a time through a
  // `PDFRenderingQueue`, and the reason is not politeness — five renders racing
  // for one worker finish later than five in a row, and every guard needed to
  // keep them from colliding is a place to get it wrong. This ran five at once
  // and grew exactly those guards, and one of them is what left pages blank.
  //
  // Each render still gets a fresh canvas, swapped in only once painted, so a
  // redraw never blanks the page it is replacing.
  const drawOne = useCallback(
    async (n: number) => {
      const box = boxes.current.get(n);
      if (!doc || !box) return;

      const width = box.el.clientWidth;
      if (width === 0) return;
      const scale = ZOOMS[zoom];
      if (box.canvas && box.drawnAt === scale) return; // already good at this zoom

      try {
        const page = pageCache.current.get(n) ?? (await doc.getPage(n));
        pageCache.current.set(n, page);
        trimPages(pageCache.current, PAGE_CACHE);
        if (boxes.current.get(n) !== box) return; // torn down while awaiting

        const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
        const base = page.getViewport({ scale: 1 });
        // `width` is the element's own width, which already carries the zoom —
        // the page box is laid out at `scale * 100%`. Only the device ratio is
        // applied on top, which is what keeps Devanagari matras legible instead
        // of smeared.
        const viewport = page.getViewport({ scale: (width / base.width) * dpr });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        // **Taken out of layout entirely.** As a normal child with `height:
        // auto` the canvas decided its own box, so a page was one height while
        // drawn and another while blank — and since pages are drawn and
        // released constantly as the reader moves, every page below the window
        // shifted each time. The reading line then landed on a different page
        // than the geometry said, and the place saved on leaving was a page or
        // two out. The wrapper owns the size now; the canvas only fills it.
        canvas.style.position = "absolute";
        canvas.style.inset = "0";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.className = "rounded-md";

        const task = page.render({ canvas, viewport });
        box.task = task;
        await task.promise;
        // `release` nulls the task when it lets a page go; finding it changed
        // means this canvas is no longer wanted.
        if (box.task !== task) return;
        box.task = null;

        box.el.replaceChildren(canvas);
        box.canvas = canvas;
        box.drawnAt = scale;

        if (!readyRef.current) {
          readyRef.current = true;
          setReady(true);
        }
      } catch (e) {
        // A cancelled render is the normal way a fast scroll ends, not a fault.
        if ((e as { name?: string })?.name === "RenderingCancelledException") return;
        fail(describe(e));
      }
    },
    // `ready` is deliberately absent — see `readyRef`. Listing it rebuilt this
    // callback the moment the first page painted, and that cascade re-entered
    // the render loop.
    [doc, zoom, fail]
  );

  /**
   * The render queue — one page at a time, nearest first.
   *
   * Re-queuing *replaces* what was waiting rather than appending to it, which
   * is the other half of what the official viewer's "highest priority page"
   * does: a reader who has scrolled on has said, by scrolling, that the pages
   * they left are no longer the ones to spend the worker on.
   */
  const queue = useRef<number[]>([]);
  const pumping = useRef(false);

  const pump = useCallback(async () => {
    if (pumping.current) return;
    pumping.current = true;
    try {
      while (queue.current.length > 0) {
        const n = queue.current.shift();
        if (n === undefined) break;
        await drawOne(n);
      }
    } finally {
      pumping.current = false;
    }
  }, [drawOne]);

  /**
   * The page at the reading line, found by bisection.
   *
   * This was an `IntersectionObserver` first. What replaced it is not more
   * robust — scroll events and observer callbacks are both dispatched in the
   * rendering steps, so a tab at zero frames delivers neither, and no
   * arrangement of this survives that (what does is the opening `focus` below,
   * which asks rather than waits). It is here because it answers a sharper
   * question: an observer knows which pages *intersect*, and with a 200px
   * margin that set still holds the page a reader has just left, so the lowest
   * of them is a page or so behind the truth. A line 80px down the viewport is
   * exactly "the page being read", which is the number that gets saved.
   *
   * Bisection rather than a scan because a 390-page document has 390 boxes and
   * this runs on every settled scroll. Pages are laid out in order, so the last
   * one whose top has passed the line is the one being read.
   */
  const pageAtTop = useCallback((): number => {
    const scroller = scrollerRef.current;
    if (!scroller || pageCount === 0) return 1;
    // Below the bar, not below the scroller: the bar floats over the pages, so
    // the first thing a reader can actually see starts `barHeight` down. Judging
    // from the scroller's own top would read a page that is behind the bar.
    const top = scroller.getBoundingClientRect().top + barHeight + READING_LINE;

    let lo = 1;
    let hi = pageCount;
    let found = 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const el = boxes.current.get(mid)?.el;
      if (!el) break;
      if (el.getBoundingClientRect().top <= top) {
        found = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return found;
  }, [pageCount, barHeight]);

  /**
   * Draw around a page and release the canvases nowhere near it.
   *
   * The order matters as much as the set: the page being read first, then out
   * in both directions. A reader waiting on the page in front of them should
   * not be behind two neighbours in the queue.
   */
  const focus = useCallback(
    (n: number) => {
      const from = Math.max(1, n - WINDOW);
      const to = Math.min(pageCount, n + WINDOW);

      const wanted: number[] = [n];
      for (let d = 1; d <= WINDOW; d++) {
        if (n + d <= to) wanted.push(n + d);
        if (n - d >= from) wanted.push(n - d);
      }
      queue.current = wanted;
      void pump();

      release(boxes.current, from, to);
    },
    [pageCount, pump]
  );

  // ---- follow the reader ----
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!doc || pageCount === 0 || !scroller) return;

    let timer: ReturnType<typeof setTimeout>;
    const settle = () => {
      const n = pageAtTop();
      // Scrolling by hand is also "asking to be" somewhere — without this a
      // finger-scroll from page 3 to page 40 would leave the next tap of Next
      // counting from 3.
      targetRef.current = n;
      setCurrent(n);
      focus(n);
    };
    const onScroll = () => {
      clearTimeout(timer);
      // A thumb-flick through a shivir fires hundreds of these. Only where it
      // comes to rest is worth a page number or five renders.
      timer = setTimeout(settle, SETTLE_MS);
    };

    // The opening draw, immediately and not on a scroll that may never come.
    // This is the one part that must not wait to be told: a reader who opens a
    // document and reads without touching it never scrolls, and a tab restored
    // from the background may deliver no events for a while — either way the
    // first pages have to be on screen already.
    focus(Math.min(Math.max(1, startPage), pageCount));

    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
  }, [doc, pageCount, startPage, pageAtTop, focus]);

  // ---- open at the saved place ----
  useEffect(() => {
    if (!doc || pageCount === 0 || jumped.current) return;
    jumped.current = true;
    if (startPage <= 1) return;
    const box = boxes.current.get(Math.min(startPage, pageCount));
    // `auto`, never smooth: this is where the reader already was, so scrolling
    // there should look like the page opening, not like a journey.
    box?.el.scrollIntoView({ block: "start", behavior: "auto" });
  }, [doc, pageCount, startPage]);

  // ---- report the page ----
  useEffect(() => {
    if (!ready || pageCount === 0) return;
    onPage?.(current, pageCount);
  }, [current, pageCount, ready, onPage]);

  // ---- the reader's own preference for edge taps ----
  useEffect(() => {
    setTapZones(getPrefs().tapZones);
  }, []);

  // ---- how much room the bar takes ----
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const measure = () => setBarHeight(bar.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

  // ---- gestures ----
  //
  // The same vocabulary the book reader speaks (see `Reader.onPointerUp`), so
  // that "reading" means one thing in this app: a tap in the middle shows or
  // hides the chrome, a tap at either edge turns a page when the chrome is
  // already out of the way.
  //
  // **No horizontal swipe, deliberately.** It is the obvious gesture to reach
  // for and the wrong one here: a zoomed page is wider than the screen and has
  // to be dragged sideways to be read, so a swipe-to-turn would fight the pan
  // at exactly the magnification where the pan matters most. Vertical scroll
  // is the page turn — it is what every document reader does, and it is what a
  // continuous scroll of pages already means.
  const gesture = useRef<{ x: number; y: number; t: number } | null>(null);

  /**
   * Go to a page, and count from where the reader **asked** to be.
   *
   * `targetRef` rather than `currentRef` because the two disagree for a moment
   * and the difference is visible: `current` is only refreshed once a scroll
   * settles, so two taps of Next inside {@link SETTLE_MS} both read the same
   * page and jumped to the same place — the second tap did nothing at all.
   * The label and the drawing are moved here too, so a tap answers on the tap
   * rather than a tenth of a second later.
   */
  const jump = useCallback(
    (to: number) => {
      if (pageCount === 0) return;
      const n = Math.min(Math.max(1, to), pageCount);
      targetRef.current = n;
      setCurrent(n);
      boxes.current.get(n)?.el.scrollIntoView({ block: "start", behavior: "auto" });
      focus(n);
    },
    [pageCount, focus]
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // never hijack a control
    if ((e.target as HTMLElement).closest("[data-pdf-chrome],a,button")) {
      gesture.current = null;
      return;
    }
    gesture.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const g = gesture.current;
      gesture.current = null;
      if (!g) return;

      const dx = e.clientX - g.x;
      const dy = e.clientY - g.y;
      // A tap is a press that went nowhere. Anything else was a scroll, a drag
      // across a zoomed page, or a pinch — none of which wants a page turn.
      if (Math.abs(dx) >= 12 || Math.abs(dy) >= 12 || Date.now() - g.t >= 400) return;

      const zone = g.x / window.innerWidth;
      if (tapZones && !chrome.visible) {
        if (zone < 0.28) return jump(targetRef.current - 1);
        if (zone > 0.72) return jump(targetRef.current + 1);
      }
      chrome.toggle();
    },
    [tapZones, chrome, jump]
  );

  /**
   * Pinch, mapped onto our own scale ladder.
   *
   * The browser's pinch is switched off (see `touch-action` below), so this is
   * what a reader's two fingers now do. Stepping rather than tracking the
   * gesture continuously is on purpose: each step is a real re-render at the
   * new scale, which is sharp, and a continuous pinch would ask for hundreds
   * of them. The thresholds are wide enough that a small wobble does nothing.
   */
  const pinch = useRef<number | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    pinch.current = e.touches.length === 2 ? spread(e.touches) : null;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2 || pinch.current === null) return;
    const now = spread(e.touches);
    const ratio = now / pinch.current;
    if (ratio > PINCH_OUT) {
      setZoom((z) => Math.min(z + 1, ZOOMS.length - 1));
      pinch.current = now;
    } else if (ratio < PINCH_IN) {
      setZoom((z) => Math.max(z - 1, 0));
      pinch.current = now;
    }
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) pinch.current = null;
  }, []);

  /** Throw away what is drawn and draw the window again, wherever it is now. */
  const redrawWindow = useCallback(() => {
    for (const box of boxes.current.values()) box.drawnAt = 0;
    focus(currentRef.current);
  }, [focus]);

  // ---- redraw on zoom ----
  useEffect(() => {
    if (!doc || appliedZoom.current === zoom) return;
    appliedZoom.current = zoom;
    redrawWindow();
  }, [zoom, doc, redrawWindow]);

  // ---- redraw when the column changes width ----
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !doc) return;
    let timer: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      // A rotating phone fires these in a burst, and each one would otherwise
      // start five renders that the next one cancels.
      timer = setTimeout(redrawWindow, 200);
    });
    observer.observe(scroller);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [doc, redrawWindow]);

  const register = useCallback((n: number, el: HTMLDivElement | null) => {
    if (!el) {
      const box = boxes.current.get(n);
      box?.task?.cancel();
      boxes.current.delete(n);
      return;
    }
    if (!boxes.current.has(n)) {
      boxes.current.set(n, { el, canvas: null, task: null, drawnAt: 0 });
    }
  }, []);

  return (
    // The whole screen. `h-dvh` rather than `h-screen` so the layout does not
    // sit under a phone's URL bar as it collapses, and `relative` because the
    // bar floats over the pages rather than pushing them down.
    <div className="relative h-dvh overflow-hidden bg-canvas">
      <div
        ref={barRef}
        data-pdf-chrome
        data-hidden={!chrome.visible}
        // `reader-chrome` is the book reader's own transition — the bar slides
        // up and fades rather than blinking out, and a hidden one stops taking
        // taps so the page beneath it is fully readable.
        className="reader-chrome reader-chrome-top absolute inset-x-0 top-0 z-20 flex items-center gap-1 border-b border-rule bg-card/95 px-2 py-2 backdrop-blur"
        style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top))" }}
      >
        {backHref && (
          <Link
            href={backHref}
            aria-label="Back"
            className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ color: "var(--ws-ink)" }}
          >
            <BackIcon />
          </Link>
        )}
        <span className="min-w-0 flex-1">
          <span
            {...contentLang(title)}
            className={`${contentLang(title).className} block truncate text-sm font-semibold leading-tight`}
          >
            {title}
          </span>
          {/* The page a reader is on — the fact the native viewer hid, and the
              one the whole feature turns on. */}
          <span className="block text-xs font-medium tabular-nums text-ink-soft">
            {pageCount > 0 ? `Page ${current} of ${pageCount}` : "Opening…"}
          </span>
        </span>
        <button
          type="button"
          onClick={() => jump(current - 1)}
          disabled={current <= 1}
          className="rounded-lg px-2 py-1 text-xs font-semibold disabled:opacity-35"
          style={{ color: "var(--ws-ink)" }}
        >
          Prev
        </button>
        <button
          type="button"
          onClick={() => jump(current + 1)}
          disabled={pageCount > 0 && current >= pageCount}
          className="rounded-lg px-2 py-1 text-xs font-semibold disabled:opacity-35"
          style={{ color: "var(--ws-ink)" }}
        >
          Next
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => (z + 1) % ZOOMS.length)}
          className="rounded-lg border border-rule px-2 py-1 text-xs font-semibold tabular-nums"
          style={{ color: "var(--ws-ink)" }}
          aria-label={`Zoom, currently ${ZOOMS[zoom]}x`}
        >
          {ZOOMS[zoom]}×
        </button>
      </div>

      <div
        ref={scrollerRef}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        /*
         * `pan-x pan-y`, and the omission of `pinch-zoom` is the point.
         *
         * This said `pinch-zoom` alone, which does not mean "pinch as well" —
         * it means **only** pinch, and a one-finger drag stopped scrolling the
         * document at all. Two fingers to read a page is not reading.
         *
         * Dropping the browser's own pinch is a gain twice over. Its zoom is a
         * blurry upscale of pixels already drawn, while the pinch handled below
         * steps our own scale and re-renders sharp; and because it magnifies
         * the *visual viewport*, it dragged the title bar around with it —
         * which is the other thing that had to stop.
         *
         * `overflow-x` matters once zoomed: a page wider than the column has to
         * be reachable sideways, or the right edge of every line is simply
         * gone, which is worse than not zooming at all.
         */
        className="absolute inset-0 overflow-y-auto overflow-x-auto overscroll-contain [touch-action:pan-x_pan-y] [-webkit-tap-highlight-color:transparent]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label={title}
      >
        {pageCount === 0 ? (
          <div
            className="flex h-full flex-col items-center justify-center gap-2 px-6"
            // clears the bar, which floats over this too
            style={{ paddingTop: barHeight || undefined }}
          >
            <span className="text-sm text-ink-soft">
              {loadedPct > 0 ? "Downloading the document…" : "Preparing the reader…"}
            </span>
            {loadedPct > 0 && (
              <>
                <span className="block h-1.5 w-40 overflow-hidden rounded-full bg-canvas">
                  <span
                    className="block h-full rounded-full transition-[width]"
                    style={{
                      width: `${loadedPct}%`,
                      background:
                        "linear-gradient(90deg, var(--color-accent), var(--ws-color))",
                    }}
                  />
                </span>
                <span className="text-xs tabular-nums text-ink-soft">{loadedPct}%</span>
              </>
            )}
          </div>
        ) : (
          // Pages run edge to edge on a phone and are held to a readable
          // column on a desktop, where a 27-inch-wide scan is not reading
          // either. The gap is the only thing separating one page from the
          // next, which is how a paper book reads on a screen.
          //
          // The top padding is the bar's own height, so the first page starts
          // below it and stays there — the padding does not change when the bar
          // hides, which is what keeps a vanishing bar from reflowing and
          // redrawing the whole document.
          <ul
            className="mx-auto flex max-w-3xl flex-col gap-2 p-2"
            style={{ paddingTop: barHeight || undefined }}
          >
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
              <li key={n}>
                <div
                  ref={(el) => register(n, el)}
                  data-page={n}
                  // The placeholder holds the scroll height before anything is
                  // drawn, taken from page one's shape — so the scrollbar is
                  // honest on a 390-page document from the first frame, rather
                  // than growing under the reader's thumb as pages arrive.
                  //
                  // **The zoom lives here, on the width, and that is the whole
                  // of it.** It used to be applied to the canvas backing store
                  // alone while the canvas stayed `width: 100%`, so stepping up
                  // rendered four times the pixels into the same column: the
                  // page got sharper and never got bigger, which to a reader
                  // pressing a zoom control is simply a button that does
                  // nothing. Widen the box and the text grows; `draw` reads
                  // this width back and renders to fit it.
                  style={{
                    width: `${ZOOMS[zoom] * 100}%`,
                    aspectRatio: `1 / ${aspect}`,
                    filter: THEME_FILTER[resolved],
                  }}
                  className="relative max-w-none bg-white"
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
