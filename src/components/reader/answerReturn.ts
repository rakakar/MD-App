/**
 * **The way back from a cited passage to the answer that cited it** (16 Nov
 * 2026, UX audit AS6).
 *
 * "Open in reader" on an Assistant citation took the whole screen, and the
 * reader's back arrow led to the book — nothing on screen went back to the
 * conversation. So the link carries where it came from, the way Paribhasha's
 * `?from=assistant` does, plus the conversation (`c`), and the reader's back
 * arrow reads "Back to answer" while it is there.
 *
 * Both halves live here so the link and the reader cannot disagree about the
 * names of the two params.
 */

/** A reader link that remembers the conversation it was opened from. */
export function withAnswerReturn(href: string): string {
  // The sheet only renders after a tap, but the server has no URL to read.
  if (typeof window === "undefined") return href;
  const c = new URLSearchParams(window.location.search).get("c");
  const q = new URLSearchParams({ from: "assistant", ...(c ? { c } : {}) }).toString();
  const hash = href.indexOf("#");
  const [path, anchor] = hash < 0 ? [href, ""] : [href.slice(0, hash), href.slice(hash)];
  return `${path}${path.includes("?") ? "&" : "?"}${q}${anchor}`;
}

/** Where the reader's back arrow goes instead of the book, if anywhere. */
export function answerReturnHref(search: string): string | null {
  const q = new URLSearchParams(search);
  if (q.get("from") !== "assistant") return null;
  const c = q.get("c");
  return c ? `/assistant?c=${encodeURIComponent(c)}` : "/assistant";
}
