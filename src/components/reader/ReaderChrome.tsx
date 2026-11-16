"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  BackIcon,
  ChevronDown,
  HeadphonesIcon,
  Icon,
  CloseIcon,
  ShareIcon,
  TocIcon,
} from "@/components/shell/icons";
import type { ReadingSide } from "@/lib/bookLanguage";
import { HIGHLIGHT_COLOURS, type HighlightColour } from "@/lib/storage";

/**
 * **The reader's chrome, drawn from the finished comps.**
 *
 * Pulled out of `Reader.tsx` before the comps were applied, and for that
 * reason: the file is 1700 lines, of which the designer's screens touch about
 * 150 — a top bar, a bottom bar and a selection bar. Leaving them in there
 * meant every future comp revision opened the file that also holds TTS
 * follow-along, gesture handling and the page model.
 *
 * These are deliberately dumb. No state, no effects, no store access — the
 * reader still owns all of that and hands the answers down. That is what makes
 * the extraction a behaviour no-op and what keeps the next redesign a diff
 * against three small files.
 */

/** shared: a bordered square button — the comps' Aa and back */
/** "Aa": the reader's type button, drawn in the UI face rather than as an icon. */
function AaGlyph() {
  return (
    <span aria-hidden className="text-base font-semibold leading-none tracking-tight">
      A<span className="text-sm">a</span>
    </span>
  );
}

function SquareBtn({
  onClick,
  href,
  label,
  children,
}: {
  onClick?: () => void;
  href?: string;
  label: string;
  children: React.ReactNode;
}) {
  const cls =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-(--reader-rule) transition-colors active:bg-current/10";
  return href ? (
    <Link href={href} aria-label={label} title={label} className={cls}>
      {children}
    </Link>
  ) : (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={cls}>
      {children}
    </button>
  );
}

/**
 * Top bar: back · what you are reading · Aa · Assistant.
 *
 * Left-aligned, not centred, as drawn — the chapter name is long Devanagari
 * and centring it between two buttons wasted the width it needed.
 *
 * **The Assistant button is the accent-filled one**, and that is deliberate on
 * the designer's part: it searches Paribhasha and the books today and becomes
 * the chat feature later, and it is in the reader's top bar now so that
 * reaching for it becomes a habit before there is anything more to reach for.
 *
 * The "Pages" link is ours, not the comps'. A **text edition** is a library
 * document that reads like a book, and this is its one way back to the scanned
 * pages it was derived from; the comps do not draw it because they draw an
 * ordinary book, and dropping it would strand exactly the readers who have the
 * least other way around.
 */
export function ReaderTopBar({
  hidden,
  backHref,
  backLabel,
  title,
  meta,
  progress,
  pagesHref,
  onType,
  assistantHref,
}: {
  hidden: boolean;
  backHref: string;
  backLabel: string;
  /** the chapter, or the book when there is no chapter yet */
  title: string;
  /** "Chapter 3 · Page 19 : 3 / 19" */
  meta: React.ReactNode;
  /** 0–1; the hairline under the bar */
  progress: number;
  /** a text edition's way back to the scanned pages, when there is one */
  pagesHref?: string;
  onType: () => void;
  assistantHref: string;
}) {
  return (
    <div
      data-reader-chrome
      data-hidden={hidden}
      className="reader-chrome reader-chrome-top fixed inset-x-0 top-0 z-40 bg-(--reader-bg) pt-[env(safe-area-inset-top)] lg:hidden"
    >
      {/* A fixed 16px gutter, not `.reader-content`. The bar used to be laid
          out on the reading measure, which meant its controls moved whenever
          the reader did: the margin presets set `--reader-pad` to 12, 16 or
          28px, so changing the text's margins walked the back button across the
          screen — and on a wide window the whole bar pulled in to the 40rem
          column and left its own corners empty. The chrome is the app's, not
          the page's; it stays put while the page reflows under it. */}
      <div className="flex items-center gap-2 px-4 py-2">
        <SquareBtn href={backHref} label={backLabel}>
          <BackIcon className="h-5 w-5" />
        </SquareBtn>

        {/* `hi-tight` on the book, and that is what closes the gap rather than
            any margin: `leading-tight` was declared here and never applied,
            because `.hi` fixes Devanagari at 1.85 and outranks it, so a 17px
            title carried 31px of line box and pushed the chapter away from
            it. */}
        <div className="min-w-0 flex-1">
          {/* The page's h1 (15 Nov 2026) — the reader had none. Same look as
              the <p> it replaces; the desktop bar carries its own, sr-only. */}
          <h1 lang="hi" className="hi hi-tight truncate text-title font-semibold">
            {title}
          </h1>
          <p className="hi-tight truncate text-xs text-(--reader-ink-soft)">{meta}</p>
        </div>

        {pagesHref && (
          <Link
            href={pagesHref}
            title="Read the original pages"
            aria-label="Read the original pages"
            className="flex h-11 shrink-0 items-center rounded-control border border-(--reader-rule) px-3 text-xs font-semibold active:bg-current/10"
          >
            Pages
          </Link>
        )}

        {/* The palette, the same mark the app bar carries for the same sheet's
            worth of choices. This was "Aa" on the argument that the reader's
            button really is the type control — but it has not been only that
            for a while: behind it are the six reading surfaces, the typeface,
            the layout and the margins as well as the size. One glyph for
            "how this looks", in the book and in the shell. */}
        {/* "Aa" again, in letters (16 Nov 2026, UX audit RD3). The palette
            said "colours" to a reader looking for bigger letters, and the
            commonest wish of this audience is exactly that; the sheet it opens
            starts with Text size. The paper and the rest are still in it. */}
        <SquareBtn onClick={onType} label="Text size and reading settings">
          <AaGlyph />
        </SquareBtn>

        <Link
          href={assistantHref}
          aria-label="Assistant — search Paribhasha and the books"
          title="Assistant"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-white transition-opacity active:opacity-80"
          style={{ background: "var(--ws-color)" }}
        >
          <Icon name="assistant" className="h-5 w-5" />
        </Link>
      </div>

      {/* The hairline sits under the bar in the comps rather than at the foot
          of the screen, which is also where it belongs: it measures the
          chapter, and the chapter's name is the thing directly above it. */}
      <div className="h-0.5 bg-(--reader-rule)" aria-hidden>
        <div
          className="h-full transition-[width] duration-200"
          style={{
            width: `${Math.min(100, Math.max(0, progress * 100))}%`,
            background: "var(--ws-ink)",
          }}
        />
      </div>
    </div>
  );
}

export interface LanguageToggle {
  side: ReadingSide;
  /** native names — "हिन्दी", "English", "ಕನ್ನಡ" */
  originalLabel: string;
  translatedLabel: string;
  onChange: (side: ReadingSide) => void;
}

/**
 * **हिन्दी | English — which side of a bilingual edition you are reading.**
 *
 * Two of the translations are facing-page print editions: a page of Hindi,
 * then the same page again in English or Kannada, for two hundred pages. On
 * paper that is the whole point and you simply look at the page you want. In a
 * reader that scrolls one page after another it means reading everything
 * twice, and this is the control that stops it.
 *
 * **In the chrome rather than in the settings sheet**, unlike every other
 * reading preference. The sheet holds the things a reader sets once — the
 * paper, the face, the margins. Which language you are reading is not that: it
 * is the same question the shelf's own tabs answer, asked of one book, and a
 * reader comparing a passage against its Hindi will ask it repeatedly. Behind
 * the palette button it would have been three taps each time.
 *
 * It rides inside the bottom bar's own fixed block, directly above the row
 * that holds the page number, so it hides and returns with the rest of the
 * chrome instead of being a second thing floating over the page. Down here
 * rather than up top because it is a control rather than a label: the thumb
 * is already at this end of the phone, holding the two other things a reader
 * reaches for mid-chapter — the contents, and the page they want.
 *
 * The selected side is the accent filled with white on it, which is how every
 * other "which of these am I looking at" control in the app reads — see
 * `SEGMENT_ON` in `ui/Segmented.tsx`. It cannot use that component: this one
 * sits on the book's paper rather than on the app's surface, so its track and
 * its unselected ink are the reader's tokens, which change with the chosen
 * surface while the app's do not.
 */
function ReaderLanguageBar({
  side,
  originalLabel,
  translatedLabel,
  onChange,
}: LanguageToggle) {
  const seg =
    "flex min-h-11 flex-1 items-center justify-center rounded-control px-3 text-sm transition-colors";
  return (
    /* Even padding top and bottom. It was `pb-2` alone while this hung under
       the top bar, where the bar's own row supplied the space above; sitting
       on the bottom bar it has a hairline above it instead and has to make
       its own. */
    <div className="px-4 py-2">
      <div
        role="radiogroup"
        aria-label="Reading language"
        className="flex items-stretch gap-1 rounded-control border border-(--reader-rule) p-1"
      >
        {/* The original on the left, always, whichever side is selected and
            whatever the translation happens to be. It is the fixed point: the
            Hindi is the same book behind all of these, so a reader moving
            between the English JVEP and the Kannada one finds it in the same
            place both times. Ordering by which side is currently being read
            would have moved it. */}
        {(
          [
            ["original", originalLabel],
            ["translated", translatedLabel],
          ] as const
        ).map(([value, label]) => {
          const on = side === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(value)}
              className={`${seg} ${on ? "font-semibold text-white" : "text-(--reader-ink-soft)"}`}
              style={on ? { background: "var(--ws-color)" } : undefined}
            >
              {/* the label is the language, so it is set in that language's
                  own script — `hi` carries the Devanagari face */}
              <span lang={label === "हिन्दी" ? "hi" : undefined}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Bottom bar: contents · where you are · listen.
 *
 * Three controls where there were five. The type button moved up to the top
 * bar, and **the bookmark button is gone at the designer's decision** — a
 * position saved with no words attached turned out to be the thing nobody
 * came back for, and selecting a passage now offers the two things they do:
 * paint it, or write against it.
 */
export function ReaderBottomBar({
  hidden,
  bottom,
  position,
  onContents,
  onMark,
  onPosition,
  onListen,
  canListen,
  listening,
  deviceFallback,
  languages,
}: {
  hidden: boolean;
  bottom: string;
  /**
   * Select the passage at the top of the page and open the highlight / note /
   * share bar — the button a press-and-hold otherwise stands in for. See the
   * button below. Absent where the reader's own touch selection is off.
   */
  onMark?: () => void;
  /** "30 / 178" */
  position: string;
  onContents: () => void;
  /**
   * Opens "Go to printed page". Absent where there is no printed page to go
   * to, and then the readout stays a readout — a control that does nothing
   * when pressed is worse than a label.
   */
  onPosition?: () => void;
  onListen: () => void;
  canListen: boolean;
  listening: boolean;
  /** no recorded audio — this device's own voice would read it */
  deviceFallback: boolean;
  /** the two sides of a bilingual edition; absent on every other book */
  languages?: LanguageToggle;
}) {
  return (
    <div
      data-reader-chrome
      data-hidden={hidden}
      /* The safe-area inset is padding here, not an offset: a docked bar goes
         to the floor and lets the home indicator sit on its own ground. Lifted
         by the inset instead — which is what it used to be — it left a strip of
         moving text under it on every iPhone.

         (Described in words rather than by writing the utility out here:
         Tailwind scans comments as well as code, so a class name spelt in a
         comment with an ellipsis inside its brackets is emitted as a real rule
         — and an elided CSS function does not parse. It cost a build.) */
      className="reader-chrome reader-chrome-bottom fixed inset-x-0 z-40 border-t border-(--reader-rule) bg-(--reader-bg) pb-[env(safe-area-inset-bottom)] lg:hidden"
      style={{ bottom }}
    >
      {/* Above the row with the page number in it, and under its own hairline
          — the two are different questions and the rule is what says so. This
          one chooses the edition; the row below moves about inside it. */}
      {languages && (
        <div className="border-b border-(--reader-rule)">
          <ReaderLanguageBar {...languages} />
        </div>
      )}

      {/* The same fixed 16px gutter as the top bar, and for the same reason —
          see `ReaderTopBar`. The two bars frame the page between them, so a
          reader who widens the margins would otherwise watch the bottom row
          step inward while the top row stayed put. */}
      <div className="flex items-center gap-2 px-4 py-1.5">
        {/* `data-marks-anchor`: on a phone, highlights and notes are a tab
            of the Contents sheet, so the first-save coach mark points here. */}
        <span data-marks-anchor className="flex shrink-0 rounded-control">
          <SquareBtn onClick={onContents} label="Contents">
            <TocIcon className="h-5 w-5" />
          </SquareBtn>
        </span>
        {/* Mark a passage (15 Nov 2026, UX audit IN9). On a touch screen the
            book's text is selected by a 450ms press and hold that nothing on
            screen announced, and highlight, note, share, copy and report all
            waited behind it. This is the visible way in: it takes the passage
            on the reading line — the one Resume would return to — and opens
            the same bar a press and hold does. Beside Contents, under the
            thumb, because that is where its results are kept. */}
        {onMark && (
          <SquareBtn onClick={onMark} label="Mark a passage">
            <Icon name="highlights" className="h-5 w-5" />
          </SquareBtn>
        )}

        {/* The comps put this in its own sunk field rather than loose on the
            bar — it is a readout, and a readout that looks like a label gets
            read as one. It is also the way to jump: a reader who is looking at
            "30 / 178" and wants page 142 is already pressing the number, and
            the alternative was Aa → Go to printed page, two taps into a sheet
            about type. */}
        {onPosition ? (
          <button
            type="button"
            onClick={onPosition}
            aria-label={`${position} — go to a printed page`}
            className="flex h-11 min-w-0 flex-1 items-center justify-center rounded-control border border-(--reader-rule) px-3 text-sm font-medium tabular-nums transition-colors active:bg-current/10"
          >
            <span className="truncate">{position}</span>
          </button>
        ) : (
          <span className="flex h-11 min-w-0 flex-1 items-center justify-center rounded-control border border-(--reader-rule) px-3 text-sm font-medium tabular-nums">
            <span className="truncate">{position}</span>
          </span>
        )}

        {canListen ? (
          /* Filled like the Assistant button at the top — the designer's
             call, 13 Oct 2026: the two things the reader can *do* beyond
             reading wear the accent, and the rest of the chrome is outline. */
          <button
            type="button"
            onClick={onListen}
            aria-label={
              deviceFallback
                ? "Listen with your phone’s voice — no recording of this chapter"
                : "Listen to this chapter"
            }
            aria-pressed={listening}
            title={deviceFallback ? "Listen · your phone’s voice" : "Listen"}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-white transition-opacity active:opacity-80"
            style={{ background: "var(--ws-color)" }}
          >
            <span className="relative">
              {/* Headphones here, waveform elsewhere — and the split is the
                  rule, not an oversight. A glyph standing for an audio *file*
                  is the wave (the A/V shelf, its facets, its resume row); the
                  headphones are for listening as an act, which is what this
                  button offers and what the A/V tab's nav glyph promises. */}
              <HeadphonesIcon className="h-5 w-5" />
              {deviceFallback && (
                <span
                  aria-hidden
                  className="absolute -end-1 -top-0.5 h-1.5 w-1.5 rounded-full bg-white/70"
                />
              )}
            </span>
          </button>
        ) : (
          <span className="h-11 w-11 shrink-0" aria-hidden />
        )}
      </div>
    </div>
  );
}

const SWATCH: Record<HighlightColour, string> = {
  amber: "bg-hl-amber",
  sage: "bg-hl-sage",
  sky: "bg-hl-sky",
};

/** the colours carry no meaning — the designer was explicit — so they are
 *  announced by the only thing true about them */
const SWATCH_LABEL: Record<HighlightColour, string> = {
  amber: "Highlight in amber",
  sage: "Highlight in green",
  sky: "Highlight in blue",
};

/**
 * The bar that appears over a selection.
 *
 * Dark in every reading surface, as drawn. It is the one piece of chrome that
 * sits *on top of* the page rather than beside it, and a bar in the page's own
 * colours reads as part of the page — which is how a reader ends up unsure
 * what the buttons apply to.
 *
 * The three colours come first because painting is now what saving is: the
 * bookmark button is gone from the bottom bar, and a highlight is a bookmark
 * with a colour in the store. Note · Share · Copy are the comps' three. What
 * follows them is ours and conditional — Paribhasha only when the glossary
 * actually has the word, ▶ Listen only when there is audio — so the common case
 * is the four the comps draw.
 */
export function SelectionBar({
  bottom,
  onHighlight,
  onNote,
  onShare,
  onCopy,
  onReport,
  onDismiss,
  onParibhasha,
  onPlayHere,
}: {
  bottom: string;
  onHighlight: (c: HighlightColour) => void;
  onNote: () => void;
  onShare: () => void;
  onCopy: () => void;
  onReport: () => void;
  onDismiss: () => void;
  /** only when the glossary can define the selected word */
  onParibhasha?: () => void;
  /** only when this chapter can be listened to */
  onPlayHere?: () => void;
}) {
  return (
    <div
      data-reader-chrome
      role="toolbar"
      aria-label="Selection actions"
      // Its own dark surface, fixed in every theme — see above.
      //
      // Two rows on a phone, one from `sm` up (14 Nov 2026). As a single
      // scrolling pill it needed 449px — 627 with Paribhasha and Listen — so on
      // a 360px phone Report and the ✕ were off the right edge with nothing to
      // say the bar scrolled. Now the colours and the ✕ hold the first row,
      // the actions wrap under them, and nothing is ever out of sight. A pill
      // cannot be two rows tall, so the phone shape is the card radius.
      className="fixed inset-x-2 z-50 mx-auto flex w-fit max-w-[calc(100vw-1rem)] flex-col rounded-card bg-overlay p-1.5 text-white shadow-raised sm:flex-row sm:items-center sm:gap-1 sm:rounded-full sm:px-2"
      // Above the reader's own bar, and above the audio pill when one is
      // floating there too — `--player-float-h` is that pill's height, and 0
      // whenever nothing is playing. Two things that both float in this corner
      // have to know about each other; nothing else does.
      style={{ bottom: `calc(${bottom} + 3.75rem + var(--player-float-h, 0px))` }}
    >
      <div className="flex items-center gap-1">
        {HIGHLIGHT_COLOURS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onHighlight(c)}
            aria-label={SWATCH_LABEL[c]}
            title={SWATCH_LABEL[c]}
            /* A 44px target around a 32px dot: painting a passage is the most
               repeated act in the reader, and the dot alone was under the
               floor. The dot keeps its size, so the bar reads as it did. */
            className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          >
            <span
              aria-hidden
              className={`h-8 w-8 rounded-full ring-1 ring-white/25 transition-transform group-active:scale-90 ${SWATCH[c]}`}
            />
          </button>
        ))}
        <span className="ms-auto sm:hidden">
          <SelectionAction onClick={onDismiss} ariaLabel="Dismiss">
            <CloseIcon className="h-4 w-4" />
          </SelectionAction>
        </span>
      </div>

      <span aria-hidden className="my-1 h-px w-full shrink-0 bg-white/20 sm:mx-1 sm:my-0 sm:h-6 sm:w-px" />

      <div className="flex flex-wrap items-center sm:flex-nowrap">
        <SelectionAction onClick={onNote}>Note</SelectionAction>
        <SelectionAction onClick={onShare}>
          <ShareIcon className="h-4 w-4" />
          Share
        </SelectionAction>
        <SelectionAction onClick={onCopy}>Copy</SelectionAction>

        {onParibhasha && <SelectionAction onClick={onParibhasha}>Paribhasha</SelectionAction>}
        {onPlayHere && <SelectionAction onClick={onPlayHere}>▶ Listen</SelectionAction>}
        <SelectionAction onClick={onReport} ariaLabel="Report a problem with this passage">
          Report
        </SelectionAction>
        <span className="hidden sm:inline-flex">
          <SelectionAction onClick={onDismiss} ariaLabel="Dismiss">
            <CloseIcon className="h-4 w-4" />
          </SelectionAction>
        </span>
      </div>
    </div>
  );
}

function SelectionAction({
  onClick,
  children,
  ariaLabel,
}: {
  onClick: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2 text-sm font-medium transition-colors active:bg-white/15 sm:px-3"
    >
      {children}
    </button>
  );
}

/**
 * **The desktop reader's one bar** (Reader, desktop revision, 3 Oct 2026).
 *
 * A phone splits the chrome between a top and a bottom bar because the thumb
 * lives at the bottom; a desktop has a pointer and a window's width, so it all
 * goes in one row:
 *
 *     back · [contents | highlights 3]  ·  book / अध्याय 1 · पृष्ठ 1 / 110 ▾  ·  palette · Listen · Assistant
 *
 * The Assistant square is the phone top bar's, filled the same way and for the
 * same reason (see `ReaderTopBar`). The first desktop bar left it out, which
 * took the reader's one door to the Assistant away from every wide screen.
 *
 * It comes and goes as the phone's bars do — away as the page scrolls on, back
 * on a click anywhere in it — rather than staying up behind a focus mode (the
 * designer's call, 3 Oct 2026). A docked panel holds it up; see the reader.
 */
export function ReaderDesktopBar({
  hidden,
  backHref,
  backLabel,
  book,
  where,
  progress,
  pagesHref,
  highlightCount,
  panel,
  onContents,
  onHighlights,
  onWhere,
  goto,
  onSettings,
  settingsOpen,
  onListen,
  canListen,
  listening,
  deviceFallback = false,
  languages,
  assistantHref,
}: {
  hidden: boolean;
  backHref: string;
  backLabel: string;
  /** the book's title, small, over the position */
  book: string;
  /** "अध्याय 1 · पृष्ठ 1 / 110" */
  where: React.ReactNode;
  progress: number;
  pagesHref?: string;
  /** this book's highlights — the count on the pencil */
  highlightCount: number;
  /** which side panel is open, for the lit button */
  panel: "contents" | "highlights" | "notes" | null;
  onContents: () => void;
  onHighlights: () => void;
  /** the position itself — "Go to printed page" (the chapters on a digital book) */
  onWhere: () => void;
  /** print editions: the popover under the position that "onWhere" opens */
  goto?: { open: boolean; pageCount?: number | null; onGo: (n: number) => void; onClose: () => void };
  onSettings: () => void;
  settingsOpen: boolean;
  onListen: () => void;
  canListen: boolean;
  listening: boolean;
  /** no recorded audio — this computer's own voice would read it */
  deviceFallback?: boolean;
  languages?: LanguageToggle;
  assistantHref: string;
}) {
  const seg = (on: boolean) =>
    `flex h-9 min-w-9 items-center justify-center gap-1 rounded-md px-2 text-xs font-bold transition-colors ${
      on ? "" : "hover:bg-current/5"
    }`;
  const lit = {
    background: "color-mix(in srgb, var(--ws-color) 12%, transparent)",
    color: "var(--ws-ink)",
  };
  return (
    <div
      data-reader-chrome
      data-hidden={hidden}
      className="reader-chrome reader-chrome-top fixed inset-x-0 top-0 z-40 hidden bg-(--reader-bg) lg:block"
    >
      <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-(--reader-rule) px-5">
        <div className="flex min-w-0 items-center gap-2">
          <SquareBtn href={backHref} label={backLabel}>
            <BackIcon className="h-5 w-5" />
          </SquareBtn>
          {/* Two doors into the same side panel, in one bordered group: the
              book's map, and what the reader has marked in it. */}
          <div className="flex items-center gap-0.5 rounded-control border border-(--reader-rule) p-0.5">
            <button
              type="button"
              onClick={onContents}
              aria-label="Contents"
              aria-pressed={panel === "contents"}
              title="Contents"
              className={seg(panel === "contents")}
              style={panel === "contents" ? lit : undefined}
            >
              <TocIcon className="h-4.5 w-4.5" />
            </button>
            <span data-marks-anchor className="flex rounded-control">
              <button
                type="button"
                onClick={onHighlights}
                aria-label={`Highlights and notes, ${highlightCount}`}
                aria-pressed={panel === "highlights" || panel === "notes"}
                title="Highlights & notes"
                className={seg(panel === "highlights" || panel === "notes")}
                style={panel === "highlights" || panel === "notes" ? lit : undefined}
              >
                <Icon name="highlights" className="h-4 w-4" />
                {highlightCount > 0 && <span className="tabular-nums">{highlightCount}</span>}
              </button>
            </span>
          </div>
          {languages && (
            <div className="w-56 [&>div]:p-0">
              <ReaderLanguageBar {...languages} />
            </div>
          )}
        </div>

        <div className="relative min-w-0">
          {/* The page's h1 at desktop width (15 Nov 2026). The phone bar's h1
              is display:none here, and the visible book name sits inside the
              "Go to a page" button, where a heading cannot go. */}
          <h1 lang="hi" className="sr-only">
            {book}
          </h1>
          <button
            type="button"
            onClick={goto?.open ? goto.onClose : onWhere}
            aria-label="Go to a page"
            aria-expanded={goto ? goto.open : undefined}
            title="Go to a page"
            className="flex min-h-11 min-w-0 max-w-[32rem] items-center gap-2 rounded-control px-3 text-center transition-colors hover:bg-current/5"
          >
            <span className="min-w-0">
              <span lang="hi" className="hi hi-tight block truncate text-xs text-(--reader-ink-soft)">
                {book}
              </span>
              <span className="hi-tight block truncate text-sm font-semibold">{where}</span>
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-(--reader-ink-soft) transition-transform ${goto?.open ? "rotate-180" : ""}`}
            />
          </button>
          {goto?.open && <GoToPopover {...goto} />}
        </div>

        <div className="flex items-center justify-end gap-2">
          {pagesHref && (
            <Link
              href={pagesHref}
              title="Read the original pages"
              className="flex h-11 shrink-0 items-center rounded-control border border-(--reader-rule) px-3 text-xs font-semibold hover:bg-current/5"
            >
              Pages
            </Link>
          )}
          <button
            type="button"
            onClick={onSettings}
            aria-label="Text size and reading settings"
            aria-pressed={settingsOpen}
            title="Text size and reading settings"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-(--reader-rule) transition-colors hover:bg-current/5"
            style={settingsOpen ? lit : undefined}
          >
            <AaGlyph />
          </button>
          {canListen && (
            <button
              type="button"
              onClick={onListen}
              title={deviceFallback ? "Listen · your computer’s voice" : undefined}
              className="flex h-11 shrink-0 items-center gap-2 rounded-control px-4 text-sm font-semibold transition-opacity hover:opacity-90"
              style={
                listening
                  ? { ...lit, border: "1px solid color-mix(in srgb, var(--ws-color) 30%, transparent)" }
                  : { background: "var(--ws-color)", color: "white" }
              }
            >
              {/* The same dot the phone's 🎧 wears, and Audio Mode's voice
                  chip explains: this chapter would be read by the computer's
                  own voice, there being no recording yet. */}
              <span className="relative">
                <HeadphonesIcon className="h-4.5 w-4.5" />
                {deviceFallback && (
                  <span
                    aria-hidden
                    className="absolute -end-1 -top-0.5 h-1.5 w-1.5 rounded-full bg-current opacity-70"
                  />
                )}
              </span>
              Listen
            </button>
          )}
          <Link
            href={assistantHref}
            aria-label="Assistant — search Paribhasha and the books"
            title="Assistant"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--ws-color)" }}
          >
            <Icon name="assistant" className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* The chapter, as a line under the bar. */}
      <div className="h-0.5" aria-hidden>
        <div
          className="h-full transition-[width] duration-200"
          style={{
            width: `${Math.min(100, Math.max(0, progress * 100))}%`,
            background: "var(--ws-color)",
          }}
        />
      </div>
    </div>
  );
}

/**
 * "Go to printed page", as a popover hanging from the position it changes —
 * the desktop's version of the phone's sheet (designer's comp, 3 Oct 2026).
 * A click outside it or Escape puts it away; Enter goes.
 */
function GoToPopover({
  pageCount,
  onGo,
  onClose,
}: {
  pageCount?: number | null;
  onGo: (n: number) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      // the trigger toggles it itself; everything else outside closes it
      const t = e.target as Node;
      if (!ref.current?.parentElement?.contains(t)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const n = Number(value);
  const valid = n > 0 && (!pageCount || n <= pageCount);

  return (
    <form
      ref={ref}
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onGo(n);
      }}
      className="absolute left-1/2 top-full z-10 mt-2 w-72 -translate-x-1/2 rounded-card border border-(--reader-rule) bg-(--reader-bg) p-4 text-left shadow-raised"
    >
      <div className="mb-3 flex items-baseline justify-between">
        <label htmlFor="bar-goto" className="text-sm font-semibold">
          Go to printed page
        </label>
        {pageCount ? (
          <span className="text-xs tabular-nums text-(--reader-ink-soft)">1–{pageCount}</span>
        ) : null}
      </div>
      <div className="flex gap-2">
        <input
          id="bar-goto"
          autoFocus
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
          placeholder="e.g. 42"
          className="h-11 min-w-0 flex-1 rounded-control border border-(--reader-rule) bg-transparent px-3 text-sm tabular-nums outline-none focus:border-(--ws-ink)"
        />
        <button
          type="submit"
          disabled={!valid}
          className="h-11 shrink-0 rounded-control px-4 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
          style={{ background: "var(--ws-color)" }}
        >
          Go
        </button>
      </div>
    </form>
  );
}
