"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BackIcon, ChevronDown } from "@/components/shell/icons";
import { PageContainer } from "@/components/ui";
import { LEVELS, PATH_CAVEAT, STAGES, stageById } from "@/lib/journey";
import { getPrefs } from "@/lib/storage";

/**
 * **The full path** (19A screens 3–3e) — opt-in, and reached only from the
 * dashboard's own link.
 *
 * Four levels, collapsed, each opening onto its stages. Collapsed is the
 * point: the landing shows one stage because that is what a reader is doing,
 * and this screen exists for the moment they want the shape of the whole
 * thing. Opening it should not then bury them in nine.
 *
 * **Durations are reassurance, not deadlines.** Every one is phrased "unfolds
 * over", and the source's own caveat — that this is one student's estimate of
 * their own journey — is quoted at the foot, where the comps put it. Nothing
 * here is locked, nothing is ticked off, and no stage is ever marked done:
 * the only mark on this screen is आप यहाँ हैं, against the stage the reader
 * themselves declared.
 */
export default function FullPathPage() {
  const [stageId, setStageId] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    const declared = getPrefs().journeyStage;
    setStageId(declared);
    // Opens on the level the reader is standing in, rather than on the first:
    // the one thing they are most likely here to look at is where they are.
    const stage = stageById(declared);
    if (stage) setOpen(stage.level);
  }, []);

  return (
    <PageContainer>
      {/* **The way back.**

          This screen is opt-in and reached from one place — the dashboard's
          own stage card — so the tab bar cannot return anyone to it: My
          Journey's Dashboard tab is lit the whole time they are here, because
          `/me/path` sits under `/me`, and tapping a tab that is already lit is
          the one gesture a reader will not try. Without this the only way out
          was the browser's own back, which a reader who arrived by tapping a
          card inside the app has no reason to reach for.

          Named rather than a bare arrow: it goes somewhere specific, and
          "Dashboard" is the word the tab bar uses for it. */}
      <Link
        href="/me"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-rule bg-card pe-3.5 ps-2.5 text-sm font-semibold text-ink transition-colors active:bg-ink/[.04]"
      >
        <BackIcon className="h-4 w-4 shrink-0" />
        Dashboard
      </Link>

      <h1 className="mt-4 font-display text-2xl font-medium">The full path</h1>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">
        Four levels, nine stages. Durations say how long this usually{" "}
        <em>unfolds over</em> — they are not deadlines, and nothing here is
        locked.
      </p>

      <ul className="mt-5 flex flex-col gap-2.5">
        {LEVELS.map((level) => {
          const here = STAGES.some((s) => s.id === stageId && s.level === level.id);
          const expanded = open === level.id;
          return (
            <li key={level.id}>
              {/* The whole row is the control, and it has to look like one. It
                  was a bordered card with no affordance at all: nothing said a
                  level opened, so the four of them read as a list of facts and
                  the stages inside were never found. Three things say it now —
                  a chevron that rotates to point at what it revealed, a count
                  of what is behind it, and a tinted ground while open so the
                  row and its stages read as one object rather than two. */}
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : level.id)}
                className={`flex w-full items-center gap-3 border border-rule p-4 text-start transition-colors hover:bg-ink/[0.02] active:bg-ink/[0.04] ${
                  expanded ? "rounded-t-card border-b-0" : "rounded-card"
                }`}
                style={
                  expanded
                    ? { background: "color-mix(in srgb, var(--ws-color) 5%, var(--color-card))" }
                    : { background: "var(--color-card)" }
                }
              >
                <span
                  aria-hidden
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-sm font-bold text-white"
                  style={{ background: "var(--ws-color)" }}
                >
                  {level.id}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span lang="hi" className="hi hi-tight min-w-0 truncate text-title font-semibold">
                      {level.hi}
                    </span>
                    {here && (
                      <span
                        className="shrink-0 text-xs font-semibold"
                        style={{ color: "var(--ws-ink)" }}
                      >
                        You are here
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-soft">{level.en}</span>
                  <span className="mt-1 block text-xs text-ink-soft">
                    {level.stages.length} {level.stages.length === 1 ? "stage" : "stages"} ·{" "}
                    {level.duration}
                  </span>
                </span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-ink-soft transition-transform ${
                    expanded ? "rotate-180" : ""
                  }`}
                />
              </button>

              {expanded && (
                <ul
                  className="flex flex-col gap-2 rounded-b-card border border-t-0 border-rule p-3"
                  style={{ background: "color-mix(in srgb, var(--ws-color) 5%, var(--color-card))" }}
                >
                  {level.stages.map((id) => {
                    const stage = STAGES.find((s) => s.id === id)!;
                    const current = stage.id === stageId;
                    return (
                      <li
                        key={id}
                        className="rounded-card border border-rule bg-card p-3.5"
                        style={
                          current
                            ? {
                                borderColor: "var(--ws-color)",
                                background:
                                  "color-mix(in srgb, var(--ws-color) 7%, var(--color-card))",
                              }
                            : undefined
                        }
                      >
                        <div className="flex items-baseline gap-2">
                          <span
                            className="text-xs font-bold tabular-nums"
                            style={{ color: "var(--ws-ink)" }}
                          >
                            {stage.id}
                          </span>
                          <span lang="hi" className="hi hi-tight min-w-0 flex-1 text-sm font-semibold">
                            {stage.hi}
                          </span>
                          {current && (
                            <span className="shrink-0 text-xs font-semibold" style={{ color: "var(--ws-ink)" }}>
                              You are here
                            </span>
                          )}
                          {!current && stage.flag === "optional" && (
                            <span className="shrink-0 text-xs text-ink-soft">optional</span>
                          )}
                        </div>
                        {stage.en && (
                          <p className="mt-0.5 text-xs text-ink-soft">{stage.en}</p>
                        )}
                        <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                          {stage.note}
                        </p>
                        <p className="mt-1.5 text-xs text-ink-soft">{stage.duration}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {/* The source speaking for itself, as the comps place it. Without this
          the durations read as the app's claim about somebody's life. */}
      <p lang="hi" className="hi hi-note mt-6 text-sm leading-relaxed text-ink-soft">
        {PATH_CAVEAT}
      </p>
      <p className="mt-1 text-xs text-ink-soft">
        The path as one student estimates it — not doctrine.
      </p>
    </PageContainer>
  );
}
