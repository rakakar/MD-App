/**
 * **Where a highlight actually is** — turning a browser selection into a span
 * of the paragraph's text, and back into something the reader can render
 * (contract §6.0 `ranges`).
 *
 * The whole problem is that these are two different coordinate systems. The
 * reader selects DOM nodes; a highlight is stored as character offsets into
 * `para.text_hi`, because that is the only thing stable enough to survive a
 * republish, a font change, or a phone turned sideways. Everything here is the
 * translation between them, and the checking that keeps it honest.
 */

import type { Segment } from "./paribhasha";
import type { HighlightColour, HighlightRange } from "./storage";

/**
 * Nodes inside a paragraph that are **not** part of its `text_hi`.
 *
 * A list marker ("3.") and a footnote asterisk are both rendered inside the
 * same element as the text and belong to neither the paragraph's characters
 * nor the reader's selection. Counting them would shift every offset in that
 * paragraph by a few characters — the kind of bug that only shows up in lists,
 * and only sometimes.
 *
 * They are marked in `blocks.tsx` rather than recognised by class name here:
 * a highlight that lands in the wrong place because a Tailwind class changed
 * is not a bug anybody would find by reading either file.
 */
const NOT_TEXT = "[data-not-text]";

/** Every text node of a paragraph that its `text_hi` is actually made of. */
function textNodes(host: HTMLElement): Text[] {
  const out: Text[] = [];
  const walk = document.createTreeWalker(host, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.parentElement?.closest(NOT_TEXT)
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    },
  });
  while (walk.nextNode()) out.push(walk.currentNode as Text);
  return out;
}

/**
 * The selection, as offsets into `text_hi` — or `null` if it cannot be trusted.
 *
 * **Measured from the DOM, then checked against the text**, and the check is
 * the point. Walking nodes gets it right for an ordinary paragraph; the cases
 * it cannot know about are the ones where the rendered text and `text_hi`
 * genuinely differ — a table, a figure caption, anything a future block type
 * renders in its own way. Rather than enumerate those and go stale, this
 * verifies: if the offsets do not spell the selected words, it looks the words
 * up instead, and if they are not there either it gives up and says so.
 *
 * Giving up is safe. The caller falls back to painting the whole paragraph,
 * which is what a highlight was before spans existed.
 */
export function selectionSpan(
  host: HTMLElement,
  range: Range,
  text: string
): { start: number; end: number } | null {
  const selected = range.toString().trim();
  if (!selected) return null;

  let start = -1;
  let end = -1;
  let seen = 0;
  for (const node of textNodes(host)) {
    if (node === range.startContainer) start = seen + range.startOffset;
    if (node === range.endContainer) end = seen + range.endOffset;
    seen += node.data.length;
  }

  if (start >= 0 && end > start && text.slice(start, end).trim() === selected) {
    // Trim back to the words themselves — a selection dragged past the last
    // letter picks up the trailing space, and a highlight with a pale tail is
    // the sort of thing a reader notices and cannot fix.
    const lead = text.slice(start, end).length - text.slice(start, end).trimStart().length;
    return { start: start + lead, end: start + lead + selected.length };
  }

  const found = text.indexOf(selected);
  return found === -1 ? null : { start: found, end: found + selected.length };
}

/**
 * Where a stored span sits in the text **as it is now**.
 *
 * Offsets are a guess about a paragraph that may have been re-extracted and
 * republished since; the words are the fact. So the offsets are believed only
 * when they still spell the same words, and otherwise the words are searched
 * for. A span whose words have genuinely gone is dropped — painting it at stale
 * offsets would put the reader's highlight on a sentence they never chose,
 * which is worse than losing it and much harder to notice.
 */
export function anchorSpan(
  text: string,
  span: HighlightRange
): { start: number; end: number; colour: HighlightColour } | null {
  // No words means the span is not claiming any — it is a whole-paragraph
  // highlight wearing a span's shape (`wholeParagraph`), and there is nothing
  // to verify it against. Clipped to the text, since its end is deliberately
  // past the end of any paragraph.
  if (!span.text) {
    return { start: span.start, end: Math.min(span.end, text.length), colour: span.colour };
  }
  if (text.slice(span.start, span.end) === span.text) {
    return { start: span.start, end: span.end, colour: span.colour };
  }
  const found = text.indexOf(span.text);
  if (found === -1) return null;
  return { start: found, end: found + span.text.length, colour: span.colour };
}

/** A run of text carrying whatever marks apply to it. */
export interface PaintedSegment extends Segment {
  hl?: HighlightColour;
}

/**
 * The paragraph cut into runs, each knowing its glossary word and its highlight.
 *
 * Two independent markings over the same characters — Paribhasha's headwords
 * and the reader's own spans — neither of which respects the other's
 * boundaries. A word can be half highlighted and a highlight can start
 * mid-word, so the runs have to be cut where *either* changes.
 *
 * Done through a colour-per-character array rather than by merging two sorted
 * lists, which is the version that is obviously correct at a glance. These are
 * paragraphs, not documents: a few hundred characters, rebuilt only when the
 * highlights change.
 */
export function paintSegments(
  text: string,
  segments: Segment[] | null,
  spans: HighlightRange[]
): PaintedSegment[] {
  const base: Segment[] = segments ?? [{ text }];
  if (spans.length === 0) return base;

  const colours = new Array<HighlightColour | undefined>(text.length);
  let painted = false;
  for (const span of spans) {
    const at = anchorSpan(text, span);
    if (!at) continue;
    painted = true;
    for (let i = at.start; i < at.end && i < text.length; i++) colours[i] = at.colour;
  }
  if (!painted) return base;

  const out: PaintedSegment[] = [];
  let offset = 0;
  for (const segment of base) {
    let run = "";
    let runColour = colours[offset];
    for (let i = 0; i < segment.text.length; i++) {
      const colour = colours[offset + i];
      if (colour !== runColour && run) {
        out.push({ text: run, word: segment.word, hl: runColour });
        run = "";
      }
      runColour = colour;
      run += segment.text[i];
    }
    if (run) out.push({ text: run, word: segment.word, hl: runColour });
    offset += segment.text.length;
  }
  return out;
}
