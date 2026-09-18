"use client";

import type { ReactNode } from "react";
import { AccentScope } from "@/components/shell/WorkspaceProvider";
import type { Intent } from "@/lib/assistant/intent";
import { contentLang } from "@/lib/script";
import { WORKSPACES } from "@/lib/workspaceConfig";

/**
 * Each of the four answers wears a colour, as the comps draw them: Paribhasha
 * in the house terracotta, Book search in teal, Research and Navigate in
 * green.
 *
 * Borrowed from the workspace hues rather than drawn fresh. Those five were
 * each tuned to clear AA as text and as a fill in all three themes, and a
 * sixth, seventh and eighth colour for one screen would be a palette nobody
 * tuned. Applied through `AccentScope`, so `--ws-color` is the fill and
 * `--ws-ink` the text inside each answer, exactly as everywhere else.
 */
export const INTENT_COLOR: Record<Intent, string> = {
  paribhasha: WORKSPACES.originals.color,
  books: WORKSPACES.connect.color,
  research: WORKSPACES.translations.color,
  navigate: WORKSPACES.translations.color,
};

export function IntentScope({ intent, children }: { intent: Intent; children: ReactNode }) {
  return <AccentScope color={INTENT_COLOR[intent]}>{children}</AccentScope>;
}

/**
 * What the reader asked, on the right, as a chat would draw it.
 *
 * Teal on every turn, whatever the answer below it turned out to be — the
 * question is the reader's, not the intent's. Connect's hue, which is the
 * nearest tuned colour to the comp's slate and carries white text at 5.6:1.
 */
export function QueryBubble({ children }: { children: string }) {
  const l = contentLang(children);
  return (
    <div className="flex justify-end">
      <p
        lang={l.lang}
        className={`${l.className} max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-base leading-snug text-white`}
        style={{ background: WORKSPACES.connect.color }}
      >
        {children}
      </p>
    </div>
  );
}

/** "PARIBHASHA ———— 2 entries" — names the answer and counts it. */
export function AnswerEyebrow({ label, count }: { label: string; count?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="shrink-0 text-xs font-bold uppercase tracking-[0.09em]"
        style={{ color: "var(--ws-ink)" }}
      >
        {label}
      </span>
      <span aria-hidden className="h-px flex-1 bg-rule" />
      {count && <span className="shrink-0 text-xs text-ink-soft">{count}</span>}
    </div>
  );
}

/** The section label the empty state and the sheets use — CONTINUE, SOURCES. */
export function Eyebrow({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="shrink-0 text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
        {children}
      </h2>
      <span aria-hidden className="h-px flex-1 bg-rule" />
      {action}
    </div>
  );
}

/** The follow-up pills under an answer — "Explain simply", "Related: …". */
export function SuggestionChip({
  children,
  onClick,
  tone = "plain",
}: {
  children: ReactNode;
  onClick: () => void;
  /** `tint` is the comps' peach pill under a finished answer */
  tone?: "plain" | "tint";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium ${
        tone === "tint" ? "" : "border-rule bg-card text-ink"
      }`}
      style={
        tone === "tint"
          ? {
              borderColor: "color-mix(in srgb, var(--ws-color) 25%, transparent)",
              background: "color-mix(in srgb, var(--ws-color) 12%, var(--color-card))",
              color: "var(--ws-ink)",
            }
          : undefined
      }
    >
      {children}
    </button>
  );
}

/** A Devanagari-or-Roman run, marked for the right face. */
export function Lang({ text, className = "" }: { text: string; className?: string }) {
  const l = contentLang(text);
  return (
    <span lang={l.lang} className={`${l.className} ${className}`}>
      {text}
    </span>
  );
}

export function Thinking({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-sm text-ink-soft" role="status">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{
          background: "color-mix(in srgb, var(--ws-color) 12%, var(--color-card))",
          color: "var(--ws-ink)",
        }}
        aria-hidden
      >
        ✦
      </span>
      <span>{children}</span>
      <span aria-hidden className="assistant-dots flex gap-1">
        <span />
        <span />
        <span />
      </span>
    </div>
  );
}
