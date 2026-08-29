import Link from "next/link";
import { CalendarChipIcon, PinIcon } from "@/components/shell/icons";
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
 * Shared with the detail screen, which draws the same chip a size up beside
 * the tags. Both read `--cat-ink` / `--cat-tint` off `categoryStyle`, so
 * neither knows what the seven colours are.
 */
/**
 * The size every pill in a chip row shares.
 *
 * The rows are mixed — a category, sometimes a badge, sometimes the manager's
 * own tags and the language — and they are read as one row, so one of them
 * sitting a step above the others reads as a mistake rather than as emphasis.
 * Both screens draw such a row, and they want different steps: the card's
 * title is 21px and its chips are labels under it, while the detail screen has
 * a 26px title, a poster above it and the width to carry 15px.
 *
 * So it is a prop rather than a constant, and `CategoryChip` and `EventBadge`
 * take the same one. They were 13px and 15px side by side on the card until
 * now, which is the bug this exists to make hard to reintroduce.
 */
export type ChipSize = "sm" | "md";

const CHIP_SIZE: Record<ChipSize, string> = {
  sm: "px-3 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
};

export function CategoryChip({
  category,
  size = "md",
  className = "",
}: {
  category: EventCardData["category"];
  size?: ChipSize;
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
      className={`inline-flex items-center rounded-full font-semibold ${CHIP_SIZE[size]} ${className}`}
    >
      {category.display}
    </span>
  );
}

/** "Completed" / "Recording available" — the grey pill beside the chip once an
 *  event is over. Never derived here: the API says which, or says nothing. */
export function EventBadge({
  badge,
  size = "md",
}: {
  badge: string;
  size?: ChipSize;
}) {
  if (!badge) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full bg-inset font-medium text-ink-soft ${CHIP_SIZE[size]}`}
    >
      {badgeLabel(badge)}
    </span>
  );
}

/** The prabodhak's initials, or "M" when the API has resolved the line to
 *  "Multiple". Decoration beside a name that is always printed in full. */
function Avatar({ initials }: { initials: string }) {
  return (
    <span
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-inset text-xs font-semibold text-ink-soft"
    >
      {initials}
    </span>
  );
}

/**
 * The 36px column the three marks under the title stand in — the prabodhak's
 * initials, the calendar, the pin.
 *
 * They were each as wide as they happened to be (36, 16, 14) and all flush
 * left, so no two of them shared a centre and the three lines of text beside
 * them started at three different places. Centring each mark in a column the
 * width of the widest fixes both at once: the marks line up down the card, and
 * so does everything written after them.
 *
 * 32px because that is the avatar, which is the one mark here that cannot
 * shrink — it holds two letters.
 */
function Glyph({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className="flex w-8 shrink-0 items-center justify-center"
      style={{ color: "var(--ws-ink)" }}
    >
      {children}
    </span>
  );
}

/**
 * One shivir on the list screen.
 *
 * Everything printed on it arrives printable. The date range is the one thing
 * formatted here, and it is formatting rather than derivation — the API sends
 * two ISO dates and the comps print "13 Nov'26 – 19 Nov'26".
 *
 * The accent stripe down the left edge is the category's raw colour, as drawn.
 * It is decoration standing beside the chip that names the same category in
 * words, so it is never the only thing carrying that fact.
 */
export function EventCardView({ event }: { event: EventCardData }) {
  const href = `/connect/events/${event.slug}`;
  const t = contentLang(event.title);
  const dates = cardDateRange(event);

  return (
    <article
      style={categoryStyle(event.category.accent)}
      className="relative overflow-hidden rounded-card border border-rule bg-card shadow-card"
    >
      <span
        aria-hidden
        className="absolute inset-y-0 start-0 w-1"
        style={{ background: "var(--cat)" }}
      />
      <div className="ps-5 pe-4 py-3.5">
        {/* `sm` on both, so the badge and the category are one row rather
            than two sizes. The card's chips are labels under a 21px title;
            the detail screen's row keeps `md`. */}
        <div className="flex flex-wrap items-center gap-2">
          <CategoryChip category={event.category} size="sm" />
          <EventBadge badge={event.badge} size="sm" />
        </div>

        {/* `hi-tight` because `.hi` is unlayered and beats every leading
            utility — at 1.85 a two-line Devanagari title opens a hole under
            the chip. The Latin case gets `leading-snug`, where no `.hi` rule
            is in play to outrank it. */}
        <h3
          {...t}
          className={`${t.className} ${
            t.lang === "hi" ? "hi-tight" : "font-display leading-snug"
          } mt-2 text-[1.3125rem] font-semibold`}
        >
          <Link href={href} className="after:absolute after:inset-0 hover:underline">
            {event.title}
          </Link>
        </h3>

        {(event.prabodhak || event.language?.name) && (
          <div className="mt-2.5 flex items-center gap-2.5">
            {event.prabodhak && (
              <>
                <Avatar initials={event.prabodhak_initials} />
                <span
                  {...contentLang(event.prabodhak)}
                  className={`${contentLang(event.prabodhak).className} min-w-0 flex-1 truncate text-title font-semibold`}
                >
                  {event.prabodhak}
                </span>
              </>
            )}
            {event.language?.name && (
              <span className="ms-auto shrink-0 rounded-full bg-inset px-3 py-1 text-sm text-ink-soft">
                {event.language.name}
              </span>
            )}
          </div>
        )}

        {/* A row each, rather than both on one wrapping line. They wrapped
            anyway at these lengths, and sharing a line meant the pin sat
            wherever the date happened to end — so the two glyphs could not be
            in a column with the avatar above them. `gap-2.5` is the avatar
            row's own, so all three lines of text start at one x. */}
        <div className="mt-2 flex flex-col gap-1 text-sm text-ink-soft">
          {dates && (
            <p className="flex items-center gap-2.5">
              <Glyph>
                <CalendarChipIcon className="h-4 w-4" />
              </Glyph>
              {dates}
            </p>
          )}
          {event.location && (
            <p className="flex min-w-0 items-center gap-2.5">
              {/* `h-4 w-4`, the calendar's size. `PinIcon`'s own default is
                  14px, which sat visibly smaller than the glyph directly
                  above it. */}
              <Glyph>
                <PinIcon className="h-4 w-4" />
              </Glyph>
              <span className="truncate">{event.location}</span>
            </p>
          )}
        </div>

        {/*
          "View Details" is a styled span, not a second link. The title's
          `after:inset-0` already makes the whole card the link to this event,
          and a real anchor here would be the same destination announced twice
          — which is what a screen reader would read out, one after the other.
          It is drawn because the comps draw it: on a card of quiet metadata it
          is what says the card opens something.

          Share is a real button and has to sit above the stretched link to be
          pressable at all, which is what the `relative` on this row is for.
        */}
        <div className="relative z-10 mt-3 flex items-stretch gap-2.5">
          {/* Outlined, not filled.

              A solid accent slab is the loudest thing the app can put on a
              card, and this one is not carrying its weight: the whole card is
              already the link to the event, so the fill was shouting an
              invitation that tapping anywhere accepts. Down a list of shivirs
              it was also most of what the screen was made of.

              Accent border, accent ink, and the faintest wash of the accent
              behind — the app's own idiom for an outlined control that is
              still the primary one (`Chip` variant `tint`, and the filter
              sheet's mode buttons). That keeps it distinct from Share beside
              it, which is a neutral outline in `rule` and ink. */}
          <span
            aria-hidden
            className="pointer-events-none inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-control border px-5 text-sm font-semibold"
            style={{
              borderColor: "var(--ws-ink)",
              background: "color-mix(in srgb, var(--ws-color) 8%, var(--color-card))",
              color: "var(--ws-ink)",
            }}
          >
            View Details
          </span>
          <EventShare title={event.title} path={href} />
        </div>
      </div>
    </article>
  );
}
