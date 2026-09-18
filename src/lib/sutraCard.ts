/**
 * **The shareable sutra card, drawn on a canvas in the reader's own browser.**
 *
 * A verse leaves this app as a picture rather than as a line of text, because
 * that is the form it travels in: pasted into a family WhatsApp group, a photo
 * in a study group, a wallpaper. Plain text arrives stripped of the book it
 * came from and of any sense that it was given rather than written.
 *
 * **Why the browser and not the server.** A server route (`ImageResponse`) was
 * the obvious answer and is the wrong one here, for one reason above the
 * others: it renders through Satori, which lays glyphs out itself rather than
 * asking a text engine. Devanagari is not a script you can lay out by advancing
 * along a string — matras reorder around the consonant they attach to and
 * conjuncts fuse into single forms. `ि` is written before the letter it is
 * pronounced after. A canvas hands the string to the browser's own shaper, the
 * same one that has been drawing this verse correctly on the card all along.
 *
 * Three smaller reasons point the same way. The share sheet wants a *file*, so
 * a server render would have to be fetched back and turned into one anyway.
 * The app is a PWA and this works with no network. And the preview in the sheet
 * is the very bitmap that gets shared, so the two can never drift.
 *
 * **The palette is written here rather than read from tokens, and that is
 * deliberate.** This is one fixed plate of artwork that leaves the app and is
 * looked at in someone else's photo roll. It does not have a theme, so it must
 * not follow one — a reader in dark mode sharing a verse that came out dark on
 * cream watercolour would be a bug, not a preference.
 */

/** The artwork, and the card: 3:4, the shape a phone screenshot is shared at. */
const W = 1080;
const H = 1440;

/**
 * **The plates.** Five paintings of the same idea — the portrait top right, a
 * clear middle for the verse, a scene along the bottom — so the reader picks
 * the one that suits the verse or the day rather than always sending the same
 * picture.
 *
 * Each is 1080×1440 WebP, and each has a 168px thumbnail beside it: the picker
 * shows all of them at once, and five full plates is half a megabyte to open a
 * sheet with.
 */
export interface SutraPlate {
  id: string;
  /** what a screen reader is told the choice is */
  label: string;
  src: string;
  thumb: string;
}

export const SUTRA_PLATES: SutraPlate[] = [
  { id: "riverside", label: "Riverside", src: "/brand/sutra-card-1.webp", thumb: "/brand/sutra-card-1-thumb.webp" },
  { id: "shore", label: "Shore at dawn", src: "/brand/sutra-card-2.webp", thumb: "/brand/sutra-card-2-thumb.webp" },
  { id: "dusk", label: "Dusk over water", src: "/brand/sutra-card-3.webp", thumb: "/brand/sutra-card-3-thumb.webp" },
  { id: "meadow", label: "Meadow", src: "/brand/sutra-card-4.webp", thumb: "/brand/sutra-card-4-thumb.webp" },
  { id: "valley", label: "Valley at sunrise", src: "/brand/sutra-card-5.webp", thumb: "/brand/sutra-card-5-thumb.webp" },
];

/**
 * **Ink on the plate — one palette for all five, and the numbers are measured.**
 *
 * Sampled from the artwork rather than taken from the app's tokens, for the
 * reason in the file's own note: this leaves the app and has no theme to
 * follow.
 *
 * One palette rather than five, because the plates only really disagree about
 * the two smallest pieces of type and the answer for both is "a little darker
 * than drawn". The figures below are the worst case across all five plates,
 * measured in the band each piece of type actually sits in:
 *
 * | | worst | on |
 * |---|---|---|
 * | verse — `INK` | 5.90:1 | Dusk over water |
 * | eyebrow — `ACCENT` | 4.51:1 | Dusk over water |
 * | attribution — `MUTED` | 4.52:1 | Dusk over water |
 *
 * `ACCENT` is the app's terracotta at 86%: at full strength it measured 3.60
 * on the dusk plate's pink sky. `MUTED` is a long way down from the `#8b8073`
 * this was drawn with, which measured **1.60** over that plate's water — the
 * one that was already failing on the plate shipped first, at 3.45. The book's
 * title is now separated from the author's name by size and weight rather than
 * by being paler than it, which is the trade a coloured background forces.
 *
 * `RULE` carries no words, so it is decoration and has no floor to clear.
 */
const INK = "#2f2a24";
const MUTED = "#413c36";
const ACCENT = "#8f430f";
const RULE = "#c98a4b";

/** Where the block of type sits, measured off the artwork's clear middle. */
/**
 * Where the block of type sits.
 *
 * `top` is set by the portrait, which reaches about y430 on all five plates and
 * leaves room for the eyebrow under it; `bottom` by the scene, which on the
 * tightest plate (Shore at dawn) begins at its horizon around y890. The clear
 * paper between them is what the type gets, and a long verse spends all of it.
 */
const BOX = { top: 500, bottom: 950, width: 840 };

export interface SutraCardInput {
  /** the verse, as Devanagari */
  text: string;
  /** the book it is from */
  source: string;
  /** which painting to print it on; defaults to the first */
  plate?: SutraPlate;
}

/** Whoever wrote it — the same on every card, so it is not a parameter. */
const AUTHOR = "श्री ए. नागराज";
const EYEBROW = "आज का सूत्र";

/**
 * next/font hashes the family name, so the string canvas needs is whatever the
 * stylesheet is actually using. Read it rather than guessed: a guess falls back
 * to a serif with no Devanagari in it and the card comes out as tofu.
 */
function family(cssVar: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVar)
    .trim();
  return v ? `${v}, ${fallback}` : fallback;
}

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

/** The app's own sun, as a bitmap, so the card's eyebrow is the card's eyebrow. */
function sun(color: string): Promise<HTMLImageElement> {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" ` +
    `fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round">` +
    `<circle cx="12" cy="12" r="3.6"/>` +
    `<path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>` +
    `</svg>`;
  return load(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
}

/** Greedy wrap on spaces — Devanagari words are space-separated like Latin. */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > max) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * The verse has to fit the clear part of the artwork, and sutras run from one
 * line to six. So the size is found rather than set: start at the size the
 * design is drawn at and step down until the block fits its box. Below the
 * floor it would be too small to read in a chat thread, so the longest verses
 * take the floor and the box grows downward into the plate's empty lower half.
 */
function fitVerse(
  ctx: CanvasRenderingContext2D,
  text: string,
  face: string
): { lines: string[]; size: number; leading: number } {
  const room = BOX.bottom - BOX.top;
  for (let size = 62; size >= 34; size -= 2) {
    ctx.font = `400 ${size}px ${face}`;
    const leading = size * 1.62;
    const lines = wrap(ctx, text, BOX.width);
    if (lines.length * leading <= room) return { lines, size, leading };
  }
  ctx.font = `400 34px ${face}`;
  return { lines: wrap(ctx, text, BOX.width), size: 34, leading: 34 * 1.62 };
}

/**
 * Draw the card and hand back a PNG.
 *
 * PNG rather than JPEG: the plate is flat watercolour washes and fine type,
 * which is exactly what JPEG rings around, and a share is one file rather than
 * a page of them.
 */
export async function renderSutraCard({
  text,
  source,
  plate = SUTRA_PLATES[0],
}: SutraCardInput): Promise<Blob> {
  const devanagari = family("--font-tiro-devanagari", "serif");
  const ui = family("--font-mukta", "sans-serif");

  // Canvas silently falls back to a default face for a font that has not
  // finished loading, and the fallback has no Devanagari — so the card would
  // come out as boxes rather than as a verse. Ask for the exact faces first.
  if (typeof document !== "undefined" && document.fonts) {
    await Promise.all([
      document.fonts.load(`400 62px ${devanagari}`, text),
      document.fonts.load(`600 30px ${ui}`, `${AUTHOR}${EYEBROW}${source}`),
      document.fonts.load(`400 26px ${ui}`, source),
    ]).catch(() => undefined);
    await document.fonts.ready;
  }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");

  const [art, glyph] = await Promise.all([load(plate.src), sun(ACCENT)]);
  ctx.drawImage(art, 0, 0, W, H);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const mid = W / 2;

  // ---- eyebrow: the sun, then the label, centred as one unit ----------------
  const eyebrowSize = 30;
  ctx.font = `700 ${eyebrowSize}px ${ui}`;
  // Ink, not advance. `width` carries the trailing side bearing, and centring
  // the pair on it hangs the lockup right of the plate's middle.
  //
  // `textAlign` is still `center` here, so the two bounding-box figures are the
  // ink either side of the centre point and their sum is the full ink width.
  // (Which is also why nothing below adds `actualBoundingBoxLeft` to the draw
  // position: under centre alignment that number is half the label, and adding
  // it pushed the text 60px clear of the sun.)
  const m = ctx.measureText(EYEBROW);
  const labelInk = m.actualBoundingBoxRight + m.actualBoundingBoxLeft;
  const iconSize = 32;
  // The sun's strokes run from 3 to 21 in a 24 viewBox, so three quarters of
  // the box it is drawn in is ink and the rest is air on both sides.
  const iconInk = iconSize * 0.75;
  const gap = 14;
  const unit = iconInk + gap + labelInk;
  const eyebrowY = BOX.top - 78;
  const left = mid - unit / 2;
  ctx.drawImage(glyph, left - (iconSize - iconInk) / 2, eyebrowY - iconSize + 6, iconSize, iconSize);
  ctx.fillStyle = ACCENT;
  ctx.textAlign = "left";
  ctx.fillText(EYEBROW, left + iconInk + gap, eyebrowY);
  ctx.textAlign = "center";

  // ---- the verse ----------------------------------------------------------
  const verse = fitVerse(ctx, text, devanagari);
  ctx.font = `400 ${verse.size}px ${devanagari}`;
  ctx.fillStyle = INK;
  // Hung from the top of the box, under the eyebrow, rather than centred in
  // it. Centring looked right on a four-line sutra and dropped a two-line one
  // into the middle of the plate, away from the label that introduces it —
  // and the label is the fixed point here. Long verses grow downward into the
  // artwork's empty lower half, which is what that half is for.
  let y = BOX.top + verse.size;
  for (const line of verse.lines) {
    ctx.fillText(line, mid, y);
    y += verse.leading;
  }

  // ---- rule, author, book -------------------------------------------------
  // 52px under the last line's descender. The fit loop has already capped the
  // block at BOX, so this cannot run off the plate.
  const ruleY = y - verse.leading + verse.size * 0.9 + 52;
  ctx.strokeStyle = RULE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(mid - 44, ruleY);
  ctx.lineTo(mid + 44, ruleY);
  ctx.stroke();

  ctx.fillStyle = INK;
  ctx.font = `600 38px ${ui}`;
  ctx.fillText(AUTHOR, mid, ruleY + 68);

  ctx.fillStyle = MUTED;
  ctx.font = `400 32px ${ui}`;
  ctx.fillText(source, mid, ruleY + 124);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("canvas produced nothing"))),
      "image/png"
    );
  });
}

/** What the file is called wherever it lands. */
export function sutraCardFilename(iso: string): string {
  return `madhyasth-darshan-sutra-${iso || "today"}.png`;
}
