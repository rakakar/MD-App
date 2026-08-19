/**
 * Sample each book cover's printed band colour, for `COVER_HUES` in
 * `src/lib/bookHue.ts`. Run from `web/`:
 *
 *     node scripts/sample-cover-hues.mjs
 *
 * and paste the `from`/`to` pairs — with their measured contrast — into that
 * table. Re-run it when a cover changes or a book is added; until then an
 * unsampled book falls back to the hash palette, which is not wrong, only
 * unrelated to its cover.
 *
 * `sharp` comes with Next and is not a direct dependency, which is fine for a
 * script that is run by hand and never imported by the app.
 *
 * This reads the **production** API and the cover CDN, across every
 * book-bearing workspace — a few dozen images once, not the per-chapter
 * storm `AGENTS.md` warns about — but it is the reason the sampling lives
 * here rather than in the page: a build must not do this per book, per
 * deploy.
 */
import sharp from "sharp";

const API = "https://mdbe.welfareinfo.net/api/v1/";

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h * 360, s, l];
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map((v) => Math.round(v * 255));
}

const hex = ([r, g, b]) =>
  "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");

const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrastWhite = (rgb) => 1.05 / (lum(rgb) + 0.05);

/** Deepen a colour along its own hue until white text on it clears `target`. */
function deepenTo(h, s, l, target) {
  let lo = 0, hi = l;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (contrastWhite(hslToRgb(h, s, mid)) >= target) lo = mid; else hi = mid;
  }
  return lo;
}

// Every workspace that carries its own book covers — not Resources, which
// does not shelve books today (the format toggle for it is off; see
// `SHOW_FORMAT_TOGGLE` in `app/resources/page.tsx`). Add it here the day
// that changes.
const WORKSPACES = ["originals", "translations"];
const responses = await Promise.all(
  WORKSPACES.map((ws) => fetch(`${API}books/?workspace=${ws}`).then((r) => r.json()))
);
const books = responses.flatMap((data) => data.results || data);
const list = books.filter((b) => b.cover_image);

const out = [];
for (const b of list) {
  const buf = Buffer.from(await (await fetch(b.cover_image)).arrayBuffer());
  const { data, info } = await sharp(buf)
    .resize(80, 108, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Hue histogram over the saturated pixels only. An average of the whole
  // scan is dominated by the cream paper in the middle, which is every book's
  // colour; what makes one recognisable is the printed band.
  const bins = Array.from({ length: 24 }, () => []);
  for (let i = 0; i < data.length; i += info.channels) {
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    if (s < 0.22 || l < 0.12 || l > 0.78) continue;
    bins[Math.floor(h / 15) % 24].push([h, s, l]);
  }
  const best = bins.reduce((a, b2) => (b2.length > a.length ? b2 : a), []);
  const saturatedShare = best.length / (data.length / info.channels);
  if (best.length === 0) { out.push({ code: b.code, none: true }); continue; }

  // Circular mean of hue, plain mean of s/l.
  let sx = 0, sy = 0, ss = 0, sl = 0;
  for (const [h, s, l] of best) {
    sx += Math.cos((h * Math.PI) / 180); sy += Math.sin((h * Math.PI) / 180);
    ss += s; sl += l;
  }
  const h = (Math.atan2(sy / best.length, sx / best.length) * 180) / Math.PI;
  const s = Math.min(0.62, ss / best.length);
  const l = sl / best.length;

  const toL = deepenTo(h, s, l, 4.5);
  const fromL = deepenTo(h, s, l, 3.0);
  const to = hslToRgb(h, s, toL);
  const from = hslToRgb(h, s, Math.max(toL + 0.06, fromL));

  out.push({
    code: b.code,
    title: b.title_hi,
    sampled: hex(hslToRgb(h, s, l)),
    share: +(saturatedShare * 100).toFixed(1),
    from: hex(from),
    to: hex(to),
    cwFrom: +contrastWhite(from).toFixed(2),
    cwTo: +contrastWhite(to).toFixed(2),
  });
}

console.log(JSON.stringify(out, null, 1));
