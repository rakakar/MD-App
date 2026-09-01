import Link from "next/link";
import { ChevronRight, InfoIcon, WarningIcon } from "@/components/shell/icons";
import type { CentreNote, NoteTone } from "@/lib/centreNotes";
import { CAUTION_NOTE_URL } from "@/lib/centreNotes";
import { contentLang } from "@/lib/script";

/**
 * The two tones these notes come in, and the one place they are defined.
 *
 * Amber for the caution and the app's own teal for the important one, taken
 * from the comps. Not the workspace accent for either: Connect's teal is what
 * every ordinary control on this screen already wears, and a caution that
 * looked like a button would be the one thing on the page a reader skims past.
 */
const TONE: Record<
  NoteTone,
  { tint: string; ink: string; edge: string; Icon: typeof InfoIcon }
> = {
  caution: {
    tint: "color-mix(in srgb, #b7791f 12%, var(--color-card))",
    ink: "color-mix(in srgb, #b7791f 62%, var(--color-ink))",
    edge: "#b7791f",
    Icon: WarningIcon,
  },
  info: {
    tint: "color-mix(in srgb, #2f6e86 10%, var(--color-card))",
    ink: "color-mix(in srgb, #2f6e86 62%, var(--color-ink))",
    edge: "#2f6e86",
    Icon: InfoIcon,
  },
};

/**
 * The card on the Centres screen that opens a note.
 *
 * Above the contacts banner and below the list, which is the order the comps
 * put them in and the order they should be read in: here is where you could
 * go, here is what to know before you go, and here is who to ask. A caution
 * printed under the way out would be a caution nobody reached.
 *
 * The left edge carries the tone as a bar rather than the whole card carrying
 * it as a fill — two saturated cards stacked would out-shout the list of
 * centres they are about.
 */
export function CentreNoteCard({ note }: { note: CentreNote }) {
  const tone = TONE[note.tone];
  return (
    <Link
      href={`/connect/centres/notes/${note.slug}`}
      className="relative block overflow-hidden rounded-card border border-rule p-4 ps-5 shadow-card transition-shadow hover:shadow-md"
      style={{ background: tone.tint }}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 start-0 w-1"
        style={{ background: tone.edge }}
      />
      <span
        className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.09em]"
        style={{ color: tone.ink }}
      >
        <tone.Icon className="h-4 w-4 shrink-0" />
        {note.eyebrow}
      </span>
      <span className="mt-1.5 block text-title font-semibold leading-snug">
        {note.cardTitle}
      </span>
      <span
        className="mt-2 flex items-center gap-0.5 text-sm font-semibold"
        style={{ color: tone.ink }}
      >
        Read the full note
        <ChevronRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

/**
 * The note itself.
 *
 * Set on the reading measure rather than the shelf's width — this is prose,
 * and `PageContainer`'s `text` size is what every other run of prose in the
 * app is set on.
 *
 * `{{here}}` is the one substitution: both notes point at a caution note
 * published elsewhere whose address has not been given, so until
 * `CAUTION_NOTE_URL` is set the word renders as text. See the note on that
 * constant for why a placeholder link would be worse here than none.
 */
export function CentreNoteBody({ note }: { note: CentreNote }) {
  const tone = TONE[note.tone];
  return (
    <>
      <p
        className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.09em]"
        style={{ color: tone.ink }}
      >
        <tone.Icon className="h-4 w-4 shrink-0" />
        {note.eyebrow}
      </p>
      {/* Both scripts in one title — `ui-hi` switches the stack per glyph. */}
      {/* These two pages are documents rather than screens — nine paragraphs
          across two languages on one of them — so they are set a step up from
          the app's list-and-card sizes throughout: 30px title, 24px section
          headings, and 17px body against the 15px a card uses. That is the
          difference between a page you scan and one you read. */}
      <h1 className="ui-hi mt-2 font-display text-3xl font-medium leading-tight">
        {note.title}
      </h1>

      <div className="mt-5 flex flex-col gap-4">
        {note.blocks.map((b, i) => {
          if (b.kind === "rule") {
            return (
              <p key={i} aria-hidden className="text-center text-lg text-muted">
                ~
              </p>
            );
          }
          if (b.kind === "h") {
            return (
              <h2 key={i} className="mt-3 font-display text-2xl font-medium leading-snug">
                {b.text}
              </h2>
            );
          }
          if (b.kind === "strong") {
            return (
              <p key={i} className="text-title font-semibold leading-relaxed">
                {b.text}
              </p>
            );
          }
          if (b.kind === "callout") {
            return (
              <div
                key={i}
                className="rounded-card p-4"
                style={{ background: tone.tint }}
              >
                <p className="text-title font-semibold leading-relaxed" style={{ color: tone.ink }}>
                  {b.text}
                </p>
                {b.sub && (
                  <p className="mt-2 text-title leading-relaxed" style={{ color: tone.ink, opacity: 0.85 }}>
                    {b.sub}
                  </p>
                )}
              </div>
            );
          }
          return (
            <p
              key={i}
              {...(b.lang === "hi" ? { lang: "hi" } : {})}
              className={`text-title leading-relaxed text-ink-soft ${b.lang === "hi" ? "hi" : ""}`}
            >
              {withHereLink(b.text)}
            </p>
          );
        })}
      </div>
    </>
  );
}

/** Splits a paragraph on `{{here}}` and links that word when there is an
 *  address to link it to. */
function withHereLink(text: string): React.ReactNode {
  if (!text.includes("{{here}}")) return text;
  const [before, after] = text.split("{{here}}");
  const word = /[ऀ-ॿ]/.test(text) ? "यहाँ" : "here";
  if (!CAUTION_NOTE_URL) {
    return (
      <>
        {before}
        {word}
        {after}
      </>
    );
  }
  return (
    <>
      {before}
      <a
        href={CAUTION_NOTE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold underline underline-offset-2"
        style={{ color: "var(--ws-ink)" }}
      >
        {word}
      </a>
      {after}
    </>
  );
}

/** "Read next" — the caution note offers the basis note at its foot, as drawn. */
export function CentreNoteNext({ note }: { note: CentreNote }) {
  const l = contentLang(note.cardTitle);
  return (
    <Link
      href={`/connect/centres/notes/${note.slug}`}
      className="mt-6 flex items-center gap-3 rounded-card border border-rule bg-card p-4 shadow-card transition-shadow hover:shadow-md"
    >
      <span className="min-w-0 flex-1">
        <span {...l} className={`${l.className} block text-sm font-semibold leading-snug`}>
          {note.cardTitle}
        </span>
        <span className="mt-0.5 block text-xs text-ink-soft">Read next</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft" />
    </Link>
  );
}
