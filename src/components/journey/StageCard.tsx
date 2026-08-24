"use client";

import Link from "next/link";
import { ChevronRight, PathIcon } from "@/components/shell/icons";
import { ctaPrimary } from "@/components/ui";
import { chapterLine } from "@/lib/chapter";
import { levelOf, stageBooks, type Stage } from "@/lib/journey";
import { refToHref } from "@/lib/refs";
import { contentLang } from "@/lib/script";
import type { BookSummary } from "@/lib/types";
import type { LocalProgress } from "@/lib/storage";

/**
 * **Where you are, and the one thing to do next** (19A screen 2).
 *
 * The whole landing in one card, and the shape of it is the design's argument:
 * the current stage, what that stage is for, and a single action. The other
 * eight stages are not on this screen — they are behind "See the full path",
 * opt-in, because a reader who opens this app in year one should not be shown
 * eight things they are not doing.
 *
 * **No progress figure anywhere here.** Not "stage 3 of 9", not a percentage,
 * not a bar. Progress in this app exists inside a book — chapters read of that
 * book — and nowhere else; a number over the whole journey would be the app
 * scoring a life, which is exactly what the comps refuse.
 */
export function StageCard({
  stage,
  books,
  progress,
}: {
  stage: Stage;
  /** every published book, for resolving this stage's reading */
  books: BookSummary[];
  /** saved places, newest first — what turns "start" into "continue" */
  progress: LocalProgress[];
}) {
  const level = levelOf(stage);
  const reading = stageBooks(stage, books);

  /**
   * The next step, resolved against what the reader has actually opened.
   *
   * A book of this stage that they are already inside beats one they are not:
   * the step is then "carry on", pointing at the exact paragraph they left,
   * and it is only "begin" when none of the stage's books has been opened. A
   * stage with no reading of its own — the camps, the years of मनन, the last
   * three — has no step at all, and says so rather than inventing one.
   */
  const resumable = progress.find((p) => reading.some((b) => b.code === p.book_code));
  const resumed = resumable
    ? reading.find((b) => b.code === resumable.book_code)
    : undefined;
  const target = resumed ?? reading[0];
  const href = resumable ? refToHref(resumable.canonical_ref) : target ? `/books/${encodeURIComponent(target.code)}` : null;

  return (
    /* Lifted off the page rather than sitting flush with the rails below it:
       this is the one card the screen exists for, and at plain `bg-card` it
       was a panel among panels. A 5% wash of the workspace and its own border
       in the accent is as far as that goes — the comps are emphatic that a
       stage is somewhere you say you are, not a trophy, and a saturated card
       here would read as one. */
    <section
      aria-label="Where you are"
      className="rounded-card border p-4 shadow-[0_1px_2px_rgba(26,22,19,.04)]"
      style={{
        borderColor: "color-mix(in srgb, var(--ws-color) 35%, var(--color-rule))",
        background: "color-mix(in srgb, var(--ws-color) 5%, var(--color-card))",
      }}
    >
      {/* One language. The interface is English throughout and only *content*
          carries the Devanagari — the stage's own name below is content, this
          label is not, and doubling it said the same thing twice in a card
          that has three lines to make its point. */}
      <p className="text-xs font-bold uppercase tracking-[0.09em]" style={{ color: "var(--ws-ink)" }}>
        You are here
      </p>

      <h2 lang="hi" className="hi hi-tight mt-2 text-title font-semibold">
        {stage.hi}
      </h2>
      <p className="mt-0.5 text-xs text-ink-soft">
        {stage.en ? `${stage.en} · ` : ""}
        {level.hi} — {level.en}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{stage.note}</p>

      {target && href ? (
        <div className="mt-4 border-t border-rule pt-4">
          <p className="text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
            Your next step
          </p>
          <p className="mt-1.5 text-sm leading-relaxed">
            {resumable ? "Carry on with " : "Begin with "}
            <span {...contentLang(target.title_hi)} className={`${contentLang(target.title_hi).className} font-semibold`}>
              {target.title_hi}
            </span>
            {resumable ? (
              <span className="text-ink-soft">
                {" — "}
                {chapterLine(String(resumable.chapter_number), null)}
              </span>
            ) : (
              <span className="text-ink-soft">
                {target.page_count ? ` — ${target.page_count} pages` : ""}
              </span>
            )}
          </p>
          <Link
            href={href}
            className={`${ctaPrimary} mt-3 w-full`}
            style={{ background: "var(--ws-color)" }}
          >
            {resumable ? "Continue reading" : "Start reading"}
          </Link>
        </div>
      ) : (
        /* Said plainly rather than left blank. Three of the nine stages have
           no reading of their own — a camp, the years of मनन where the whole
           library is the material, and the last three the app does not track
           — and a card that simply stopped here would read as something
           failing to load. */
        <p className="mt-4 border-t border-rule pt-4 text-sm leading-relaxed text-ink-soft">
          {stage.genres === null && stage.id >= 7
            ? "No reading list for this stage — the app keeps out of the way here."
            : "This stage is met in a shivir rather than in a book. The whole library stays open to you meanwhile."}
        </p>
      )}

    </section>
  );
}

/**
 * The way to the whole path, as its own card.
 *
 * It was the last row inside "Where you are", under a rule — which made the
 * one thing on this screen that leaves the current stage look like a footnote
 * to it. They are two different offers: *this is where you stand* and *here is
 * the whole shape of it*, and the second is opt-in by design. Its own card is
 * what lets a reader ignore it without ignoring the stage.
 */
export function FullPathCard() {
  return (
    <Link
      href="/me/path"
      className="flex items-center gap-3 rounded-card border border-rule bg-card p-4 transition-shadow hover:shadow-md"
    >
      <span
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control"
        style={{
          background: "color-mix(in srgb, var(--ws-color) 12%, var(--color-card))",
          color: "var(--ws-ink)",
        }}
      >
        <PathIcon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">See the full path</span>
        <span className="mt-0.5 block text-xs text-ink-soft">
          Four levels, from parichay to anubhav
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft" />
    </Link>
  );
}
