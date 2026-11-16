import { useId } from "react";
import type { Stage } from "@/lib/journey";

/**
 * **What this stage tends to bring** (16 Nov 2026, UX audit ST3).
 *
 * The stage card said how long a stage takes and nothing of what it brings,
 * so the only feedback on My Journey was a page-percentage bar. The study
 * guide the path is drawn from gives every stage a परिणाम row — the inner
 * signs a stage tends to bring — and a few of its lines are kept here as
 * written.
 *
 * Plain lines to reflect on, deliberately: no checkboxes, no ticks, no
 * count. The path's own rule is a position, never a score, and a list a
 * reader could tick would turn these into one.
 */
export function StageBrings({ stage, className = "" }: { stage: Stage; className?: string }) {
  // The panel can be drawn more than once on a page (the path lists every
  // stage), so the heading's id cannot be the stage's.
  const id = useId();
  if (stage.brings.length === 0) return null;
  return (
    <section className={className} aria-labelledby={id}>
      <h3
        id={id}
        className="text-xs font-bold uppercase tracking-[0.09em] text-ink-soft"
      >
        What this stage tends to bring ·{" "}
        <span lang="hi" className="hi normal-case tracking-normal">
          परिणाम
        </span>
      </h3>
      <ul lang="hi" className="hi mt-3 flex max-w-3xl flex-col gap-2 text-base leading-relaxed">
        {stage.brings.map((line) => (
          <li key={line} className="border-l-2 pl-3" style={{ borderColor: "var(--ws-color)" }}>
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}
