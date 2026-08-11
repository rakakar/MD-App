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
import { FULL_PAGE, measureCrop, type CropBox } from "@/lib/pdfCrop";
import { textEditionAtPage } from "@/lib/routes";
import { contentLang } from "@/lib/script";
import {
  DEFAULT_PREFS,
  getPdfView,
  getPrefs,
  setPdfView,
  type ResolvedTheme,
} from "@/lib/storage";

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

/**
 * Pages kept drawn either side of the one being read — fewer as the page grows.
 *
 * Two either side is five pages held, which at fit-width is a few megabytes and
 * makes turning back instant. Magnified it is not: a page at 3× carries nine
 * times the pixels, and five of those is a number iOS Safari answers by
 * discarding the tab. Above 1.6× the window closes to one either side, which
 * keeps the worst case near 50 MB instead of past 150.
 */
function windowFor(zoom: number): number {
  return zoom > 1.6 ? 1 : 2;
}

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

/**
 * Cap on canvas backing-store density. A phone reporting DPR 3 on a 390-page
 * scan buys sharpness nobody asked for at nine times the pixels per page, and
 * pages are the thing we hold several of at once.
 */
const MAX_DPR = 2;

/**
 * The hard ceiling on one page's backing store, in pixels.
 *
 * pdf.js's own viewer carries this number (`maxCanvasPixels`, 5.24M on mobile)
 * and it is not a performance tuning knob — it is what stops the tab dying. A
 * cropped A4 page at 3× on a DPR-2 phone asks for 7.2M pixels, 29 MB of backing
 * store, and several pages are held at once. Past the cap the density is
 * lowered rather than the zoom refused: the page stays the size the reader
 * asked for and gives up retina crispness, which is the trade every viewer that
 * survives magnification makes.
 */
const MAX_CANVAS_PX = 4_500_000;

/** No single dimension past this, whatever the area says — older iOS caps at 4096. */
const MAX_CANVAS_SIDE = 8192;

/** Fitted to the column, up to four times it. */
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

/**
 * Where a double tap lands.
 *
 * With the margins trimmed, twice the fitted width puts a line of these scans
 * at 19–24 CSS pixels, which is the size a book is set at. It is one gesture to
 * the size people actually read at, and one more to come back.
 */
const DOUBLE_TAP_ZOOM = 2;

/** Two taps closer together than this, and nearer than {@link TAP_SLOP}, are one gesture. */
const DOUBLE_TAP_MS = 260;
const TAP_SLOP = 32;

/** Rest after a pinch before the pages are drawn again, sharp. */
const ZOOM_SETTLE_MS = 220;

/** Beyond this, a phone held upright is the wrong shape for the page. */
const HINT_ZOOM = 1.6;

/**
 * That the reader has already been told to turn the phone, for this visit only.
 *
 * Session rather than permanent storage on purpose: this is a hint about the
 * device's shape, and the answer changes when somebody picks up a tablet or
 * comes back on a desk. Once a session is the right frequency for something
 * that is genuinely useful the first time and noise the fifth.
 */
const HINT_KEY = "md.pdf.rotatehint";

/** distance between two touches */
function spread(t: TouchList): number {
  return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
}

/** midpoint of two touches — what a pinch is centred on */
function centre(t: TouchList): { x: number; y: number } {
  return { x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 };
}

function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

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
  /**
   * The CSS width it was drawn at, so a zoom or a rotation knows what is stale.
   *
   * The width rather than the zoom level, because the width is what the render
   * actually used: a phone turned sideways changes it without the zoom moving,
   * and a zoom that ends where it began changes nothing and should not redraw
   * three hundred pages to prove it.
   */
  drawnAt: number;
}

/**
 * The crop control: a page with its margins folded in.
 *
 * Drawn rather than borrowed from the icon set because none of the app's icons
 * mean this, and the meaning has to survive being 20px wide on a phone.
 */
function CropIcon({ on }: { on: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3.5"
        y="2.5"
        width="17"
        height="19"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
        opacity={on ? 0.35 : 1}
      />
      {on && (
        <rect
          x="7.5"
          y="6.5"
          width="9"
          height="11"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      )}
      {!on && (
        <>
          <path d="M7.5 8.5h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M7.5 12h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M7.5 15.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export function PdfReader({
  url,
  title,
  startPage = 1,
  onPage,
  onSlow,
  onFail,
  backHref,
  textHref,
  fileSize = null,
  stateKey,
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
  /**
   * The same document as reflowable text — पाठ mode (Compilations.md §9).
   *
   * Absent on every library PDF today, and absent is the honest default: the
   * text only exists where somebody has put this file through the book
   * pipeline. Where it does exist the offer belongs *here*, in the chrome of
   * the thing being read, because what it fixes is felt here — this canvas
   * does not reflow, does not take a font size and does not take a theme, and
   * a reader squinting at it should not have to go back to the folder to find
   * that out.
   */
  textHref?: string;
  /** bytes, when known — decides whether the file is fetched whole or rationed */
  fileSize?: number | null;
  /**
   * Where this document's *view* is remembered — the same key its place is
   * saved under, so the two are found together.
   *
   * How a reader was looking at a document is part of picking it up where they
   * left off. A 220-page scan is unreadable at fit-width, so every reader
   * magnifies it; opening it back at 1× the next evening means doing that work
   * again every time, which is the sort of small tax that makes an app feel
   * like a document viewer rather than a place to read.
   */
  stateKey?: string;
}) {
  const { resolved } = useDisplay();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
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
  /**
   * Magnification, and a **continuous** number rather than a rung on a ladder.
   *
   * It used to be an index into `[1, 1.5, 2.25]`, and a pinch stepped it. Two
   * fingers moving smoothly produced a page that jumped, stopped, jumped — the
   * document lurching between three sizes while the hand asked for everything
   * in between. Worse, all three rungs redrew: the layout width is the zoom, so
   * each step reflowed 390 boxes and re-rendered five pages, at the exact
   * moment the reader was moving.
   *
   * Now a gesture writes a CSS variable straight onto the list (see
   * `applyZoom`) — no React render, no re-raster, just the page growing under
   * the fingers — and this state is only told about it once the hand rests, at
   * which point the pages are drawn again properly. It is what pdf.js's own
   * viewer does with `--scale-factor` and `drawingDelay`.
   */
  const [zoom, setZoom] = useState(MIN_ZOOM);
  /**
   * The margins of a scan, and whether they are folded away.
   *
   * `null` while it is still being measured, which is a third state and not a
   * missing one: it means "no crop yet, and one may be coming", and the page is
   * laid out full-bleed until it arrives.
   */
  const [cropBox, setCropBox] = useState<CropBox | null>(null);
  const [cropOn, setCropOn] = useState(true);
  /** Shown once, when a reader magnifies past the point where the phone is the wrong shape. */
  const [hint, setHint] = useState(false);
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
   * The zoom **as the document is currently drawn on screen**, which during a
   * pinch is ahead of the state above and is what every measurement must use.
   */
  const liveZoom = useRef(zoom);

  /**
   * The crop actually in force, as the render loop needs it — `null` for none.
   *
   * A ref beside the state because `drawOne` must not be rebuilt mid-render by
   * a crop arriving; the redraw that follows is explicit.
   */
  const cropRef = useRef<CropBox | null>(null);
  useEffect(() => {
    cropRef.current = cropOn ? cropBox : null;
  }, [cropOn, cropBox]);

  /** The crop the pages on screen were drawn under — `null` before the first one. */
  const appliedCrop = useRef<string | null>(null);
  /** Set once the margins have been measured (or found already known). */
  const measured = useRef(false);
  /** Whether the rotate hint has had its turn this session. */
  const hinted = useRef(false);

  /** the pinch in progress: how far apart the fingers began, and at what zoom */
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  /** when two fingers were last on the glass — taps just after are not taps */
  const pinchedAt = useRef(0);
  const zoomTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** the last single tap, waiting to find out whether it is half of a double one */
  const lastTap = useRef<{ x: number; y: number; t: number } | null>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      // Half a pixel of slack: a percentage width lands on fractions, and a
      // page redrawn because 718.0004 is not 718 would redraw forever.
      if (box.canvas && Math.abs(box.drawnAt - width) < 0.5) return;

      try {
        const page = pageCache.current.get(n) ?? (await doc.getPage(n));
        pageCache.current.set(n, page);
        trimPages(pageCache.current, PAGE_CACHE);
        if (boxes.current.get(n) !== box) return; // torn down while awaiting

        const crop = cropRef.current ?? FULL_PAGE;
        const base = page.getViewport({ scale: 1 });
        // What the box is: the *cropped* region stretched to the column, so its
        // height follows the crop's own proportions and not the paper's.
        const cssHeight = (width * (base.height * crop.h)) / (base.width * crop.w);

        // **The density is a budget, not a constant.** `MAX_DPR` alone was safe
        // at fit-width and nowhere else: magnified, the same rule asks for a
        // backing store that grows with the square of the zoom, and the phone
        // answers by killing the tab rather than by drawing a smaller page.
        const dpr = Math.max(
          0.5,
          Math.min(
            window.devicePixelRatio || 1,
            MAX_DPR,
            Math.sqrt(MAX_CANVAS_PX / (width * cssHeight)),
            MAX_CANVAS_SIDE / Math.max(width, cssHeight)
          )
        );

        // `width` is the element's own width, which already carries the zoom —
        // the page box is laid out at `--pdf-zoom * 100%`. The scale is chosen
        // so the *cropped* region lands exactly on the canvas; the device ratio
        // on top is what keeps Devanagari matras legible instead of smeared.
        const viewport = page.getViewport({ scale: (width / (base.width * crop.w)) * dpr });

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(viewport.width * crop.w));
        canvas.height = Math.max(1, Math.round(viewport.height * crop.h));
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

        const task = page.render({
          canvas,
          viewport,
          // The crop, and the whole of it. The extra transform is applied in
          // canvas space *outside* the viewport's own (pdf.js does
          // `ctx.transform(transform)` then `ctx.transform(viewport)`), so
          // sliding the page up and left by the margin puts the ink at the
          // canvas origin. Nothing else in the render loop knows a crop exists.
          transform:
            crop === FULL_PAGE
              ? undefined
              : [1, 0, 0, 1, -crop.x * viewport.width, -crop.y * viewport.height],
          // A PDF page is transparent where nothing was painted, and a
          // transparent canvas over a dark theme would show the app through
          // the paper.
          background: "#fff",
        });
        box.task = task;
        await task.promise;
        // `release` nulls the task when it lets a page go; finding it changed
        // means this canvas is no longer wanted.
        if (box.task !== task) return;
        box.task = null;

        box.el.replaceChildren(canvas);
        box.canvas = canvas;
        box.drawnAt = width;

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
    // the render loop. `zoom` and the crop are absent for the same reason and
    // do not need to be here: both reach this through the box's own width and
    // `cropRef`, and both are followed by an explicit redraw.
    [doc, fail]
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
  /**
   * The page whose box contains a point on screen — the same bisection, asked
   * about an arbitrary height rather than the reading line.
   *
   * What a pinch is anchored to. Pages are laid out in order, so the last one
   * whose top has passed the point is the one under it.
   */
  const pageAtY = useCallback(
    (y: number): number => {
      if (pageCount === 0) return 1;
      let lo = 1;
      let hi = pageCount;
      let found = 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const el = boxes.current.get(mid)?.el;
        if (!el) break;
        if (el.getBoundingClientRect().top <= y) {
          found = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      return found;
    },
    [pageCount]
  );

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
      const held = windowFor(liveZoom.current);
      const from = Math.max(1, n - held);
      const to = Math.min(pageCount, n + held);

      const wanted: number[] = [n];
      for (let d = 1; d <= held; d++) {
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

  // ---- how this document was last being looked at ----
  //
  // Before the document is even open, so the first page is drawn at the
  // remembered magnification instead of at 1× and then again a moment later.
  useEffect(() => {
    try {
      hinted.current = window.sessionStorage.getItem(HINT_KEY) === "1";
    } catch {
      // private mode
    }
    if (!stateKey) return;
    const saved = getPdfView(stateKey);
    if (!saved) return;
    if (saved.crop === false) setCropOn(false);
    if (saved.box) {
      const [x, y, w, h] = saved.box;
      setCropBox({ x, y, w, h });
      measured.current = true; // known already; four renders saved
    }
    if (saved.zoom) {
      const z = clampZoom(saved.zoom);
      liveZoom.current = z;
      setZoom(z);
    }
  }, [stateKey]);

  // ---- measure the margins, once per document ----
  //
  // After the first page is on screen, and after a beat: this is four more
  // renders competing for the one worker a reader is already waiting on, and
  // they are worth nothing until there is something to compare them against.
  // The answer is kept, so a document pays for this on its first opening only.
  useEffect(() => {
    if (!doc || !ready || pageCount === 0 || measured.current) return;
    measured.current = true;

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        const box = await measureCrop(doc, pageCount);
        if (cancelled || !box) return;
        setCropBox(box);
        if (stateKey) setPdfView(stateKey, { box: [box.x, box.y, box.w, box.h] });
      })();
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [doc, ready, pageCount, stateKey]);

  // ---- nothing left pending on the way out ----
  useEffect(
    () => () => {
      if (zoomTimer.current) clearTimeout(zoomTimer.current);
      if (tapTimer.current) clearTimeout(tapTimer.current);
    },
    []
  );

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

  /**
   * Magnify, and keep one point of the document exactly where it is.
   *
   * **The zoom is a CSS variable, written straight onto the list.** Not state,
   * because a pinch would then be one React render of 390 list items per frame;
   * not a `transform` on the list either, because a transform magnifies the
   * pixels already drawn and the reader would watch the page turn to mush and
   * then snap sharp. Writing the variable relays out the boxes — cheap, since
   * they hold nothing but an absolutely-positioned canvas — and the canvases
   * inside them are stretched by the browser at their existing resolution until
   * the hand rests and {@link commitZoom} redraws them properly. That is
   * exactly what pdf.js's viewer does with `--scale-factor` and `drawingDelay`.
   *
   * **The anchoring is measured, not calculated.** The obvious arithmetic —
   * scale the scroll offset about the focal point — is wrong here by a growing
   * amount: the list has padding the zoom does not touch and a gap between every
   * pair of pages, so two hundred pages down, the error is hundreds of pixels
   * and the page runs away from the fingers. Instead the page under the focal
   * point is asked where it is before and after, and the difference is the
   * correction. It cannot drift, whatever the layout does.
   */
  const applyZoom = useCallback(
    (next: number, focalX: number, focalY: number) => {
      const scroller = scrollerRef.current;
      const list = listRef.current;
      if (!scroller || !list) return;

      const z = clampZoom(next);
      if (Math.abs(z - liveZoom.current) < 0.001) return;

      const el = boxes.current.get(pageAtY(focalY))?.el ?? null;
      const before = el?.getBoundingClientRect();
      // Where the fingers are *within that page*, as a fraction of it — the one
      // thing that must not change.
      const fx = before && before.width ? (focalX - before.left) / before.width : 0;
      const fy = before && before.height ? (focalY - before.top) / before.height : 0;

      liveZoom.current = z;
      list.style.setProperty("--pdf-zoom", String(z));

      if (el && before) {
        // Reading this forces the layout the line above asked for, deliberately:
        // the correction has to be applied in the same frame as the resize, or
        // the reader sees the document lurch and then be pulled back.
        const after = el.getBoundingClientRect();
        scroller.scrollLeft += after.left + fx * after.width - focalX;
        scroller.scrollTop += after.top + fy * after.height - focalY;
      }

      // A phone held upright cannot show an A4 page at a readable size without
      // sideways dragging — turning it can, and most people never think to.
      if (z > HINT_ZOOM && !hinted.current && window.innerWidth < window.innerHeight) {
        hinted.current = true;
        try {
          window.sessionStorage.setItem(HINT_KEY, "1");
        } catch {
          // private mode; the hint simply shows again next time
        }
        setHint(true);
      }
    },
    [pageAtY]
  );

  /** Throw away what is drawn and draw the window again, wherever it is now. */
  const redrawWindow = useCallback(() => {
    for (const box of boxes.current.values()) box.drawnAt = 0;
    focus(currentRef.current);
  }, [focus]);

  /**
   * The hand has stopped; catch the drawing up.
   *
   * Deferred rather than immediate because a pinch ends in fits — a finger
   * lifts, lands again, adjusts — and re-rendering five magnified pages into
   * each pause is how a smooth gesture turns into a stuttering one. A rest of
   * {@link ZOOM_SETTLE_MS} is below what reads as a wait and above the gaps
   * inside a single gesture.
   */
  const commitZoom = useCallback(() => {
    if (zoomTimer.current) clearTimeout(zoomTimer.current);
    zoomTimer.current = setTimeout(() => {
      zoomTimer.current = null;
      const z = liveZoom.current;
      setZoom(z);
      if (stateKey) setPdfView(stateKey, { zoom: z });
    }, ZOOM_SETTLE_MS);
  }, [stateKey]);

  /**
   * Double tap: to the size a book is set at, and back.
   *
   * The one zoom gesture most readers ever use, and the reason the old `1.5×`
   * badge is gone — a control that cycles through magnifications is a worse
   * answer to "make this bigger" than tapping the thing you want bigger.
   */
  const smartZoom = useCallback(
    (x: number, y: number) => {
      applyZoom(liveZoom.current > MIN_ZOOM + 0.05 ? MIN_ZOOM : DOUBLE_TAP_ZOOM, x, y);
      commitZoom();
    },
    [applyZoom, commitZoom]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const g = gesture.current;
      gesture.current = null;
      if (!g) return;

      // A pinch also produces a pointer press, and a quick one looks exactly
      // like a tap: without this, letting go of a two-finger zoom threw the
      // chrome up over the page it had just magnified.
      if (pinch.current || Date.now() - pinchedAt.current < 400) return;

      const dx = e.clientX - g.x;
      const dy = e.clientY - g.y;
      // A tap is a press that went nowhere. Anything else was a scroll, a drag
      // across a zoomed page, or a pinch — none of which wants a page turn.
      if (Math.abs(dx) >= 12 || Math.abs(dy) >= 12 || Date.now() - g.t >= 400) return;

      const zone = g.x / window.innerWidth;
      // **Edge taps answer instantly, and only the middle waits.** A double tap
      // can only be recognised by waiting to see whether a second one arrives,
      // and a page turn that hesitates feels broken in a way a chrome toggle
      // never does — so the edges keep their old immediacy and the cost of the
      // gesture is paid where it is not felt.
      if (tapZones && !chrome.visible) {
        if (zone < 0.28) return jump(targetRef.current - 1);
        if (zone > 0.72) return jump(targetRef.current + 1);
      }

      const now = Date.now();
      const prev = lastTap.current;
      lastTap.current = { x: e.clientX, y: e.clientY, t: now };
      if (
        prev &&
        now - prev.t < DOUBLE_TAP_MS &&
        Math.abs(e.clientX - prev.x) < TAP_SLOP &&
        Math.abs(e.clientY - prev.y) < TAP_SLOP
      ) {
        lastTap.current = null;
        if (tapTimer.current) {
          clearTimeout(tapTimer.current);
          tapTimer.current = null;
        }
        smartZoom(e.clientX, e.clientY);
        return;
      }

      if (tapTimer.current) clearTimeout(tapTimer.current);
      tapTimer.current = setTimeout(() => {
        tapTimer.current = null;
        chrome.toggle();
      }, DOUBLE_TAP_MS);
    },
    [tapZones, chrome, jump, smartZoom]
  );

  /**
   * Two fingers, tracked continuously — and listened for **natively**.
   *
   * React attaches `touchmove` as a passive listener at the root, which means
   * `preventDefault` from an `onTouchMove` prop is ignored and the browser goes
   * on panning the document underneath a pinch. There is no way to opt out of
   * that per-prop, so the listener is added by hand.
   */
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const start = (e: TouchEvent) => {
      pinch.current =
        e.touches.length === 2 ? { dist: spread(e.touches), zoom: liveZoom.current } : null;
    };
    const move = (e: TouchEvent) => {
      const p = pinch.current;
      if (!p || e.touches.length !== 2) return;
      e.preventDefault(); // the whole reason for the manual listener
      const dist = spread(e.touches);
      if (dist <= 0) return;
      const at = centre(e.touches);
      pinchedAt.current = Date.now();
      applyZoom(p.zoom * (dist / p.dist), at.x, at.y);
    };
    const end = (e: TouchEvent) => {
      if (!pinch.current || e.touches.length >= 2) return;
      pinch.current = null;
      pinchedAt.current = Date.now();
      commitZoom();
    };

    scroller.addEventListener("touchstart", start, { passive: true });
    scroller.addEventListener("touchmove", move, { passive: false });
    scroller.addEventListener("touchend", end);
    scroller.addEventListener("touchcancel", end);
    return () => {
      scroller.removeEventListener("touchstart", start);
      scroller.removeEventListener("touchmove", move);
      scroller.removeEventListener("touchend", end);
      scroller.removeEventListener("touchcancel", end);
    };
  }, [applyZoom, commitZoom]);

  /**
   * A trackpad pinch and `Ctrl`/`⌘` with the wheel — the same gesture, on the
   * desk. Passive by default here too, so this listener is also manual.
   */
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      applyZoom(liveZoom.current * Math.exp(-e.deltaY / 220), e.clientX, e.clientY);
      commitZoom();
    };
    scroller.addEventListener("wheel", wheel, { passive: false });
    return () => scroller.removeEventListener("wheel", wheel);
  }, [applyZoom, commitZoom]);

  // ---- keep the list's own variable in step with the committed zoom ----
  //
  // The ref callback below sets it as the list is created, which is what makes
  // the first page draw at the remembered magnification rather than at 1× and
  // then again. This covers every change after that.
  useEffect(() => {
    listRef.current?.style.setProperty("--pdf-zoom", String(zoom));
  }, [zoom, pageCount]);

  // ---- redraw on zoom ----
  useEffect(() => {
    if (!doc || appliedZoom.current === zoom) return;
    appliedZoom.current = zoom;
    liveZoom.current = zoom;
    redrawWindow();
  }, [zoom, doc, redrawWindow]);

  // ---- a crop changes the shape of every page ----
  //
  // Not just what is drawn: the placeholder's aspect ratio comes from the crop,
  // so the whole column changes height and the scroll offset that meant page 40
  // a moment ago means page 52 now. The reader is put back on their own page
  // before anything is redrawn.
  useEffect(() => {
    if (!doc) return;
    const key = cropOn && cropBox ? `${cropBox.x},${cropBox.y},${cropBox.w},${cropBox.h}` : "none";
    const first = appliedCrop.current === null;
    if (appliedCrop.current === key) return;
    appliedCrop.current = key;
    if (first) return; // nothing has been drawn any other way yet
    boxes.current.get(currentRef.current)?.el.scrollIntoView({ block: "start", behavior: "auto" });
    redrawWindow();
  }, [cropOn, cropBox, doc, redrawWindow]);

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

  // The shape of a page box, which is the *cropped* page's shape and not the
  // paper's — trimming a wide margin off an A4 scan leaves something markedly
  // taller than A4, and a placeholder still shaped like the sheet would make
  // the column jump by that difference on every page as it is drawn.
  const crop = cropOn ? cropBox : null;
  const boxAspect = crop ? (aspect * crop.h) / crop.w : aspect;

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
        {textHref && (
          <Link
            // With the page on it. The reader is 40 pages into a document and
            // asking to read it as text; dropping them at chapter one would
            // make the better reading cost them their place, which is a price
            // nobody pays twice. The route turns the page into a chapter.
            href={textEditionAtPage(textHref, current)}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold"
            style={{ color: "var(--ws-ink)" }}
          >
            <span lang="hi" className="hi">पाठ</span>
          </Link>
        )}
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
        {/* Back to the fitted page, and only when there is something to come
            back from. Every reader magnifies these scans, and finding the way
            out by pinching a page smaller with two fingers on a phone is the
            fiddliest gesture there is. */}
        {zoom > MIN_ZOOM + 0.05 && (
          <button
            type="button"
            onClick={() => {
              const scroller = scrollerRef.current;
              const rect = scroller?.getBoundingClientRect();
              // About the middle of what is on screen, so the line being read
              // stays the line being read.
              applyZoom(
                MIN_ZOOM,
                rect ? rect.left + rect.width / 2 : 0,
                rect ? rect.top + barHeight + READING_LINE : 0
              );
              commitZoom();
            }}
            className="shrink-0 rounded-lg border border-rule px-2 py-1 text-xs font-semibold"
            style={{ color: "var(--ws-ink)" }}
          >
            Fit
          </button>
        )}
        {/* Only where there is a margin worth folding away. On a document that
            is drawn edge to edge the control would do nothing, and a control
            that does nothing is worse than one that is not there. */}
        {cropBox && (
          <button
            type="button"
            onClick={() => {
              const next = !cropOn;
              setCropOn(next);
              if (stateKey) setPdfView(stateKey, { crop: next });
            }}
            aria-pressed={cropOn}
            aria-label={cropOn ? "Show the full page" : "Trim the margins"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rule"
            style={{ color: "var(--ws-ink)" }}
          >
            <CropIcon on={cropOn} />
          </button>
        )}
      </div>

      {/* The one thing a phone cannot be told by making the page bigger: it is
          the wrong way up. Turned sideways these A4 scans reach 20–27px a line
          with no sideways dragging at all, which is the difference between
          looking something up and reading it. */}
      {hint && (
        <button
          type="button"
          onClick={() => setHint(false)}
          className="absolute inset-x-0 bottom-0 z-30 mx-auto mb-6 flex w-max max-w-[92%] items-center gap-2 rounded-full border border-rule bg-card/95 px-4 py-2 text-xs font-medium shadow-lg backdrop-blur"
          style={{ color: "var(--ws-ink)", marginBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
        >
          Turn the phone sideways to read this page full width
        </button>
      )}

      <div
        ref={scrollerRef}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
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
            ref={(el) => {
              listRef.current = el;
              // Set as the list is created, before any effect has run and
              // before a single page has been measured — which is what lets a
              // remembered zoom be drawn once instead of drawn and redrawn.
              el?.style.setProperty("--pdf-zoom", String(liveZoom.current));
            }}
            // The gap scales with the zoom, and it matters more than it looks:
            // a fixed gap between magnified pages is a fixed error repeated
            // three hundred times, and the anchoring above would be fighting it
            // the whole way down the document.
            className="mx-auto flex max-w-3xl flex-col p-2"
            style={{
              paddingTop: barHeight || undefined,
              gap: "calc(var(--pdf-zoom, 1) * 0.5rem)",
            }}
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
                  //
                  // It reads a CSS variable rather than a React value so that a
                  // pinch can move it sixty times a second without rendering
                  // anything — see `applyZoom`.
                  style={{
                    width: "calc(var(--pdf-zoom, 1) * 100%)",
                    aspectRatio: `1 / ${boxAspect}`,
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
