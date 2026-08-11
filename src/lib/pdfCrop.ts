import type { PDFDocumentProxy } from "pdfjs-dist";

/**
 * Where the ink is on a scanned page, as fractions of the page: `x`/`y` are the
 * top-left corner and `w`/`h` the size, all 0–1.
 */
export interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const FULL_PAGE: CropBox = { x: 0, y: 0, w: 1, h: 1 };

/**
 * Trimming the white border off a scan, which on a phone is the single largest
 * thing that can be done for these documents.
 *
 * Measured across the six files of one folder: ink occupies 67–78% of an A4
 * page's width, and the rest is the margin a printer left. Rendered at the
 * column's full width that margin is spent on nothing, and the text lands at
 * 7.4–9.6 CSS pixels a line on a 375px phone — a size nobody reads Devanagari
 * at, since its matras sit above and below the line that is already too small.
 * Trimming gives 1.28–1.50× back for free, before a reader touches a control.
 *
 * Every serious reader for scanned books does this — Kindle, KOReader, Acrobat
 * — and they all learned the same two lessons, which are the whole design here:
 *
 * **One box for the document, not one per page.** Per-page cropping makes the
 * column breathe as it scrolls: a page whose ink happens to reach further left
 * jumps wider than its neighbours, and the movement is far more distracting
 * than the margin ever was. A document is printed with one layout; measure a
 * few pages and use the middle answer for all of them.
 *
 * **Sample the middle of the book.** Page one is a title page — a few large
 * words in the centre of an otherwise empty sheet — and a crop measured there
 * would zoom the whole document to the title's own bounds.
 */

/** Pages rendered to measure. Six, so that one odd page can be dropped per edge. */
const SAMPLES = 6;

/**
 * Wide enough for a margin to be a margin, small enough to be free — about 36
 * dots per inch on A4, or a page and a half of pixels for the whole document.
 *
 * Measured rather than guessed, against the six documents of one folder: the
 * answer barely moves between this and 190px or a threshold of 215 (1.26–1.44×
 * either way, within a percent of the same box), which is what says the
 * measurement is reading the layout rather than the sampling. The one thing it
 * does change is the file that is 92% ink already — at 190px a sliver got
 * trimmed off it, and at this width it is correctly left alone.
 */
const SAMPLE_WIDTH = 300;

/** Anything darker than this is ink; scanner paper is rarely above 235. */
const INK = 200;

/** Grown back afterwards, so the crop never shaves a descender or a matra. */
const PAD = 0.025;

/** Nothing may be cropped past this — a guard against a page that is one big photograph. */
const MAX_TRIM = 0.3;

/** Below this the sample is nonsense (a blank page, a fold, a black scan edge). */
const MIN_INK = 0.35;

/**
 * The second-most-generous of the sampled edges — one step in from the extreme.
 *
 * **The error here is not symmetric, and this is the whole of why the obvious
 * estimator is wrong.** Cropping a little too little leaves a sliver of white
 * nobody notices; cropping a little too much shaves the last letter off every
 * line, which is the failure that makes readers turn auto-crop off and never
 * turn it on again. A median across the samples was tried first and did exactly
 * that on two of six documents: these pages are photographs, each sheet sat on
 * the glass a millimetre differently, and the middle answer clips whichever
 * pages sat wider than the middle.
 *
 * So each edge is taken from the most generous sample rather than the typical
 * one — but one step in, so that a single page with a black scanner edge or a
 * marginal note costs some of the gain instead of all of it.
 */
function generous(values: number[], outward: "min" | "max"): number {
  const s = [...values].sort((a, b) => (outward === "min" ? a - b : b - a));
  return s[Math.min(1, s.length - 1)];
}

/** Which pages to look at: through the middle of the book, never the covers. */
function samplePages(pageCount: number): number[] {
  if (pageCount <= 2) return [1];
  const pages: number[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    const at = Math.round(pageCount * (0.25 + (0.5 * i) / Math.max(1, SAMPLES - 1)));
    const n = Math.min(pageCount, Math.max(2, at));
    if (!pages.includes(n)) pages.push(n);
  }
  return pages;
}

/** The ink bounds of one already-rendered thumbnail, or null if there are none worth trusting. */
function inkBounds(data: ImageData): CropBox | null {
  const { width: W, height: H, data: px } = data;
  const rows = new Uint16Array(H);
  const cols = new Uint16Array(W);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      // Perceptual weighting is not worth it here: this is asking "is this
      // paper or is it not", and a scan's ink is dark in every channel.
      const lum = (px[i] + px[i + 1] + px[i + 2]) / 3;
      // Transparent means nothing was drawn there, which is paper.
      if (px[i + 3] > 128 && lum < INK) {
        rows[y]++;
        cols[x]++;
      }
    }
  }

  // A few stray pixels are dust, a fold shadow, or the edge of the scanner
  // lid. A line of text is not.
  const rowFloor = Math.max(2, Math.round(W * 0.004));
  const colFloor = Math.max(2, Math.round(H * 0.004));

  let top = -1;
  let bottom = -1;
  for (let y = 0; y < H; y++) {
    if (rows[y] > rowFloor) {
      if (top < 0) top = y;
      bottom = y;
    }
  }
  let left = -1;
  let right = -1;
  for (let x = 0; x < W; x++) {
    if (cols[x] > colFloor) {
      if (left < 0) left = x;
      right = x;
    }
  }
  if (top < 0 || left < 0) return null;

  const box = {
    x: left / W,
    y: top / H,
    w: (right + 1 - left) / W,
    h: (bottom + 1 - top) / H,
  };
  return box.w >= MIN_INK && box.h >= MIN_INK ? box : null;
}

/**
 * The document's ink box, or `null` when there is nothing worth trimming.
 *
 * Renders {@link SAMPLES} pages at thumbnail size — a few tens of thousands of
 * pixels each — so it costs about one extra page render for the whole document,
 * and the caller is expected to remember the answer rather than ask twice.
 *
 * Deliberately returns `null` rather than {@link FULL_PAGE} for "no gain": the
 * two mean different things to a caller that caches, and a document with real
 * full-bleed pages should not be re-measured on every open to be told so again.
 */
export async function measureCrop(
  doc: PDFDocumentProxy,
  pageCount: number
): Promise<CropBox | null> {
  const boxes: CropBox[] = [];

  for (const n of samplePages(pageCount)) {
    try {
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: SAMPLE_WIDTH / base.width });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      // Paper first. A PDF page is transparent where nothing is painted, and
      // an unpainted margin has to read as white rather than as ink.
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvas, viewport, background: "#fff" }).promise;
      const found = inkBounds(ctx.getImageData(0, 0, canvas.width, canvas.height));
      // Free the backing store now rather than at the whim of the collector:
      // four of these on a phone is four full-page decodes' worth of memory.
      canvas.width = 0;
      canvas.height = 0;
      if (found) boxes.push(found);
    } catch {
      // One page that will not render is not a reason to give up the feature,
      // and it is emphatically not a reason to fail the document — this runs
      // beside a reader who is already reading it.
    }
  }

  if (boxes.length < 2) return null;

  // Each edge decided independently, and each one erring outwards.
  const left = generous(
    boxes.map((b) => b.x),
    "min"
  );
  const top = generous(
    boxes.map((b) => b.y),
    "min"
  );
  const right = generous(
    boxes.map((b) => b.x + b.w),
    "max"
  );
  const bottom = generous(
    boxes.map((b) => b.y + b.h),
    "max"
  );

  const x = Math.min(Math.max(0, left - PAD), MAX_TRIM);
  const y = Math.min(Math.max(0, top - PAD), MAX_TRIM);
  const x2 = Math.max(Math.min(1, right + PAD), 1 - MAX_TRIM);
  const y2 = Math.max(Math.min(1, bottom + PAD), 1 - MAX_TRIM);

  const box = { x, y, w: x2 - x, h: y2 - y };
  // Under a twentieth of the width is not worth a reflow, and telling the
  // reader their margins were trimmed when nothing moved is worse than silence.
  return box.w > 0.95 && box.h > 0.95 ? null : box;
}
