"use client";

import Link from "next/link";
import {
  BackIcon,
  HeadphonesIcon,
  Icon,
  PaletteIcon,
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
  languages,
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
  /** the two sides of a bilingual edition; absent on every other book */
  languages?: LanguageToggle;
}) {
  return (
    <div
      data-reader-chrome
      data-hidden={hidden}
      className="reader-chrome reader-chrome-top fixed inset-x-0 top-0 z-40 bg-(--reader-bg)/95 pt-[env(safe-area-inset-top)] backdrop-blur"
    >
      {/* A fixed 16px gutter, not `.reader-content`. The bar used to be laid
          out on the reading measure, which meant its controls moved whenever
          the reader did: the margin presets set `--reader-pad` to 13.6, 21.6 or
          36px, so changing the text's margins walked the back button across the
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
          <p lang="hi" className="hi hi-tight truncate text-title font-semibold">
            {title}
          </p>
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
        <SquareBtn onClick={onType} label="Reading settings">
          <PaletteIcon className="h-5 w-5" />
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

      {languages && <ReaderLanguageBar {...languages} />}

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
 * It rides inside the top bar's own fixed block, so it hides and returns with
 * the rest of the chrome instead of being a second thing floating over the
 * page.
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
    "flex min-h-9 flex-1 items-center justify-center rounded-control px-3 text-sm transition-colors";
  return (
    <div className="px-4 pb-2">
      <div
        role="radiogroup"
        aria-label="Reading language"
        className="flex items-stretch gap-1 rounded-control border border-(--reader-rule) p-1"
      >
        {(
          [
            ["translated", translatedLabel],
            ["original", originalLabel],
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
  onPosition,
  onListen,
  canListen,
  listening,
  deviceFallback,
}: {
  hidden: boolean;
  bottom: string;
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
      className="reader-chrome reader-chrome-bottom fixed inset-x-0 z-40 border-t border-(--reader-rule) bg-(--reader-bg)/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      style={{ bottom }}
    >
      {/* The same fixed 16px gutter as the top bar, and for the same reason —
          see `ReaderTopBar`. The two bars frame the page between them, so a
          reader who widens the margins would otherwise watch the bottom row
          step inward while the top row stayed put. */}
      <div className="flex items-center gap-2 px-4 py-1.5">
        <SquareBtn onClick={onContents} label="Contents">
          <TocIcon className="h-5 w-5" />
        </SquareBtn>

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
          <SquareBtn
            onClick={onListen}
            label={
              deviceFallback
                ? "Listen with this device's voice (no recorded audio yet)"
                : "Listen to this chapter"
            }
          >
            <span className="relative" style={listening ? { color: "var(--ws-ink)" } : undefined}>
              {/* Headphones here, waveform elsewhere — and the split is the
                  rule, not an oversight. A glyph standing for an audio *file*
                  is the wave (the A/V shelf, its facets, its resume row); the
                  headphones are for listening as an act, which is what this
                  button offers and what the A/V tab's nav glyph promises. */}
              <HeadphonesIcon className="h-5 w-5" />
              {deviceFallback && (
                <span
                  aria-hidden
                  className="absolute -end-1 -top-0.5 h-1.5 w-1.5 rounded-full bg-(--reader-ink-soft)"
                />
              )}
            </span>
          </SquareBtn>
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
 * actually has the word, ▶ Here only when there is audio — so the common case
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
      // Its own dark surface, fixed in every theme — see above. The scroll is
      // the honest answer to a bar that can hold four actions or eight: the
      // comps' four are always first.
      className="fixed inset-x-2 z-50 mx-auto flex w-fit max-w-[calc(100vw-1rem)] items-center gap-1 overflow-x-auto rounded-full bg-overlay px-2 py-1.5 text-white shadow-raised"
      // Above the reader's own bar, and above the audio pill when one is
      // floating there too — `--player-float-h` is that pill's height, and 0
      // whenever nothing is playing. Two things that both float in this corner
      // have to know about each other; nothing else does.
      style={{ bottom: `calc(${bottom} + 3.75rem + var(--player-float-h, 0px))` }}
    >
      {HIGHLIGHT_COLOURS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onHighlight(c)}
          aria-label={SWATCH_LABEL[c]}
          title={SWATCH_LABEL[c]}
          className={`h-8 w-8 shrink-0 rounded-full ring-1 ring-white/25 transition-transform active:scale-90 ${SWATCH[c]}`}
        />
      ))}

      <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-white/20" />

      <SelectionAction onClick={onNote}>Note</SelectionAction>
      <SelectionAction onClick={onShare}>
        <ShareIcon className="h-4 w-4" />
        Share
      </SelectionAction>
      <SelectionAction onClick={onCopy}>Copy</SelectionAction>

      {onParibhasha && <SelectionAction onClick={onParibhasha}>Paribhasha</SelectionAction>}
      {onPlayHere && <SelectionAction onClick={onPlayHere}>▶ Here</SelectionAction>}
      <SelectionAction onClick={onReport} ariaLabel="Report a problem with this passage">
        Report
      </SelectionAction>
      <SelectionAction onClick={onDismiss} ariaLabel="Dismiss">
        ✕
      </SelectionAction>
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
      className="inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-medium transition-colors active:bg-white/15"
    >
      {children}
    </button>
  );
}
