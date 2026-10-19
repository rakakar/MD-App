"use client";

import { RadioSegmented } from "@/components/ui";
import { MODES } from "@/components/reader/SettingsSheet";
import type { ReadingMode } from "@/lib/storage";
import { CARD, RowTitle } from "./parts";

/**
 * Settings' own wording for the two modes (comps, 19 Oct 2026). The reader's
 * sheet keeps its shorter hint: there the reader is already looking at the
 * page the words describe.
 */
const HINT: Record<ReadingMode, string> = {
  scroll: "The whole chapter on one long page. Slide up to keep reading.",
  page: "One page at a time, like the printed book. Swipe sideways to turn.",
};

export function ReadingCard({
  desktop,
  value,
  onChange,
}: {
  desktop: boolean;
  value: ReadingMode;
  onChange: (m: ReadingMode) => void;
}) {
  if (!desktop) {
    return (
      <div className={`${CARD} px-5 py-6`}>
        <RowTitle>Reading style</RowTitle>
        <div className="mt-4">
          <RadioSegmented label="Reading style" options={MODES} value={value} onChange={onChange} />
        </div>
        <p className="mt-3 text-sm text-ink-soft">{HINT[value]}</p>
      </div>
    );
  }

  // At a desk there is room to say what each one does before it is chosen.
  return (
    <div className={`${CARD} px-7 py-6`}>
      <RowTitle>Reading style</RowTitle>
      <div role="radiogroup" aria-label="Reading style" className="mt-4 grid grid-cols-2 gap-4">
        {MODES.map((m) => {
          const active = m.value === value;
          return (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(m.value)}
              className={`flex flex-col rounded-tile border px-5 py-4 text-start transition-colors ${
                active ? "border-2 border-(--ws-color) bg-accent-tint/40" : "border-rule m-px hover:border-ink-soft"
              }`}
            >
              <span className="flex items-center gap-3">
                <span
                  aria-hidden
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    active ? "border-(--ws-color)" : "border-muted"
                  }`}
                >
                  {active && <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--ws-color)" }} />}
                </span>
                <span className="text-title font-medium text-ink">{m.label}</span>
              </span>
              <span className="mt-1.5 text-sm text-ink-soft">{HINT[m.value]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
