// canonical_ref helpers. Format (contract §5): "MVD 3.42.5" =
// code · chapter · printed-page · para; front matter uses the fm marker
// ("MVD fm.iii.2"). All personal anchors use these refs, never indices.

import { documentTextHref } from "./routes";
import { readingHomeFor } from "./storage";

export interface ParsedRef {
  code: string;
  chapter: string; // "3" or "fm"
  page: string; // "42" or "iii"
  para: string;
}

export function parseRef(ref: string): ParsedRef | null {
  const m = ref.trim().match(/^(\S+)\s+([^.]+)\.([^.]+)\.([^.]+)$/);
  if (!m) return null;
  return { code: m[1], chapter: m[2], page: m[3], para: m[4] };
}

/**
 * Reader deep link for a canonical_ref (PRD §4):
 * /books/{code}/{chapter}#p-{page}-{para}. Front-matter refs ("fm") can't
 * name a chapter number locally — route through the para resolver instead.
 *
 * A **compilation** takes the same ref to a different door (Compilations.md
 * §9). Its text is a real book underneath, so its bookmarks, notes and resume
 * position are ordinary refs — but it is not on the shelf and `/books/{code}`
 * is a URL it has never had. The check is here, in the one function all of
 * those surfaces already go through, rather than at each of them: this is
 * exactly the breakage §9 warned would be silent, and a fix that has to be
 * remembered in five places is a fix that gets forgotten in the sixth.
 *
 * Falls back to the shelf URL when this device has not been told where the
 * compilation lives — on the server, where there is no local store, and on a
 * first paint before `pull()` has run. That is the old behaviour, not a new
 * fault, and it corrects itself as soon as either writer has spoken.
 */
export function refToHref(ref: string): string {
  const p = parseRef(ref);
  if (!p) return "/books";
  if (p.chapter === "fm") return `/paras/${encodeURIComponent(ref)}`;
  const anchor = `#p-${p.page}-${p.para}`;
  const at = readingHomeFor(p.code);
  const path = at
    ? documentTextHref(at.node, at.item, Number(p.chapter))
    : `/books/${encodeURIComponent(p.code)}/${p.chapter}`;
  return `${path}${anchor}`;
}

export function paraAnchorId(pageKey: string | number, paraNumber: number): string {
  return `p-${pageKey}-${paraNumber}`;
}

/**
 * **What a shared highlight, note or passage says** (7 Nov 2026).
 *
 * The words, the note if there is one, then where they come from as a reader
 * would write it — the book's name and its printed page — and the link last,
 * on its own line. The ref ("JVEP 3.51.1") used to stand in for the source;
 * it is how the app files a passage, and meant nothing to whoever received it.
 *
 * The page is the printed one, which is also the page of the original PDF:
 * the scan and the text edition are numbered alike. Front matter keeps its
 * roman numeral.
 *
 * The link goes inside the text rather than in the share sheet's `url` field,
 * because some iOS share targets keep only one of the two.
 */
export function shareCitation({
  passage,
  note,
  bookTitle,
  ref,
  origin,
}: {
  passage?: string;
  note?: string;
  bookTitle?: string;
  ref: string;
  origin: string;
}): string {
  const page = parseRef(ref)?.page;
  const source = [bookTitle?.trim(), page ? `पृष्ठ ${page}` : ""].filter(Boolean).join(", ");
  const words = passage?.replace(/\s+/g, " ").trim();
  return [
    words ? `“${words}”` : "",
    note?.trim() ? `नोट: ${note.trim()}` : "",
    `${source ? `— ${source}\n` : ""}${passageUrl(ref, origin)}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** "Copy with citation" text (PRD §5 selection actions) */
export function citationText(text: string, ref: string): string {
  return `${text}\n— ${ref}`;
}

/**
 * A passage's address on this site, absolute so it can leave the app.
 *
 * `/paras/{ref}` rather than the reader URL `refToHref` builds: it resolves
 * the ref on the server, so it still lands on the right paragraph after a
 * book moves, and a compilation is sent to its library home from there.
 */
export function passageUrl(ref: string, origin: string): string {
  return `${origin}/paras/${encodeURIComponent(ref)}`;
}

