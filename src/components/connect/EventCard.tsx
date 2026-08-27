import Link from "next/link";
import {
  CalendarChipIcon,
  ChevronRight,
  LanguageIcon,
  PinIcon,
} from "@/components/shell/icons";
import {
  badgeLabel,
  cardDateRange,
  categoryStyle,
  type EventCard as EventCardData,
} from "@/lib/events";
import { contentLang } from "@/lib/script";
import { EventShare } from "./EventShare";

/**
 * The chip that names a shivir's category, in the category's own colour.
 *
 * `label` is what it prints, and the two screens want different things. The
 * detail screen takes the API's `display` — "E · Adhyayan Abhyas Shivir" —
 * because there it is the one place the category is named and the letter is
 * part of how these are referred to. The card passes `name`: the letter is
 * shorthand for a taxonomy nobody is navigating from a list, and on a chip
 * that already has a colour it was two prefixes deep before the words started.
 *
 * Reads `--cat-ink` / `--cat-tint` off `categoryStyle`, so it does not know
 * what the seven colours are.
 */
export function CategoryChip({
  category,
  label,
  size = "md",
  className = "",
}: {
  category: EventCardData["category"];
  /** defaults to the API's assembled `display` */
  label?: string;
  /**
   * `sm` is the card's, and it is a fit rather than a preference: at `md` the
   * longest real category — "Adhyayan Abhyas Vidhi Shivir" — plus the language
   * beside it came to 314px of the 291 a 375px phone leaves, so the pair wrapped
   * onto a second line and cost the card 38px of height. 13px is the app's
   * floor, not a squeeze below it, and the alternative was truncating a name
   * the colour alone would then have to carry.
   */
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      // The tint and the ink are declared and read on the same element, so the
      // chip carries its own colour wherever it is drawn and nothing above it
      // has to know a category exists.
      style={{
        ...categoryStyle(category.accent),
        background: "var(--cat-tint)",
        color: "var(--cat-ink)",
      }}
      className={`inline-flex items-center rounded-full font-semibold ${
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"
      } ${className}`}
    >
      {label ?? category.display}
    </span>
  );
}

/** "Completed" / "Recording available" — the grey pill beside the category
 *  chip. Never derived here: the API says which, or says nothing. */
export function EventBadge({ badge }: { badge: string }) {
  if (!badge) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-inset px-3 py-1.5 text-sm font-medium text-ink-soft">
      {badgeLabel(badge)}
    </span>
  );
}

/**
 * One fact under the title: a glyph, and the words.
 *
 * Four of these in a two-column grid — who is leading it and where, then when
 * and in what language. The glyphs are the workspace accent rather than the
 * category's: they are the same four glyphs on every card in the list, so
 * colouring them per category would have made a rainbow out of the one part of
 * the card that is identical throughout.
 */
function Meta({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <p className="flex min-w-0 items-center gap-2 text-sm text-ink-soft">
      <span aria-hidden className="shrink-0" style={{ color: "var(--ws-ink)" }}>
        {icon}
      </span>
      <span className="truncate">{children}</span>
    </p>
  );
}

/** The prabodhak's initials, or "M" when the API has resolved the line to
 *  "Multiple". Decoration beside a name that is always printed in full, and
 *  the one glyph in the grid that is a disc rather than a line drawing —
 *  because it holds letters, which need a ground to sit on. */
function Avatar({ initials }: { initials: string }) {
  return (
    <span
      aria-hidden
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-inset text-xs font-semibold text-ink-soft"
    >
      {initials}
    </span>
  );
}

/**
 * One shivir on the list screen.
 *
 * Everything printed on it arrives printable; the date range is the one thing
 * formatted here, and that is formatting rather than derivation — the API
 * sends two ISO dates and the card prints "13 Nov'26 – 19 Nov'26".
 *
 * The four facts sit in a **two-column grid** rather than a stack: they are
 * short, they pair naturally (who and where, when and in what language), and
 * four full-width rows under the title was most of the card's height for
 * content that never fills a line.
 *
 * The stripe down the left edge is the category's tint — the same wash the
 * chip above it wears, so the two read as one fact. It is decoration standing
 * beside a chip that names the same category in words, never the only thing
 * carrying it.
 *
 * The whole card is one link (the title's `after:inset-0` stretches over it),
 * so the one control that is *not* that link — share — has to sit above it,
 * which is what the `relative z-10` on the last row is for.
 */
export function EventCardView({ event }: { event: EventCardData }) {
  const href = `/connect/events/${event.slug}`;
  const t = contentLang(event.title);
  const dates = cardDateRange(event);

  return (
    <article
      style={categoryStyle(event.category.accent)}
      className="relative rounded-card border border-rule bg-card p-4 shadow-card"
    >
      {/* Inset from the corners with its own radius rather than run edge to
          edge: the card is already a rounded rectangle, and a stripe flush to
          its sides had to fake that corner or clip against it. */}
      <span
        aria-hidden
        className="absolute inset-y-4 start-3.5 w-1.5 rounded-full"
        style={{ background: "var(--cat-tint)" }}
      />

      <div className="ps-5">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryChip category={event.category} label={event.category.name} size="sm" />
          {/* The badge when an event has one — a shivir that is over has
              something to say about itself that outranks the rest — and the
              language otherwise. */}
          {event.badge ? (
            <span className="inline-flex items-center rounded-full bg-inset px-2.5 py-1 text-xs font-medium text-ink-soft">
              {badgeLabel(event.badge)}
            </span>
          ) : (
            event.language?.name && (
              <span className="inline-flex items-center rounded-full bg-inset px-2.5 py-1 text-xs font-medium text-ink-soft">
                {event.language.name}
              </span>
            )
          )}
        </div>

        {/* 21px. The title is the thing being chosen between and it outranks
            everything else on the card.

            `hi-tight` because `.hi` is unlayered and beats every leading
            utility — at 1.85 a two-line Devanagari title opens a hole under
            the chips. The Latin case gets `leading-snug`, where no `.hi` rule
            is in play to outrank it. */}
        <h3
          {...t}
          className={`${t.className} ${
            t.lang === "hi" ? "hi-tight" : "font-display leading-snug"
          } mt-2.5 text-[1.3125rem] font-semibold`}
        >
          <Link href={href} className="after:absolute after:inset-0 hover:underline">
            {event.title}
          </Link>
        </h3>

        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
          {event.prabodhak && (
            <p className="flex min-w-0 items-center gap-2 text-sm font-semibold">
              <Avatar initials={event.prabodhak_initials} />
              <span
                {...contentLang(event.prabodhak)}
                className={`${contentLang(event.prabodhak).className} truncate`}
              >
                {event.prabodhak}
              </span>
            </p>
          )}
          {event.location && (
            <Meta icon={<PinIcon className="h-5 w-5" />}>{event.location}</Meta>
          )}
          {dates && (
            <Meta icon={<CalendarChipIcon className="h-5 w-5" />}>{dates}</Meta>
          )}
          {event.language?.name && (
            <Meta icon={<LanguageIcon className="h-5 w-5" />}>{event.language.name}</Meta>
          )}
        </div>

        {/*
          "View details" is a styled span, not a second link. The title's
          `after:inset-0` already makes the whole card the link to this event,
          and a real anchor here would be the same destination announced twice
          — which is what a screen reader would read out, one after the other.
          It is drawn because the comps draw it: on a card of quiet metadata it
          is what says the card opens something.

          Share is a real button and has to sit above the stretched link to be
          pressable at all, which is what the `relative` here is for.
        */}
        <div className="relative z-10 mt-3 flex items-center justify-between gap-2">
          <span
            aria-hidden
            className="pointer-events-none inline-flex items-center gap-0.5 text-sm font-semibold"
            style={{ color: "var(--ws-ink)" }}
          >
            View details
            <ChevronRight />
          </span>
          <EventShare title={event.title} path={href} variant="icon" />
        </div>
      </div>
    </article>
  );
}
