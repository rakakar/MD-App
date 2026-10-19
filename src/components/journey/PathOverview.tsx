import Link from "next/link";
import { ChevronRight } from "@/components/shell/icons";
import { LEVELS, STAGES } from "@/lib/journey";

/**
 * **The path, as four cards** — what My Journey shows before there is a
 * stage to show (signed-out gate, desktop revision 19 Oct 2026).
 *
 * The gate used to be an illustration and a button, which told a stranger
 * this workspace exists and nothing about what is in it. The four levels are
 * the honest preview: the whole shape at once, every stage named, and the
 * line over them says what the comps keep saying — nothing here is locked.
 *
 * Also what stands behind the stage picker on a first run, where there is no
 * dashboard yet for the question to sit over.
 */
export function PathOverview() {
  return (
    <section aria-labelledby="path-overview" className="mt-10 lg:mt-14">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span
            id="path-overview"
            className="text-xs font-bold uppercase tracking-[0.09em] text-ink-soft"
          >
            The path
          </span>
          <span className="text-sm text-ink-soft">
            Four levels, nine stages. Nothing here is locked.
          </span>
        </p>
        <Link
          href="/me/path"
          className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold"
          style={{ color: "var(--ws-ink)" }}
        >
          See the full path
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <ol className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {LEVELS.map((level) => (
          <li
            key={level.id}
            className="flex flex-col rounded-card border border-rule bg-card p-5"
          >
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-control text-sm font-bold"
              style={{
                background: "color-mix(in srgb, var(--ws-color) 12%, var(--color-card))",
                color: "var(--ws-ink)",
              }}
            >
              {level.id}
            </span>
            <h3 lang="hi" className="hi hi-tight mt-3 text-title font-semibold">
              <span className="sr-only">Level {level.id}: </span>
              {level.hi}
            </h3>
            <p className="mt-1 text-sm text-ink-soft">{level.en}</p>

            <ol className="mt-4 flex flex-col gap-2 border-t border-rule pt-4">
              {level.stages.map((id) => {
                const stage = STAGES.find((s) => s.id === id)!;
                return (
                  <li key={id} className="flex items-baseline gap-2.5">
                    <span
                      className="w-3 shrink-0 text-sm font-semibold tabular-nums"
                      style={{ color: "var(--ws-ink)" }}
                    >
                      {id}
                    </span>
                    <span lang="hi" className="hi hi-tight text-sm">
                      {stage.hi}
                    </span>
                  </li>
                );
              })}
            </ol>

            {/* `mt-auto` so the four footers line up across the row however
                many stages sit above them — three, two, one and three. */}
            <p className="mt-auto pt-5 text-xs text-ink-soft">
              {level.stages.length} {level.stages.length === 1 ? "stage" : "stages"} ·{" "}
              {level.duration}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
