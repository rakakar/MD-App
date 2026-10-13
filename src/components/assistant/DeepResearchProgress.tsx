"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "@/components/shell/icons";

/**
 * **Deep research, in progress** — the designer's recording, 13 Oct 2026.
 * Before this a deep question showed one grey line for a minute, and readers
 * took the quiet for a hang.
 *
 * What it can know and what it cannot. The request is one POST that answers
 * at the end — the server sends no progress — so the clock is real and the
 * steps are not: they advance on the schedule a deep answer usually keeps,
 * and the last one holds until the answer actually arrives. The bar eases
 * toward the end and never reaches it on its own. Counts ("3 found") are not
 * shown here, because nothing has been counted yet; the finished answer
 * carries the real ones.
 */

const STEPS: { label: string; from: number }[] = [
  { label: "Looking up definitions", from: 0 },
  { label: "Searching each part of your question", from: 8 },
  { label: "Reading the passages found", from: 30 },
  { label: "Writing the answer", from: 45 },
];

/** past this, say so — a minute is the promise, and silence after it reads as stuck */
const LONG_AFTER = 70;

export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function DeepResearchProgress({
  startedAt,
  onCancel,
}: {
  /** ms since epoch — kept outside the component, so a remount keeps the clock;
   *  `null` for the first frame, before the request has been sent */
  startedAt: number | null;
  onCancel?: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [mountedAt] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = Math.max(0, now - (startedAt ?? mountedAt)) / 1000;
  const current = STEPS.reduce((at, s, i) => (elapsed >= s.from ? i : at), 0);
  // Eases toward 95% — 82% at a minute — and waits there for the answer.
  const progress = 0.95 * (1 - Math.exp(-elapsed / 30));

  return (
    <div className="rounded-card border border-rule bg-card p-4 shadow-card" role="status" aria-live="polite">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-tile"
          style={{ background: "color-mix(in srgb, var(--ws-color) 12%, var(--color-card))" }}
        >
          <span
            className="block h-4.5 w-4.5 animate-spin rounded-full border-2 border-t-transparent motion-reduce:animate-none"
            style={{ borderColor: "var(--ws-color)", borderTopColor: "transparent" }}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">Deep research in progress</span>
          <span className="block text-xs text-ink-soft">This usually takes about a minute</span>
        </span>
        <span
          className="shrink-0 text-sm font-semibold tabular-nums"
          style={{ color: "var(--ws-ink)" }}
          aria-label={`${Math.floor(elapsed)} seconds`}
        >
          {clock(elapsed)}
        </span>
      </div>

      <div aria-hidden className="mt-3 h-1 overflow-hidden rounded-full bg-inset">
        <div
          className="h-full rounded-full transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
          style={{ width: `${Math.max(4, progress * 100)}%`, background: "var(--ws-color)" }}
        />
      </div>

      <ol className="mt-4 flex flex-col gap-3">
        {STEPS.map((s, i) => {
          const state = i < current ? "done" : i === current ? "now" : "next";
          return (
            <li key={s.label} className="flex items-center gap-3 text-sm">
              <span aria-hidden className="flex h-4.5 w-4.5 shrink-0 items-center justify-center">
                {state === "done" ? (
                  <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <CheckIcon className="h-3 w-3" />
                  </span>
                ) : state === "now" ? (
                  <span className="block h-2 w-2 rounded-full" style={{ background: "var(--ws-color)" }} />
                ) : (
                  <span className="block h-2.5 w-2.5 rounded-full border border-ink-soft/50" />
                )}
              </span>
              <span
                className={
                  state === "now" ? "font-semibold text-ink" : state === "done" ? "text-ink-soft" : "text-ink-soft/70"
                }
              >
                {s.label}
                {state === "now" && <span className="sr-only"> (in progress)</span>}
              </span>
            </li>
          );
        })}
      </ol>

      {elapsed >= LONG_AFTER && (
        <p className="mt-4 rounded-control bg-inset px-3 py-2 text-xs text-ink-soft">
          Taking a little longer than usual. Still working, nothing is stuck.
        </p>
      )}

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-4 min-h-11 w-full rounded-control border border-rule text-sm font-semibold text-ink transition-colors hover:bg-ink/5"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
