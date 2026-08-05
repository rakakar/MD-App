"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  PDFPageProxy,
  RenderTask,
} from "pdfjs-dist";
import { useDisplay } from "@/components/shell/DisplayProvider";
import type { ResolvedTheme } from "@/lib/storage";

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

interface PageBox {
  /** the wrapper we observe and draw into */
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
  /** this document genuinely cannot be read here — the parent should fall back */
  onFail?: (reason: "error") => void;
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

  // The page being read, reachable from effects that must not *depend* on it:
  // a zoom or a rotation redraws around wherever the reader is, but listing
  // `current` as a dependency would rerun those on every page turn and redraw
  // the window at a scale it is already drawn at.
  const currentRef = useRef(current);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  const fail = useCallback(() => {
    if (failed.current) return; // one verdict per document
    failed.current = true;
    onFail?.("error");
  }, [onFail]);

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
      } catch {
        clearTimeout(timer);
        if (!cancelled) fail();
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
  const draw = useCallback(
    async (n: number) => {
      const box = boxes.current.get(n);
      if (!doc || !box) return;

      const width = box.el.clientWidth;
      if (width === 0) return;
      const scale = ZOOMS[zoom];
      if (box.canvas && box.drawnAt === scale) return; // already good at this zoom

      box.task?.cancel();
      box.task = null;

      try {
        const page = pageCache.current.get(n) ?? (await doc.getPage(n));
        pageCache.current.set(n, page);
        if (!boxes.current.has(n)) return; // scrolled away while awaiting

        const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
        const base = page.getViewport({ scale: 1 });
        // Fit the column, then apply the zoom step. The canvas is laid out at
        // CSS width and backed at DPR, which is what keeps Devanagari matras
        // legible instead of smeared.
        const viewport = page.getViewport({ scale: (width / base.width) * scale * dpr });

        const canvas = box.canvas ?? document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        canvas.style.display = "block";
        if (!box.canvas) {
          canvas.className = "rounded-md";
          box.el.replaceChildren(canvas);
          box.canvas = canvas;
        }

        const task = page.render({ canvas, viewport });
        box.task = task;
        await task.promise;
        box.drawnAt = scale;
        box.task = null;

        if (!ready) setReady(true);
      } catch (e) {
        // A cancelled render is the normal way a fast scroll ends, not a fault.
        if ((e as { name?: string })?.name === "RenderingCancelledException") return;
        fail();
      }
    },
    [doc, zoom, ready, fail]
  );

  // ---- decide what is on screen, and what to draw around it ----
  useEffect(() => {
    if (!doc || pageCount === 0) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const visible = new Set<number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const n = Number((entry.target as HTMLElement).dataset.page);
          if (entry.isIntersecting) visible.add(n);
          else visible.delete(n);
        }
        if (visible.size === 0) return;

        // The page being read is the lowest-numbered one on screen. Not the
        // largest slice: on a phone in the middle of a spread that flickers
        // between two numbers as a thumb moves, and a reader who stops halfway
        // down page 7 means page 7.
        const now = Math.min(...visible);
        setCurrent(now);

        const from = Math.max(1, now - WINDOW);
        const to = Math.min(pageCount, now + WINDOW);
        for (let n = from; n <= to; n++) void draw(n);

        // Let go of everything outside the window. Five canvases at a capped
        // DPR is a bounded cost on a 390-page document; keeping them all is not.
        for (const [n, box] of boxes.current) {
          if (n >= from && n <= to) continue;
          box.task?.cancel();
          box.task = null;
          if (box.canvas) {
            box.el.replaceChildren();
            box.canvas = null;
            box.drawnAt = 0;
          }
          // The page proxy holds its own decoded operator list; drop it too.
          pageCache.current.get(n)?.cleanup();
        }
      },
      { root: scroller, rootMargin: "200px 0px" }
    );

    for (const box of boxes.current.values()) observer.observe(box.el);
    return () => observer.disconnect();
  }, [doc, pageCount, draw]);

  // ---- draw the pages it opens onto ----
  //
  // Deliberately not left to the observer above. Its first callback arrives a
  // frame after the placeholders mount, and a frame is not something to rely
  // on: a tab that is backgrounded, occluded or throttled delivers no frames
  // at all, and a reader returning to it would find a document that says
  // "Page 1 of 220" over a blank column. What the reader opens onto is drawn
  // by asking, not by waiting to be told.
  useEffect(() => {
    if (!doc || pageCount === 0) return;
    const at = Math.min(Math.max(1, startPage), pageCount);
    const from = Math.max(1, at - WINDOW);
    const to = Math.min(pageCount, at + WINDOW);
    for (let n = from; n <= to; n++) void draw(n);
  }, [doc, pageCount, startPage, draw]);

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
    const at = currentRef.current;
    const from = Math.max(1, at - WINDOW);
    const to = Math.min(pageCount, at + WINDOW);
    for (let n = from; n <= to; n++) void draw(n);
  }, [pageCount, draw]);

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

  const jump = (to: number) => {
    const n = Math.min(Math.max(1, to), pageCount);
    boxes.current.get(n)?.el.scrollIntoView({ block: "start", behavior: "auto" });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-rule bg-card">
      {/* The bar states the page a reader is on, which is the fact the native
          viewer hid and the whole feature turns on. */}
      <div className="flex items-center gap-2 border-b border-rule px-3 py-2">
        <span className="text-xs font-semibold tabular-nums text-ink-soft">
          {pageCount > 0 ? `Page ${current} of ${pageCount}` : "Opening…"}
        </span>
        <span className="flex-1" />
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
        className="h-[75vh] overflow-y-auto overscroll-contain bg-canvas p-2 [touch-action:pinch-zoom]"
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
          <ul className="flex flex-col gap-2">
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
              <li key={n}>
                <div
                  ref={(el) => register(n, el)}
                  data-page={n}
                  // The placeholder holds the scroll height before anything is
                  // drawn, taken from page one's shape — so the scrollbar is
                  // honest on a 390-page document from the first frame, rather
                  // than growing under the reader's thumb as pages arrive.
                  style={{
                    aspectRatio: `1 / ${aspect}`,
                    filter: THEME_FILTER[resolved],
                  }}
                  className="w-full bg-white"
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
