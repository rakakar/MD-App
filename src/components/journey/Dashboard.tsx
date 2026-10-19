"use client";

import Link from "next/link";
import { CoverTile } from "@/components/shelf/CoverTile";
import { ChevronRight, Icon } from "@/components/shell/icons";
import { StageResources } from "@/components/journey/StageResources";
import { ctaPrimary } from "@/components/ui";
import { chapterLine } from "@/lib/chapter";
import {
  LEVELS,
  STAGES,
  levelOf,
  nextStage,
  stageBooks,
  stageResources,
  type Stage,
} from "@/lib/journey";
import { parseRef, refToHref } from "@/lib/refs";
import { contentLang } from "@/lib/script";
import type { BookSummary } from "@/lib/types";
import type { LocalProgress } from "@/lib/storage";

/**
 * **My Journey's dashboard, in three pieces** (desktop revision 19 Oct 2026):
 * the path card (where you are, and what this stage is), the next step (one
 * book, one button), and what comes after (the next stage, opt-in).
 *
 * **A position, never a score** — still the rule, and the bar below is drawn
 * to keep it. It fills to the stage the reader *declared*; nothing is ever
 * ticked off and no stage is marked complete. The fill says where in the
 * shape you are standing; it never claims you finished what is behind you.
 */

/** How the bar's width is shared out: levels 1–3 are read with the books and
 *  take nearly all of it; level 4 is beyond them and is a short hatched end. */
const BOOKS_SPAN = 95;
const BEYOND_SPAN = 100 - BOOKS_SPAN;

/** Level 4's own tone — the gold the drawing gives "beyond the books". */
const L4 = "var(--color-ws-journey)";
const L4_INK = "color-mix(in srgb, var(--color-ws-journey) 65%, var(--color-ink))";

/**
 * Where on the bar a stage sits, as a percentage — the end of its share of
 * its level, so the fill reaches the stage rather than stopping short of it.
 * Levels 1–3 are equal thirds of the book span whatever their stage count:
 * the drawing spaces them that way, and it keeps a level of one stage from
 * shrinking to a sliver.
 */
function stagePosition(stage: Stage): number {
  const level = levelOf(stage);
  const index = level.stages.indexOf(stage.id);
  const share = (index + 1) / level.stages.length;
  if (level.id === 4) return BOOKS_SPAN + share * BEYOND_SPAN;
  const third = BOOKS_SPAN / 3;
  return (level.id - 1) * third + share * third;
}

/** "1–2 camps over 6–9 months" → "1–2 camps over 6–9 months", capitalised. */
function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function PathBar({ stage }: { stage: Stage }) {
  const at = stagePosition(stage);
  const third = BOOKS_SPAN / 3;
  return (
    <div>
      {/* The two bands, named. On a phone the second half of each name drops
          under the bar, where there is room for it. */}
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <p className="min-w-0">
          <span className="font-semibold" style={{ color: "var(--ws-ink)" }}>
            Study &amp; practice
          </span>
          <span className="text-ink-soft">
            {" "}
            · Levels 1–3<span className="hidden sm:inline"> · with the books</span>
          </span>
        </p>
        <p className="shrink-0 text-end">
          <span className="hidden text-ink-soft sm:inline">Level 4 · beyond the books </span>
          <span className="font-semibold" style={{ color: L4_INK }}>
            <span className="sm:hidden">Level 4</span>
            <span className="hidden sm:inline"> Understanding</span>
          </span>
        </p>
      </div>

      {/* Brackets over each band — the drawing's way of saying the bar is two
          things, not one long track. */}
      <div aria-hidden className="mt-2 flex gap-1.5">
        <span
          className="h-2 rounded-t-md border border-b-0"
          style={{
            width: `calc(${BOOKS_SPAN}% - 0.375rem)`,
            borderColor: "color-mix(in srgb, var(--ws-color) 40%, var(--color-card))",
          }}
        />
        <span
          className="h-2 flex-1 rounded-t-md border border-b-0"
          style={{ borderColor: `color-mix(in srgb, ${L4} 50%, var(--color-card))` }}
        />
      </div>

      <div
        role="img"
        aria-label={`Stage ${stage.id} of ${STAGES.length}, level ${stage.level} of ${LEVELS.length}`}
        className="relative mt-1 h-5"
      >
        <span
          aria-hidden
          className="absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 overflow-hidden rounded-full"
          style={{ background: "color-mix(in srgb, var(--ws-color) 14%, var(--color-card))" }}
        >
          <span
            className="absolute inset-y-0 right-0"
            style={{
              width: `${BEYOND_SPAN}%`,
              background: `repeating-linear-gradient(90deg, color-mix(in srgb, ${L4} 55%, var(--color-card)) 0 3px, transparent 3px 6px)`,
            }}
          />
          <span
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${at}%`, background: "var(--ws-color)" }}
          />
        </span>
        <span
          aria-hidden
          className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-3 bg-card"
          style={{ left: `${at}%`, borderColor: "var(--ws-color)" }}
        />
      </div>

      {/* The four levels, each under where it starts. A phone has no room for
          four Devanagari names in a row, so it says the band instead. */}
      <div aria-hidden className="mt-2.5 hidden text-sm sm:flex">
        {LEVELS.slice(0, 2).map((l) => (
          <span
            key={l.id}
            lang="hi"
            className="hi hi-tight min-w-0 truncate pe-3 text-ink-soft"
            style={{ width: `${third}%` }}
          >
            {l.id} · {l.hi}
          </span>
        ))}
        <span lang="hi" className="hi hi-tight min-w-0 flex-1 truncate pe-3 text-ink-soft">
          3 · {LEVELS[2].hi}
        </span>
        <span lang="hi" className="hi hi-tight shrink-0 font-semibold" style={{ color: L4_INK }}>
          4 · {LEVELS[3].hi}
        </span>
      </div>
      <div aria-hidden className="mt-2 flex justify-between text-sm sm:hidden">
        <span className="text-ink-soft">with the books</span>
        <span style={{ color: L4_INK }}>beyond the books</span>
      </div>
    </div>
  );
}

/** The tinted "See the full path" button, in the card's head on a desktop. */
function FullPathButton({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/me/path"
      /* No display class of its own — the caller says where it shows, and a
         built-in `inline-flex` would beat the caller's `hidden`. */
      className={`min-h-11 items-center justify-center gap-1.5 rounded-control border px-4 text-sm font-semibold transition-colors hover:brightness-[0.98] ${className}`}
      style={{
        color: "var(--ws-ink)",
        borderColor: "color-mix(in srgb, var(--ws-color) 35%, var(--color-card))",
        background: "color-mix(in srgb, var(--ws-color) 7%, var(--color-card))",
      }}
    >
      See the full path
      <ChevronRight className="h-4 w-4" />
    </Link>
  );
}

/**
 * **Where you are** — the path, then the stage the reader declared, then what
 * that stage points to.
 */
export function PathCard({
  stage,
  onChangeStage,
}: {
  stage: Stage;
  /** reopens the stage picker — on a phone it lives at the foot of this card */
  onChangeStage: () => void;
}) {
  const level = levelOf(stage);
  const resources = stageResources(stage);

  return (
    <section
      aria-label="Your path"
      className="rounded-hero border border-rule bg-card p-5 shadow-card sm:p-7 lg:p-9"
    >
      <div className="flex items-center justify-between gap-4">
        <p className="flex items-baseline gap-3">
          <span className="text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
            Your path
          </span>
          <span className="text-sm font-semibold sm:text-base">
            Stage {stage.id} of {STAGES.length}
          </span>
        </p>
        <FullPathButton className="hidden sm:inline-flex" />
      </div>

      <div className="mt-5">
        <PathBar stage={stage} />
      </div>

      <FullPathButton className="mt-5 flex w-full sm:hidden" />

      <div className="mt-6 border-t border-rule pt-6 sm:mt-8 sm:pt-8">
        <p
          className="text-xs font-bold uppercase tracking-[0.09em]"
          style={{ color: "var(--ws-ink)" }}
        >
          Level {level.id} · {level.en.replace(/\s*\(.*\)$/, "")}
        </p>
        <h2
          lang="hi"
          className="hi hi-tight mt-2 text-3xl font-semibold sm:text-[2.5rem] sm:leading-[1.25]"
        >
          {stage.hi}
        </h2>
        {stage.en && <p className="mt-1.5 text-base text-ink-soft">{stage.en}</p>}
        <p className="mt-4 max-w-3xl text-base leading-relaxed sm:text-[1.0625rem]">
          {stage.note}
        </p>
        <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
          <Icon name="overview" className="h-4 w-4 shrink-0" />
          {capitalise(stage.duration)}
        </p>

        {resources.length > 0 && (
          <div className="mt-6">
            <StageResources resources={resources} label="For this stage" layout="grid" count />
          </div>
        )}
      </div>

      {/* The card's own way to correct itself, on a phone. A desktop has it in
          the page's head instead, beside the title. */}
      <button
        type="button"
        onClick={onChangeStage}
        className="-mb-2 mt-5 flex min-h-12 w-full items-center justify-between border-t border-rule pt-3 text-base font-semibold sm:hidden"
      >
        Change my stage
        <ChevronRight className="h-4 w-4 text-ink-soft" />
      </button>
    </section>
  );
}

/**
 * **Your next step** — one book of the declared stage, and one button.
 *
 * A book of this stage that the reader is already inside beats one they are
 * not: the step is then "continue", pointing at the exact paragraph they
 * left, and it is "start" only when none of the stage's books has been
 * opened. A stage with no reading of its own says so rather than inventing a
 * step.
 */
export function NextStepCard({
  stage,
  books,
  progress,
}: {
  stage: Stage;
  books: BookSummary[];
  progress: LocalProgress[];
}) {
  const reading = stageBooks(stage, books);
  const resumable = progress.find((p) => reading.some((b) => b.code === p.book_code));
  const resumed = resumable ? reading.find((b) => b.code === resumable.book_code) : undefined;
  const target = resumed ?? reading[0];
  const href = resumable
    ? refToHref(resumable.canonical_ref)
    : target
      ? `/books/${encodeURIComponent(target.code)}`
      : null;

  const page = resumable ? Number(parseRef(resumable.canonical_ref)?.page) : NaN;
  const percent =
    resumable && target?.page_count && Number.isFinite(page) && page > 0
      ? Math.min(100, (page / target.page_count) * 100)
      : null;

  if (!target || !href) {
    // Said plainly rather than left blank: three of the nine stages have no
    // reading of their own, and a missing card would read as a failed load.
    return (
      <div className="rounded-card border border-rule bg-card p-5 text-sm leading-relaxed text-ink-soft">
        {stage.genres === null && stage.id >= 7
          ? "No reading list for this stage — the app keeps out of the way here."
          : "This stage is met in a shivir rather than in a book. The whole library stays open to you meanwhile."}
      </div>
    );
  }

  const title = contentLang(target.title_hi);
  return (
    <div className="flex flex-col gap-4 rounded-card border border-rule bg-card p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6">
        <span className="sm:hidden">
          <CoverTile book={target} size="resume" caption="none" />
        </span>
        <span className="hidden sm:block">
          <CoverTile book={target} size="lg" caption="none" />
        </span>
        <span className="min-w-0 flex-1">
          <span
            lang={title.lang}
            className={`${title.className} hi-tight block truncate text-title font-semibold sm:text-2xl`}
          >
            {target.title_hi}
          </span>
          <span className="mt-1.5 block truncate text-sm text-ink-soft">
            {resumable
              ? chapterLine(String(resumable.chapter_number), null)
              : `${stage.en ?? stage.hi} reading`}
            {resumable && Number.isFinite(page) && page > 0
              ? ` · page ${page}`
              : !resumable && target.page_count
                ? ` · ${target.page_count} pages`
                : ""}
          </span>
          {percent !== null && (
            <span
              aria-hidden
              className="mt-3 block h-1.5 w-full max-w-md overflow-hidden rounded-full bg-canvas"
            >
              <span
                className="block h-full rounded-full"
                style={{ width: `${Math.max(percent, 2)}%`, background: "var(--ws-color)" }}
              />
            </span>
          )}
        </span>
      </Link>
      <Link
        href={href}
        className={`${ctaPrimary} min-h-12 w-full sm:w-auto sm:px-6`}
        style={{ background: "var(--ws-color)" }}
      >
        {resumable ? "Continue reading" : "Start reading"}
      </Link>
    </div>
  );
}

/**
 * **Next on the path** — the stage after the declared one, opt-in.
 *
 * A desktop has the room to list what that stage asks for; a phone draws the
 * card as one door into the full path and counts the resources instead.
 * Nothing at all after stage 9.
 */
export function NextOnPath({ stage }: { stage: Stage }) {
  const next = nextStage(stage);
  if (!next) return null;
  const resources = stageResources(next);
  const href = `/me/path?stage=${next.id}`;

  const head = (
    <>
      <p className="flex items-center gap-2.5">
        <span className="text-sm font-semibold" style={{ color: "var(--ws-ink)" }}>
          Stage {next.id}
        </span>
        {next.flag === "optional" && (
          <span className="rounded-full border border-rule px-2 py-0.5 text-xs text-ink-soft">
            optional
          </span>
        )}
      </p>
      <h3 lang="hi" className="hi hi-tight mt-3 text-2xl font-semibold">
        {next.hi}
      </h3>
      {next.en && <p className="mt-1.5 text-sm text-ink-soft">{next.en}</p>}
      <p className="mt-3 text-base leading-relaxed">{next.note}</p>
    </>
  );

  const shell = "rounded-card border border-rule bg-canvas/50 p-5 sm:p-6";

  return (
    <section aria-labelledby="next-on-path">
      <h2
        id="next-on-path"
        className="mb-3 text-xs font-bold uppercase tracking-[0.09em] text-ink-soft"
      >
        Next on the path
      </h2>

      {/* Phone: the whole card opens the stage. */}
      <Link href={href} className={`${shell} relative block transition-shadow hover:shadow-md lg:hidden`}>
        <ChevronRight className="absolute end-5 top-6 h-4 w-4 text-ink-soft" />
        {head}
        {resources.length > 0 && (
          <p className="mt-4 text-sm text-ink-soft">
            {resources.length} {resources.length === 1 ? "resource" : "resources"}
          </p>
        )}
      </Link>

      {/* Desktop: the stage, what it asks for, and the way into it. */}
      <div className={`${shell} hidden lg:block`}>
        {head}
        {resources.length > 0 && (
          <div className="mt-4">
            <StageResources resources={resources} label={null} />
          </div>
        )}
        <Link
          href={href}
          className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold"
          style={{ color: "var(--ws-ink)" }}
        >
          Open in the full path
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
