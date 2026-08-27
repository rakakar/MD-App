import Link from "next/link";
import { CalendarChipIcon, ChevronRight, PinIcon } from "@/components/shell/icons";
import {
  badgeLabel,
  categoryStyle,
  eventDates,
  type EventCard as EventCardData,
} from "@/lib/events";
import { contentLang } from "@/lib/script";
import { EventShare } from "./EventShare";

/**
 * The chip that names a shivir's category, in the category's own colour.
 *
 * The detail screen's, which draws it beside the tags. The *card* does not use
 * it any more — there the category is the eyebrow over the title, set in the
 * same ink with no fill behind it, because a filled chip beside a filled date
 * column was two coloured objects competing for one glance.
 *
 * Reads `--cat-ink` / `--cat-tint` off `categoryStyle`, so it does not know
 * what the seven colours are.
 */
export function CategoryChip({
  category,
  className = "",
}: {
  category: EventCardData["category"];
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
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold ${className}`}
    >
      {category.display}
    </span>
  );
}

/** "Completed" / "Recording available" — the grey pill once an event is over.
 *  Never derived here: the API says which, or says nothing. */
export function EventBadge({ badge }: { badge: string }) {
  if (!badge) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-inset px-3 py-1.5 text-sm font-medium text-ink-soft">
      {badgeLabel(badge)}
    </span>
  );
}

/** The card's own smaller pill — same facts, sized for the slot beside a 13px
 *  eyebrow rather than for the detail screen's chip row. */
function CardPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded-full bg-inset px-2.5 py-1 text-xs font-medium text-ink-soft">
      {children}
    </span>
  );
}

/**
 * The disc that fronts the two lines under the title — the prabodhak's
 * initials, and the location's pin.
 *
 * One component rather than two so they cannot drift apart: they sit directly
 * above one another, and a pin that is a few pixels off the avatar's width
 * puts the two lines of text beside them out of alignment, which is visible on
 * a card even when the discs themselves are not being compared.
 *
 * `aria-hidden` on both — the initials repeat a name printed in full beside
 * them, and the pin labels a place that says it is a place.
 */
function RowDisc({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-inset text-xs font-semibold text-ink-soft"
    >
      {children}
    </span>
  );
}

/**
 * **The date column** — the card's one piece of colour.
 *
 * The dates used to be a line of grey metadata under the title, level with the
 * location, which is not what a shivir list is read for: the question is
 * *when*, and it was set in the same ink as everything else. Here it is a
 * column of its own, tinted in the category's colour, holding the calendar
 * glyph, the two dates with a rule running between them, and how many days
 * that comes to.
 *
 * **A floor, not a fixed width.** Down a list the columns have to agree, or
 * every card starts its title at a different place and the left edge of the
 * list goes ragged — content-sized alone, these came out 73, 78 and 83px on
 * three real cards. But pinning the width outright is worse: at 1.4× app text
 * "26 Jul" no longer fits and wraps onto two lines, and this app has that
 * setting. `min-w-20` settles it — every column is 80px until the type inside
 * genuinely needs more, so they line up at the sizes almost everyone reads at
 * and still grow rather than break for the readers who scale up.
 *
 * A single-day shivir gets the date alone, centred, with neither the rule nor
 * the duration pill: there is no span to draw, and "1 day" is what the single
 * date has already said.
 *
 * The tint is `--cat-tint`, the same wash the category chip wears, so the
 * column and the eyebrow above the title read as the same fact. It is never
 * the only thing carrying the category — the eyebrow names it in words.
 */
function DateColumn({ event }: { event: EventCardData }) {
  const d = eventDates(event);
  if (!d) return null;
  const rule = (
    <span
      aria-hidden
      className="my-0.5 h-3 w-px"
      style={{ background: "currentColor", opacity: 0.3 }}
    />
  );
  return (
    <div
      className="flex min-w-20 shrink-0 flex-col items-center justify-center gap-0.5 self-stretch rounded-tile px-3 py-3 text-center"
      style={{ background: "var(--cat-tint)", color: "var(--cat-ink)" }}
    >
      <CalendarChipIcon className="mb-1 h-4 w-4 opacity-70" />
      <span className="whitespace-nowrap text-sm font-bold leading-tight">{d.from}</span>
      {d.to && (
        <>
          {rule}
          <span className="text-xs font-medium opacity-80">to</span>
          {rule}
          <span className="whitespace-nowrap text-sm font-bold leading-tight">{d.to}</span>
        </>
      )}
      {d.days && (
        // `px-1.5`, not `px-2`: a two-digit duration is the widest thing in
        // this column, and at `px-2` "17 days" was 3px wider than the dates
        // above it — which pushed that one card's column past the 80px floor
        // and set its title 3px right of every other card in the list.
        <span className="mt-1.5 whitespace-nowrap rounded-full bg-card/75 px-1.5 py-0.5 text-xs font-semibold">
          {d.days} days
        </span>
      )}
    </div>
  );
}

/**
 * One shivir on the list screen.
 *
 * Everything printed on it arrives printable. The dates are the one thing
 * assembled here, and that is formatting rather than derivation — the API
 * sends two ISO dates and the comps draw them stacked with a duration.
 *
 * Two columns: the date block, and everything said in words. The whole card is
 * one link — the title's `after:inset-0` stretches over it — so the one
 * control that is *not* that link has to sit above it, which is what the
 * `relative z-10` on the last row is for.
 */
export function EventCardView({ event }: { event: EventCardData }) {
  const href = `/connect/events/${event.slug}`;
  const t = contentLang(event.title);

  return (
    <article
      style={categoryStyle(event.category.accent)}
      className="relative flex items-stretch gap-3 rounded-card border border-rule bg-card p-3 shadow-card"
    >
      <DateColumn event={event} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-2">
          {/* The category as an eyebrow rather than a chip — see
              `CategoryChip`. `text-xs` is the app's floor and the tier it
              already uses for a label sitting over the thing it names. */}
          <span
            className="min-w-0 flex-1 text-xs font-bold uppercase leading-snug tracking-[0.06em]"
            style={{ color: "var(--cat-ink)" }}
          >
            {event.category.name}
          </span>
          {/* One pill, top right. The badge when there is one — an event that
              is over has something to say about itself that outranks which
              language it was held in — and the language otherwise. Never both:
              the comps draw one slot, and two pills wrapped the eyebrow onto a
              second line. */}
          {event.badge ? (
            <CardPill>{badgeLabel(event.badge)}</CardPill>
          ) : (
            event.language?.name && <CardPill>{event.language.name}</CardPill>
          )}
        </div>

        {/* 21px, the step this card has always used and the one the comps draw
            — the title is the thing being chosen between, and it outranks
            everything else on the card. (`text-title` is 17px, a *row* title;
            set at that step the card read as a list row with a coloured box
            beside it, which is what was wrong with the first attempt.)

            `hi-tight` because `.hi` is unlayered and beats every leading
            utility — at 1.85 a two-line Devanagari title opens a hole under
            the eyebrow. The Latin case gets `leading-snug`, where no `.hi`
            rule is in play to outrank it. */}
        <h3
          {...t}
          className={`${t.className} ${
            t.lang === "hi" ? "hi-tight" : "font-display leading-snug"
          } mt-0.5 text-[1.3125rem] font-semibold`}
        >
          <Link href={href} className="after:absolute after:inset-0 hover:underline">
            {event.title}
          </Link>
        </h3>

        {event.prabodhak && (
          <div className="mt-1.5 flex items-center gap-2.5">
            <RowDisc>{event.prabodhak_initials}</RowDisc>
            <span
              {...contentLang(event.prabodhak)}
              className={`${contentLang(event.prabodhak).className} min-w-0 flex-1 truncate text-sm font-semibold`}
            >
              {event.prabodhak}
            </span>
          </div>
        )}

        {event.location && (
          <p className="mt-1 flex min-w-0 items-center gap-2.5 text-sm text-ink-soft">
            {/* The pin in the same disc the initials wear, so this line and the
                prabodhak's start at one x. `h-4.5` rather than `PinIcon`'s own
                14px default: inside a 32px disc the small glyph read as a
                speck, and it is the only thing in this row carrying "place". */}
            <RowDisc>
              <span style={{ color: "var(--ws-ink)" }}>
                <PinIcon className="h-4.5 w-4.5" />
              </span>
            </RowDisc>
            <span className="truncate">{event.location}</span>
          </p>
        )}

        {/*
          "View details" is a styled span, not a second link. The title's
          `after:inset-0` already makes the whole card the link to this event,
          and a real anchor here would be the same destination announced twice
          — which is what a screen reader would read out, one after the other.
          It is drawn because the comps draw it: on a card of quiet metadata it
          is what says the card opens something.

          It was a filled accent button, and the comps have it as a text link.
          That is the better reading: the whole card is already the button, so
          a solid slab inside it was a second, smaller invitation to do exactly
          what tapping anywhere would do — and down a list of them the fills
          were most of what the screen was made of.

          `mt-auto` pins this row to the foot of the text column, so it lines
          up with the bottom of the date block beside it however tall the title
          above it turns out to be.

          Share is a real button and has to sit above the stretched link to be
          pressable at all, which is what the `relative` here is for.
        */}
        <div className="relative z-10 mt-auto flex items-center justify-between gap-2 pt-1.5">
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
