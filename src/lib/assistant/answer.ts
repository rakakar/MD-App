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

export type Block = { kind: "para"; runs: Run[] } | { kind: "item"; runs: Run[] };

const RE_SPECIAL = /[.*+?^${}()|[\]\\]/g;

function inline(text: string, citations: ChatCitation[]): Run[] {
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
      runs.push({ kind: "text", text: m[2], bold: true });
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

export function parseAnswer(text: string, citations: ChatCitation[]): Block[] {
  const blocks: Block[] = [];
  for (const chunk of text.replace(/\r/g, "").split(/\n{2,}/)) {
    const lines = chunk.split("\n").filter((l) => l.trim());
    const bulleted = lines.length > 0 && lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l));
    if (bulleted) {
      for (const l of lines) {
        blocks.push({ kind: "item", runs: inline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ""), citations) });
      }
    } else if (lines.length) {
      blocks.push({ kind: "para", runs: inline(lines.join(" "), citations) });
    }
  }
  return blocks;
}

/** The answer as plain text with its sources under it — for Copy and Share. */
export function answerAsText(query: string, text: string, citations: ChatCitation[]): string {
  const sources = citations
    .map((c, i) => `${i + 1}. ${[c.book, c.canonical_ref].filter(Boolean).join(" · ")}`)
    .join("\n");
  return `${query}\n\n${text.replace(/\*\*/g, "")}${sources ? `\n\nSources:\n${sources}` : ""}`;
}

/** First sentence, for a conversation's one-line summary. */
export function firstSentence(text: string): string {
  const flat = text.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  const m = flat.match(/^(.+?[.!?।])(\s|$)/);
  return (m ? m[1] : flat).slice(0, 200);
}
