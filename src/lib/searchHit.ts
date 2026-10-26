/**
 * **The searched words, marked where the reader lands** (26 Oct 2026).
 *
 * Book search's "Open in reader" carries the words it searched for as `hl`
 * query params beside the `#p-{page}-{para}` anchor. The reader marks them in
 * that one paragraph, so the eye goes straight to the words that brought the
 * reader there rather than hunting a long paragraph for them.
 *
 * Painted with the CSS Custom Highlight API rather than by re-rendering the
 * paragraph: the words are already cut into runs for glossary underlines and
 * the reader's own highlights (`paintSegments`), and a third, temporary marking
 * threaded through that would cost far more than it is worth. A browser
 * without the API just shows the paragraph unmarked, as before.
 */

import { useEffect } from "react";
import { textNodes } from "./highlights";

const NAME = "search-hit";
const RE_SPECIAL = /[.*+?^${}()|[\]\\]/g;

export interface SearchHit {
  /** the paragraph's element id, `p-{page}-{para}` */
  id: string;
  terms: string[];
  /** the chapter it is in — the marks go when the reader moves on */
  chapter: number;
}

/** A reader link with the searched words added, kept before the `#anchor`. */
export function withSearchTerms(href: string, terms: string[]): string {
  const t = [...new Set(terms.map((x) => x.trim()).filter(Boolean))];
  if (!t.length) return href;
  const at = href.indexOf("#");
  const path = at === -1 ? href : href.slice(0, at);
  const hash = at === -1 ? "" : href.slice(at);
  const q = t.map((x) => `hl=${encodeURIComponent(x)}`).join("&");
  return `${path}${path.includes("?") ? "&" : "?"}${q}${hash}`;
}

/** The searched words in the address bar, if any. */
export function searchTermsInLocation(): string[] {
  return new URLSearchParams(window.location.search).getAll("hl").filter(Boolean);
}

/** Every match of the terms in the paragraph, as ranges over its text nodes. */
function rangesFor(host: HTMLElement, pattern: RegExp): StaticRange[] {
  // A margin note sits inside the paragraph's box but is not its words.
  const nodes = textNodes(host).filter((n) => !n.parentElement?.closest("[data-reader-aside]"));
  const starts: number[] = [];
  let text = "";
  for (const n of nodes) {
    starts.push(text.length);
    text += n.data;
  }
  const at = (offset: number, end: boolean) => {
    // the node holding this offset; an end offset belongs to the node it closes
    let i = starts.length - 1;
    while (i > 0 && (end ? starts[i] >= offset : starts[i] > offset)) i--;
    return { node: nodes[i], offset: offset - starts[i] };
  };
  const out: StaticRange[] = [];
  for (const m of text.matchAll(pattern)) {
    if (!m[0]) continue;
    const s = at(m.index, false);
    const e = at(m.index + m[0].length, true);
    out.push(
      new StaticRange({
        startContainer: s.node,
        startOffset: s.offset,
        endContainer: e.node,
        endOffset: e.offset,
      })
    );
  }
  return out;
}

/**
 * Keep the searched words marked in the landed-on paragraph.
 *
 * The paragraph re-renders on its own schedule — the glossary index arriving,
 * a highlight made, a page turned away and back in page mode — and each time
 * its text nodes are new. Static ranges point at the old ones, so a mutation
 * that disconnects them is the cue to find the words again.
 */
export function useSearchHitMarks(hit: SearchHit | null) {
  useEffect(() => {
    if (!hit || typeof CSS === "undefined" || !("highlights" in CSS)) return;
    const terms = [...hit.terms].sort((a, b) => b.length - a.length);
    const pattern = new RegExp(terms.map((t) => t.replace(RE_SPECIAL, "\\$&")).join("|"), "gi");

    let ranges: StaticRange[] = [];
    let frame = 0;
    const paint = () => {
      frame = 0;
      if (ranges.length && ranges.every((r) => r.startContainer.isConnected && r.endContainer.isConnected)) {
        return;
      }
      const host = document.getElementById(hit.id);
      ranges = host ? rangesFor(host, pattern) : [];
      if (ranges.length) CSS.highlights.set(NAME, new Highlight(...ranges));
      else CSS.highlights.delete(NAME);
    };
    paint();
    const watch = new MutationObserver(() => {
      frame ||= requestAnimationFrame(paint);
    });
    watch.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => {
      watch.disconnect();
      cancelAnimationFrame(frame);
      CSS.highlights.delete(NAME);
    };
  }, [hit]);
}
