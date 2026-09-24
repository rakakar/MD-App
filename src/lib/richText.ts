/**
 * **The printed bold and italic** — `para.text_rich` (contract §3.3).
 *
 * `text_rich` is the paragraph's text with `<b>`/`<i>` around the words the
 * book sets in bold or italic, HTML-escaped, and nothing else. Its text is
 * exactly `text_hi`, so formatting is one more layer on the same characters
 * the highlights and Paribhasha headwords are measured on.
 *
 * **Parsed here, never injected.** Book text is never rendered as HTML
 * (`blocks.tsx`); this reads the few tags into runs and the renderer builds its
 * own elements from them. A tag it does not know is dropped and its text kept,
 * which is what the contract asks of a client when the BE adds one.
 *
 * A hand-rolled tokenizer rather than `DOMParser`: chapters are prerendered on
 * the server, where there is no DOM, and the input is the BE's own canonical
 * output — two tags, three entities — not arbitrary HTML.
 */

import type { PaintedSegment } from "./highlights";

/** A run of text and the styles it is printed in. */
export interface RichRun {
  text: string;
  b: boolean;
  i: boolean;
}

/** A painted segment (highlight, headword) that also knows its formatting. */
export interface FormattedSegment extends PaintedSegment {
  b?: boolean;
  i?: boolean;
}

const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
const ENTITY = /&(#x[0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos|#39);/g;
const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const BOLD = new Set(["b", "strong"]);
const ITALIC = new Set(["i", "em"]);

function decode(s: string): string {
  return s.replace(ENTITY, (_, e: string) => {
    if (e[0] !== "#") return NAMED[e];
    const code = e[1] === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : "";
  });
}

/** `text_rich` → its runs, in order. Concatenated, they are the plain text. */
export function parseRich(rich: string): RichRun[] {
  const runs: RichRun[] = [];
  let b = 0;
  let i = 0;
  let pos = 0;
  const push = (raw: string) => {
    const text = decode(raw);
    if (!text) return;
    const last = runs[runs.length - 1];
    if (last && last.b === b > 0 && last.i === i > 0) last.text += text;
    else runs.push({ text, b: b > 0, i: i > 0 });
  };
  for (const m of rich.matchAll(TAG)) {
    push(rich.slice(pos, m.index));
    pos = m.index + m[0].length;
    const closing = m[1] === "/";
    const name = m[2].toLowerCase();
    if (BOLD.has(name)) b = Math.max(0, b + (closing ? -1 : 1));
    else if (ITALIC.has(name)) i = Math.max(0, i + (closing ? -1 : 1));
    else if (name === "br" && !closing) push("\n");
  }
  push(rich.slice(pos));
  return runs;
}

/**
 * The runs of a paragraph's `text_rich`, or `null` when there is nothing to
 * format — no `text_rich` (an older cached chapter), no bold or italic in it,
 * or a text that does not spell `text_hi`. The last one should never happen,
 * but the highlights are measured on `text_hi`, so plain text is the safe
 * answer rather than formatting painted a few characters off.
 */
export function formatRuns(text: string, rich: string | undefined): RichRun[] | null {
  if (!rich || (!rich.includes("<b>") && !rich.includes("<i>"))) return null;
  const runs = parseRich(rich);
  if (runs.map((r) => r.text).join("") !== text) return null;
  return runs.some((r) => r.b || r.i) ? runs : null;
}

/**
 * Cut the painted segments wherever the formatting changes too — a bold term
 * can start inside a highlight, and a headword can be half bold. The same
 * style-per-character approach as `paintSegments`, for the same reason: it is
 * obviously right, and a paragraph is a few hundred characters.
 */
export function formatSegments(
  text: string,
  segments: PaintedSegment[] | null,
  runs: RichRun[] | null
): FormattedSegment[] | null {
  if (!runs) return segments;
  const styles: Array<[boolean, boolean]> = [];
  for (const run of runs) for (let k = 0; k < run.text.length; k++) styles.push([run.b, run.i]);

  const out: FormattedSegment[] = [];
  let offset = 0;
  for (const segment of segments ?? [{ text }]) {
    let from = 0;
    for (let k = 1; k <= segment.text.length; k++) {
      const [b, i] = styles[offset + from] ?? [false, false];
      const next = styles[offset + k];
      if (k === segment.text.length || !next || next[0] !== b || next[1] !== i) {
        out.push({ ...segment, text: segment.text.slice(from, k), b, i });
        from = k;
      }
    }
    offset += segment.text.length;
  }
  return out;
}
