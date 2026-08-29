"use client";

import Link from "next/link";
import { CoverTile } from "@/components/shelf/CoverTile";
import { ChevronRight, PathIcon } from "@/components/shell/icons";
import { chapterLine } from "@/lib/chapter";
import { LEVELS, STAGES, levelOf, stageBooks, type Stage } from "@/lib/journey";
import { parseRef, refToHref } from "@/lib/refs";
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
 * **The card now says which stage of nine, and draws the nine.** That reverses
 * what this file and `lib/journey.ts` both used to argue — that a figure over
 * the whole journey would be the app scoring a life — and the reversal is the
 * designer's, on their own redraw of this card. What the drawing does with it
 * is the reason it works: the nine segments are grouped into their four
 * levels, and they are not a fill that climbs. The stage you are in is the
 * accent, the rest of its level is a wash, and the other levels are fainter
 * still. It answers *where in the shape am I*, which is the question the path
 * screen exists for, rather than *how much have you done*.
 *
 * Nothing is ticked off and no stage is ever marked complete — a reader who
 * declares stage 6 lights stage 6, and the five before it stay as pale as the
 * three after. That is what keeps this a position rather than a score.
 */
export function StageCard({
  stage,
  books,
  progress,
  onChangeStage,
}: {
  stage: Stage;
  /** every published book, for resolving this stage's reading */
  books: BookSummary[];
  /** saved places, newest first — what turns "start" into "continue" */
  progress: LocalProgress[];
  /** reopens the stage picker — the card's own way to correct itself */
  onChangeStage: () => void;
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

  /**
   * How far into the book the next step sits, as a fraction.
   *
   * The printed page against the book's page count, which is the only progress
   * signal that exists — the same one the book hero's resume button draws, and
   * it means "how far into the book this page is", not "how much has been
   * read". `null` before anything has been opened, where a bar at zero would
   * be a promise the reader has not made.
   */
  const percent = (() => {
    if (!resumable || !target?.page_count) return null;
    const page = Number(parseRef(resumable.canonical_ref)?.page);
    if (!Number.isFinite(page) || page <= 0) return null;
    return Math.min(100, (page / target.page_count) * 100);
  })();

  return (
    /* Lifted off the page rather than sitting flush with the rails below it:
       this is the one card the screen exists for, and at plain `bg-card` it
       was a panel among panels. A 5% wash of the workspace and its own border
       in the accent is as far as that goes — the comps are emphatic that a
       stage is somewhere you say you are, not a trophy, and a saturated card
       here would read as one. */
    <section
      aria-label="Where you are"
      className="rounded-card border p-3.5 shadow-[0_1px_2px_rgba(26,22,19,.04)]"
      style={{
        borderColor: "color-mix(in srgb, var(--ws-color) 35%, var(--color-rule))",
        background: "color-mix(in srgb, var(--ws-color) 5%, var(--color-card))",
      }}
    >
      {/* One language. The interface is English throughout and only *content*
          carries the Devanagari — the stage's own name below is content, these
          labels are not. */}
      <div className="flex items-baseline justify-between gap-3">
        <p
          className="text-xs font-bold uppercase tracking-[0.09em]"
          style={{ color: "var(--ws-ink)" }}
        >
          Level {LEVEL_WORD[level.id]}
        </p>
        <p className="shrink-0 text-sm text-ink-soft">
          Stage {stage.id} of {STAGES.length}
        </p>
      </div>

      <StageBar stage={stage} />

      <h2 lang="hi" className="hi hi-tight mt-2.5 text-2xl font-semibold">
        {stage.hi}
      </h2>
      {/* The level is named in the row above now, so this line carries what it
          does not: the English gloss the source gives the stage, and how long
          the stage unfolds over. */}
      {/* The stage's English gloss, and only that.

          `text-xs`, a step under the note below it: this is the title's label
          while the note is what the stage actually is, and at one size the two
          read as a single paragraph broken in half.

          It carried the duration too, and that is what made it two lines —
          "1–2 camps over 6 months to 1 year" is a sentence, not a label, and
          it cost the card 18px to say something the full path screen already
          gives every stage. The drawing's own version of this line is three
          short facts; one true short fact is nearer that than one long one. */}
      {stage.en && <p className="mt-1 text-xs text-ink-soft">{stage.en}</p>}
      {/* The duration rides at the end of the description rather than on a
          line of its own.

          It was its own line and cost 36px — a 13px label wrapping to two,
          because "1–2 camps over 6 months to 1 year" is a sentence and not a
          label. Here it costs only whatever it pushes past the end of the last
          line, and it reads where it belongs: the note says what the stage is,
          and how long it usually runs is part of that.

          `ink-soft` and its own sentence, so it is a coda rather than another
          clause of the description. `durationSentence` does the capital and
          the full stop — the source stores these as bare phrases, since the
          full path screen sets them in a column where a sentence would be
          wrong. */}
      <p className="mt-1.5 text-sm leading-relaxed">
        {stage.note}{" "}
        <span className="text-ink-soft">{durationSentence(stage.duration)}</span>
      </p>

      {target && href ? (
        <>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
            Your next step
          </p>
          {/* The step is a card with the book's own cover on it rather than a
              sentence and a button. A reader who is mid-way through something
              recognises it by its artwork before they read a word, and the bar
              underneath says how far in they are — which is the one progress
              figure this app has ever had, and it belongs to the book. */}
          <Link
            href={href}
            className="mt-1.5 flex items-center gap-3 rounded-card border border-rule bg-card p-3 transition-shadow hover:shadow-md"
          >
            <CoverTile book={target} size="resume" caption="none" />
            <span className="min-w-0 flex-1">
              <span
                {...contentLang(target.title_hi)}
                className={`${contentLang(target.title_hi).className} block truncate text-title font-semibold`}
              >
                {target.title_hi}
              </span>
              <span className="mt-0.5 block truncate text-xs text-ink-soft">
                {resumable
                  ? chapterLine(String(resumable.chapter_number), null)
                  : `${stage.en ?? stage.hi} reading`}
                {resumable && parseRef(resumable.canonical_ref)?.page
                  ? ` · page ${parseRef(resumable.canonical_ref)?.page}`
                  : target.page_count
                    ? ` · ${target.page_count} pages`
                    : ""}
              </span>
              {percent !== null && (
                <span
                  aria-hidden
                  className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-inset"
                >
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${percent}%`, background: "var(--ws-color)" }}
                  />
                </span>
              )}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft" />
          </Link>
        </>
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

      {/* The card's own way to correct itself. A stage is declared, never
          detected, so the reader is the only one who can say it has changed —
          and until now the only way to was to clear the app's storage. */}
      {/* `min-h-11` is the tap target and stays, but it was reading as a
          slab of padding under the step card — 44px of box around 20px of
          text, plus a 12px margin over it. The margin comes off the top and
          the negative one at the foot lets the box overlap the card's own
          padding, so the target is untouched and the air around it is not
          counted twice. */}
      <button
        type="button"
        onClick={onChangeStage}
        className="-mb-1.5 mt-0.5 inline-flex min-h-11 items-center gap-1 text-sm font-semibold"
        style={{ color: "var(--ws-ink)" }}
      >
        Change my stage
        <ChevronRight className="h-4 w-4" />
      </button>
    </section>
  );
}

/**
 * A stage's duration as a sentence — "1–2 camps over 6 months to 1 year."
 *
 * The source stores these bare, because the full path screen sets them in a
 * column beside a stage count where a capital and a full stop would be wrong.
 * The card puts them at the end of a paragraph, where the opposite is true.
 */
function durationSentence(duration: string): string {
  const text = duration.charAt(0).toUpperCase() + duration.slice(1);
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

/** "Level One" — the level's number said as a word, as the design draws it. */
const LEVEL_WORD: Record<number, string> = { 1: "One", 2: "Two", 3: "Three", 4: "Four" };

/**
 * The nine stages, grouped into their four levels.
 *
 * Grouped rather than run as one strip of nine: the gaps are what say the path
 * has a shape, and which of the four you are standing in is the thing this
 * answers at a glance. The groups are `LEVELS`' own — three, two, one, three —
 * so a level that gains a stage regroups itself here with no change.
 *
 * Three tones, and none of them means "done". The stage you declared is the
 * accent; the rest of its level is a wash of the same; every other level is
 * fainter still. A reader at stage 6 lights stage 6 — the five before it stay
 * exactly as pale as the three after, because this is a position and not a
 * score.
 */
function StageBar({ stage }: { stage: Stage }) {
  return (
    <div
      className="mt-2.5 flex items-center gap-2"
      role="img"
      aria-label={`Stage ${stage.id} of ${STAGES.length}, level ${stage.level} of ${LEVELS.length}`}
    >
      {LEVELS.map((l) => (
        <div key={l.id} className="flex flex-1 gap-1">
          {l.stages.map((id) => (
            <span
              key={id}
              className="h-1.5 flex-1 rounded-full"
              style={{
                background:
                  id === stage.id
                    ? "var(--ws-color)"
                    : l.id === stage.level
                      ? "color-mix(in srgb, var(--ws-color) 35%, var(--color-card))"
                      : "color-mix(in srgb, var(--ws-color) 12%, var(--color-card))",
              }}
            />
          ))}
        </div>
      ))}
    </div>
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
