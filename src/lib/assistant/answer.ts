// Turning an MD Chat answer into something to draw.
//
// The answer arrives as text plus `citations[]` (verified refs only — see
// `ChatCitation`). The comps number each citation inline, as a small badge
// right after the sentence it supports. So the text is split into runs, and a
// ref named in it — "MVD 3.42.5", "[MVD 3.42.5]", "(MVD 3.42.5)" — becomes the
// badge for that citation. A plain "[2]" is honoured as-is when it is in range.
//
// Refs the model invented are *not* in `citations`, and the BE has already
// flagged those inside the text; they are left exactly as written. This file
// never promotes a ref to a link that the server did not verify.

import type { ChatCitation } from "@/lib/types";

export type Run =
  | { kind: "text"; text: string; bold?: boolean }
  | { kind: "cite"; index: number };

export type Block =
  | { kind: "para"; runs: Run[] }
  | { kind: "item"; runs: Run[]; depth?: number }
  | { kind: "heading"; runs: Run[] }
  | { kind: "rule" }
  | { kind: "table"; head: Run[][]; rows: Run[][][] };

const RE_SPECIAL = /[.*+?^${}()|[\]\\]/g;

function inline(text: string, citations: ChatCitation[]): Run[] {
  // The BE writes a verified ref as **[MVD 3.42.5]**. Matched as bold, it came
  // out as bracketed text rather than a badge — and a model that also bolds
  // the sentence around it left stray "**" behind. The bold on a citation
  // carries nothing, so it is dropped before matching.
  text = text.replace(/\*\*\s*(\[[^\]\n]+\])\s*\*\*/g, "$1");
  const refs = citations.map((c) => c.canonical_ref.replace(RE_SPECIAL, "\\$&"));
  const parts: string[] = [];
  if (refs.length) parts.push(`[\\[(]?\\s*(?:${refs.join("|")})\\s*[\\])]?`);
  parts.push("\\[(\\d{1,2})\\]");
  parts.push("\\*\\*([^*]+)\\*\\*");
  const re = new RegExp(parts.join("|"), "g");

  const runs: Run[] = [];
  let at = 0;
  for (const m of text.matchAll(re)) {
    const start = m.index ?? 0;
    if (start > at) runs.push({ kind: "text", text: text.slice(at, start) });
    const whole = m[0];
    if (m[2] !== undefined && whole.startsWith("**")) {
      // A bold span can hold a citation — "**a sentence [MVD 3.42.5]**" —
      // and the badge must survive it; the rest of the span stays bold.
      for (const r of inline(m[2], citations)) runs.push(r.kind === "text" ? { ...r, bold: true } : r);
    } else if (m[1] !== undefined) {
      const n = Number(m[1]);
      runs.push(
        n >= 1 && n <= citations.length ? { kind: "cite", index: n - 1 } : { kind: "text", text: whole }
      );
    } else {
      const i = citations.findIndex((c) => whole.includes(c.canonical_ref));
      runs.push(i >= 0 ? { kind: "cite", index: i } : { kind: "text", text: whole });
    }
    at = start + whole.length;
  }
  if (at < text.length) runs.push({ kind: "text", text: text.slice(at) });

  // "…humans invent [1]." reads better as "…humans invent. [1]" is a style
  // choice the model makes; what we do fix is the stray space before a badge.
  for (let i = 1; i < runs.length; i++) {
    const prev = runs[i - 1];
    if (runs[i].kind === "cite" && prev.kind === "text") prev.text = prev.text.replace(/\s+$/, " ");
  }
  return runs;
}

const BULLET = /^(\s*)([-*•]|\d+[.)])\s+/;
const HEADING = /^\s*#{1,6}\s+/;
const RULE = /^\s*([-*_]\s*){3,}$/;
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_DIVIDER = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function cells(line: string, citations: ChatCitation[]): Run[][] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => inline(c.trim(), citations));
}

/**
 * The answer as the model wrote it, in blocks to draw. Deep research answers
 * are Markdown with headings, dividers and tables, and are shown as written —
 * nothing is dropped to make them fit.
 */
export function parseAnswer(text: string, citations: ChatCitation[]): Block[] {
  const blocks: Block[] = [];
  const lines = text.replace(/\r/g, "").split("\n");
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ kind: "para", runs: inline(para.join(" "), citations) });
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      flush();
    } else if (TABLE_ROW.test(line)) {
      flush();
      const rows: string[] = [];
      while (i < lines.length && TABLE_ROW.test(lines[i])) rows.push(lines[i++]);
      i--;
      const body = rows.filter((r) => !TABLE_DIVIDER.test(r));
      const hasHead = rows.length > 1 && TABLE_DIVIDER.test(rows[1]);
      blocks.push({
        kind: "table",
        head: hasHead ? cells(body[0], citations) : [],
        rows: (hasHead ? body.slice(1) : body).map((r) => cells(r, citations)),
      });
    } else if (RULE.test(line)) {
      flush();
      blocks.push({ kind: "rule" });
    } else if (HEADING.test(line)) {
      flush();
      blocks.push({ kind: "heading", runs: inline(line.replace(HEADING, "").replace(/\*\*/g, ""), citations) });
    } else if (BULLET.test(line)) {
      flush();
      const indent = line.match(BULLET)?.[1].length ?? 0;
      blocks.push({ kind: "item", depth: indent >= 2 ? 1 : 0, runs: inline(line.replace(BULLET, ""), citations) });
    } else {
      para.push(line.trim());
    }
  }
  flush();
  return blocks;
}

/** The answer as plain text with its sources under it — for Copy and Share. */
export function answerAsText(query: string, text: string, citations: ChatCitation[]): string {
  const sources = citations
    .map((c, i) => `${i + 1}. ${[c.book, c.canonical_ref].filter(Boolean).join(" · ")}`)
    .join("\n");
  return `${query}\n\n${text.replace(/\*\*/g, "").replace(/^#{1,6}\s+/gm, "")}${sources ? `\n\nSources:\n${sources}` : ""}`;
}

/** First sentence, for a conversation's one-line summary. */
export function firstSentence(text: string): string {
  // Headings, rules and table rows are not sentences — a deep answer opens
  // with a heading, and "1." is not a summary.
  const flat = text
    .split("\n")
    .filter((l) => !HEADING.test(l) && !RULE.test(l) && !TABLE_ROW.test(l))
    .map((l) => l.replace(BULLET, ""))
    .join(" ")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const m = flat.match(/^(.+?[^\d\s][.!?।])(\s|$)/);
  return (m ? m[1] : flat).slice(0, 200);
}
