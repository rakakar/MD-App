"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { StagePanel } from "@/components/journey/StagePanel";
import { BackIcon, ChevronRight } from "@/components/shell/icons";
import { NavScope } from "@/components/shell/WorkspaceProvider";
import { useIsDesktop } from "@/components/ui/Dialog";
import {
  LEVELS,
  STAGES,
  stageById,
  type Stage,
  type StageTab,
} from "@/lib/journey";
import { KindTile } from "@/components/ui";
import { journeyFolderHref } from "@/lib/routes";
import { getPrefs } from "@/lib/storage";

/**
 * **The full path** — opt-in, reached from the dashboard (full path revision
 * 19 Oct 2026).
 *
 * Two panes on a desktop: the nine stages down the left, grouped into their
 * four levels and all open at once, and the chosen stage on the right with
 * what it asks for. A phone has room for one, so there the list is a screen
 * and a stage is a screen of its own, reached by tapping it. Which stage and
 * which tab are in the address (`?stage=3&tab=reading`), so the dashboard can
 * link straight to the next stage and a phone's back gesture goes back to the
 * list.
 *
 * **Durations are reassurance, not deadlines.** Every one is phrased "unfolds
 * over", and the foot says the path is one student's estimate of their own
 * journey. Nothing here is locked and
 * nothing is ticked off: the one mark is "You are here", against the stage
 * the reader themselves declared.
 */
export default function FullPathPage() {
  return (
    <>
      {/* Reached only from the dashboard, so its tab stays lit here — `/me`
          matches only itself in the nav, or every page under it would light
          Dashboard too. */}
      <NavScope href="/me" />
      <Suspense fallback={null}>
        <FullPath />
      </Suspense>
    </>
  );
}

const TABS: StageTab[] = ["about", "reading", "audio", "video"];

/** "Start here - Study Roadmap", the library folder holding the three guides. */
const STUDY_GUIDE_FOLDER = 144;

function FullPath() {
  const params = useSearchParams();
  const router = useRouter();
  const desktop = useIsDesktop();
  /** `undefined` until prefs are read, so the default stage does not jump */
  const [declared, setDeclared] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    setDeclared(getPrefs().journeyStage);
  }, []);

  const picked = stageById(Number(params.get("stage")));
  const tabParam = params.get("tab");
  const tab: StageTab = TABS.includes(tabParam as StageTab) ? (tabParam as StageTab) : "about";
  // A desktop always has a stage open: the one asked for, else the reader's
  // own, else the first.
  const selected = picked ?? stageById(declared) ?? STAGES[0];

  const go = (stage: number, next: StageTab = "about") => {
    const q = new URLSearchParams({ stage: String(stage) });
    if (next !== "about") q.set("tab", next);
    const url = `/me/path?${q.toString()}`;
    // A desktop swaps the panel in place; a phone moves to a new screen, which
    // back should undo.
    if (desktop) router.replace(url, { scroll: false });
    else router.push(url);
  };

  return (
    <div className="mx-auto w-full max-w-[90rem] px-4 pb-8 pt-5 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8 lg:px-8 xl:gap-10">
      {/* Phone, with a stage open: that stage, on its own. */}
      {picked && (
        <div className="lg:hidden">
          <Link
            href="/me/path"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-rule bg-card pe-4 ps-3 text-sm font-semibold text-ink transition-colors active:bg-ink/[.04]"
          >
            <BackIcon className="h-4 w-4 shrink-0" />
            The full path
          </Link>
          <div className="mt-5">
            <StagePanel
              stage={picked}
              tab={tab}
              onTab={(t) => router.replace(`/me/path?stage=${picked.id}${t === "about" ? "" : `&tab=${t}`}`, { scroll: false })}
              variant="screen"
            />
          </div>
        </div>
      )}

      <div className={picked ? "hidden lg:block" : ""}>
        <header className="lg:border-b lg:border-rule lg:pb-7">
          {/* Where this sits — a crumb on a desktop, a way back on a phone. */}
          <nav aria-label="Breadcrumb" className="hidden items-center gap-2 text-sm lg:flex">
            <Link href="/me" className="text-ink-soft hover:text-ink hover:underline">
              My Journey
            </Link>
            <span aria-hidden className="text-ink-soft">
              /
            </span>
            <span aria-current="page" className="font-semibold">
              The full path
            </span>
          </nav>
          <Link
            href="/me"
            className="-ms-1 inline-flex min-h-11 items-center gap-1 text-base font-semibold lg:hidden"
            style={{ color: "var(--ws-ink)" }}
          >
            <BackIcon className="h-4 w-4" />
            My Journey
          </Link>

          <h1 className="mt-2 font-display text-[2.25rem] font-medium leading-tight tracking-[-0.015em] lg:mt-3 lg:text-5xl">
            The full path
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-soft lg:text-lg">
            Four levels, nine stages. Durations say how long this usually{" "}
            <em>unfolds over</em> — they are not deadlines, and nothing here is locked.
          </p>
        </header>

        <div className="mt-6 border-t border-rule pt-6 lg:mt-0 lg:border-0">
          {LEVELS.map((level) => (
            <section key={level.id} aria-labelledby={`level-${level.id}`} className="mt-8 first:mt-0 lg:mt-10">
              <p
                className="text-xs font-bold uppercase tracking-[0.09em]"
                style={{ color: "var(--ws-ink)" }}
              >
                Level {level.id}
              </p>
              <h2
                id={`level-${level.id}`}
                lang="hi"
                className="hi hi-tight mt-1 text-2xl font-semibold lg:text-[1.75rem]"
              >
                {level.hi}
              </h2>
              <p className="mt-1.5 text-sm text-ink-soft">
                {level.en} · {level.duration}
              </p>

              <ul className="mt-4 divide-y divide-rule overflow-hidden rounded-card border border-rule bg-card lg:mt-3 lg:space-y-1 lg:divide-y-0 lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent">
                {level.stages.map((id) => {
                  const stage = STAGES.find((s) => s.id === id)!;
                  return (
                    <li key={id}>
                      <StageRow
                        stage={stage}
                        declared={declared ?? null}
                        selected={stage.id === selected.id}
                        onSelect={() => go(stage.id)}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {/* The source's own framing, in English only — the Hindi quotation
              it glossed is gone (designer's call, 19 Oct 2026). Without this
              the durations read as the app's claim about somebody's life. */}
          <p className="mt-10 text-base italic leading-relaxed text-ink-soft">
            The path as one student estimates it — not doctrine.
          </p>

          {/* The guides this screen is drawn from — the three PDFs of the
              library's study-roadmap folder, opened inside My Journey. A box
              rather than a text link: it is a destination with things in it,
              drawn like the stage resources above. */}
          <Link
            href={journeyFolderHref(STUDY_GUIDE_FOLDER)}
            className="mt-4 flex items-center gap-4 rounded-card border border-rule bg-card p-4 transition-shadow hover:shadow-md"
          >
            <KindTile kind="pdf" size="lg" />
            <span className="min-w-0 flex-1">
              <span className="block text-title font-semibold">Read the full study guide</span>
              <span className="mt-1 block text-sm text-ink-soft">
                3 PDFs · English roadmap, short and detailed Hindi guides
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-ink-soft" />
          </Link>
        </div>
      </div>

      {/* Desktop: the open stage, held in view while the list scrolls past. */}
      <div className="hidden lg:sticky lg:top-6 lg:block lg:h-[calc(100dvh-3rem)] lg:self-start">
        <StagePanel
          stage={selected}
          tab={tab}
          onTab={(t) => go(selected.id, t)}
          variant="panel"
        />
      </div>
    </div>
  );
}

/**
 * One stage in the list. Its dot says where it sits against the stage the
 * reader declared — solid for that one, pale before it, an open ring after —
 * and nothing more: pale is "behind where you said you are", never "done".
 */
function StageRow({
  stage,
  declared,
  selected,
  onSelect,
}: {
  stage: Stage;
  declared: number | null;
  /** open in the desktop panel */
  selected: boolean;
  onSelect: () => void;
}) {
  const here = stage.id === declared;
  const before = declared !== null && stage.id < declared;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={`flex min-h-16 w-full items-center gap-3 px-4 py-3.5 sm:gap-4 text-start transition-colors lg:rounded-card lg:border lg:px-6 lg:py-4 ${
        here ? "bg-[color-mix(in_srgb,var(--ws-color)_5%,var(--color-card))]" : ""
      } ${
        selected
          ? "lg:border-[color-mix(in_srgb,var(--ws-color)_35%,var(--color-rule))] lg:bg-card lg:shadow-card"
          : "lg:border-transparent lg:bg-transparent lg:hover:bg-card/70"
      }`}
    >
      <span aria-hidden className="flex w-6 shrink-0 justify-center">
        {here ? (
          <span
            className="h-4 w-4 rounded-full"
            style={{
              background: "var(--ws-color)",
              boxShadow: "0 0 0 5px color-mix(in srgb, var(--ws-color) 16%, transparent)",
            }}
          />
        ) : before ? (
          <span
            className="h-4 w-4 rounded-full"
            style={{ background: "color-mix(in srgb, var(--ws-color) 35%, var(--color-card))" }}
          />
        ) : (
          <span
            className="h-4 w-4 rounded-full border-2"
            style={{ borderColor: "color-mix(in srgb, var(--color-ink-soft) 35%, var(--color-card))" }}
          />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span lang="hi" className="hi hi-tight block text-title font-semibold">
          {stage.hi}
        </span>
        <span className="mt-1 block truncate text-sm text-ink-soft">
          Stage {stage.id}
          {stage.en ? ` · ${stage.en}` : ""}
        </span>
      </span>
      {here ? (
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold sm:px-3 sm:text-sm"
          style={{
            color: "var(--ws-ink)",
            background: "color-mix(in srgb, var(--ws-color) 12%, var(--color-card))",
          }}
        >
          You are here
        </span>
      ) : stage.flag === "optional" ? (
        <span className="shrink-0 text-sm text-ink-soft">optional</span>
      ) : null}
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft lg:hidden" />
    </button>
  );
}
