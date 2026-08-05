"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  PDFPageProxy,
  RenderTask,
} from "pdfjs-dist";
import { BackIcon } from "@/components/shell/icons";
import { useDisplay } from "@/components/shell/DisplayProvider";
import { contentLang } from "@/lib/script";
import type { ResolvedTheme } from "@/lib/storage";

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
 * Give back every page outside `from..to` — its canvas, its render task and
 * its decoded operator list.
 *
 * Five canvases at a capped DPR is a bounded cost on a 390-page document;
 * keeping all 390 is not. Module-level rather than a hook: it mutates the box
 * records, and the React compiler rightly treats values reached through a
 * memoised callback as frozen.
 */
function release(
  boxes: Map<number, PageBox>,
  cache: Map<number, PDFPageProxy>,
  from: number,
  to: number
): void {
  for (const [n, box] of boxes) {
    if (n >= from && n <= to) continue;
    box.task?.cancel();
    box.task = null;
    if (box.canvas) {
      box.el.replaceChildren();
      box.canvas = null;
      box.drawnAt = 0;
    }
    cache.get(n)?.cleanup();
  }
}

interface PageBox {
  /** the wrapper we measure and draw into */
  el: HTMLDivElement;
  canvas: HTMLCanvasElement | null;
  task: RenderTask | null;
  /** the scale it was drawn at, so a zoom knows what is stale */
  drawnAt: number;
  /** the scale currently being drawn, so one page never draws twice at once */
  drawingAt: number;
}

export function PdfReader({
  url,
  title,
  startPage = 1,
  onPage,
  onSlow,
  onFail,
  backHref,
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
}) {
  const { resolved } = useDisplay();
  const scrollerRef = useRef<HTMLDivElement>(null);
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
          // Fetch what a page needs rather than the whole file. R2 answers
          // ranged GETs and exposes Content-Range to this origin, so on a
          // healthy document this is the difference between opening a book and
          // downloading one.
          rangeChunkSize: 65536,
          disableAutoFetch: true,
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
  }, [url, fail, onSlow]);

  // ---- draw one page ----
  //
  // **Every render gets its own canvas, and a page draws once at a time.**
  // Both rules are here because of the same defect. `draw` awaits `getPage`
  // before it renders, so two calls for the same page could each get past the
  // guard and then call `render()` on one shared canvas — which pdf.js
  // rejects outright: *"Cannot use the same canvas during multiple render()
  // operations."* And two calls were not hypothetical: `ready` flipping on the
  // first completed page rebuilt this callback, which rebuilt `focus`, which
  // re-ran the effect that had just called it. Whether that raced depended on
  // whether the first render had finished — so it struck one document on one
  // phone and nothing on a desk.
  //
  // A fresh canvas makes the collision impossible rather than unlikely, and
  // swapping it in only once it is painted means a redraw never blanks the
  // page it is replacing.
  const draw = useCallback(
    async (n: number) => {
      const box = boxes.current.get(n);
      if (!doc || !box) return;

      const width = box.el.clientWidth;
      if (width === 0) return;
      const scale = ZOOMS[zoom];
      if (box.canvas && box.drawnAt === scale) return; // already good at this zoom
      if (box.drawingAt === scale) return; // already on its way at this zoom

      // Cancel what is in flight and **wait for it to unwind**. `cancel()` only
      // asks; the task settles a beat later, and starting the next render
      // before it does is the other half of the same bug.
      if (box.task) {
        const previous = box.task;
        previous.cancel();
        await previous.promise.catch(() => {});
        if (box.task === previous) box.task = null;
      }

      box.drawingAt = scale;
      try {
        const page = pageCache.current.get(n) ?? (await doc.getPage(n));
        pageCache.current.set(n, page);
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
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        canvas.style.display = "block";
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
      } finally {
        if (box.drawingAt === scale) box.drawingAt = 0;
      }
    },
    // `ready` is deliberately absent — see `readyRef`. Listing it rebuilt this
    // callback the moment the first page painted, and that cascade is what
    // produced the double render above.
    [doc, zoom, fail]
  );

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
    const top = scroller.getBoundingClientRect().top + READING_LINE;

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
  }, [pageCount]);

  /** Draw around a page and release the canvases that are nowhere near it. */
  const focus = useCallback(
    (n: number) => {
      const from = Math.max(1, n - WINDOW);
      const to = Math.min(pageCount, n + WINDOW);
      for (let i = from; i <= to; i++) void draw(i);
      release(boxes.current, pageCache.current, from, to);
    },
    [pageCount, draw]
  );

  // ---- follow the reader ----
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!doc || pageCount === 0 || !scroller) return;

    let timer: ReturnType<typeof setTimeout>;
    const settle = () => {
      const n = pageAtTop();
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
      boxes.current.set(n, { el, canvas: null, task: null, drawnAt: 0, drawingAt: 0 });
    }
  }, []);

  const jump = (to: number) => {
    const n = Math.min(Math.max(1, to), pageCount);
    boxes.current.get(n)?.el.scrollIntoView({ block: "start", behavior: "auto" });
  };

  return (
    // The whole screen, and only as much chrome as a reader needs to leave,
    // know where they are, and change the size. `h-dvh` rather than `h-screen`
    // so the bar does not sit under a phone's URL bar as it collapses.
    <div className="flex h-dvh flex-col bg-canvas">
      <div
        className="flex items-center gap-1 border-b border-rule bg-card px-2 py-2"
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
        // `pinch-zoom` on top of our own steps: the browser's pinch is instant
        // and blurry, ours is a redraw and sharp. A reader inspecting a chart
        // wants the first; a reader settling in wants the second.
        // `overflow-x` matters once zoomed: a page wider than the column has to
        // be reachable sideways, or the right edge of every line is simply
        // gone — which is worse than not zooming at all.
        className="flex-1 overflow-y-auto overflow-x-auto overscroll-contain [touch-action:pinch-zoom]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label={title}
      >
        {pageCount === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6">
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
          <ul className="mx-auto flex max-w-3xl flex-col gap-2 p-2">
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
                  className="max-w-none bg-white"
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
