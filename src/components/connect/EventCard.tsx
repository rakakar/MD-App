import Link from "next/link";
import { CalendarChipIcon, PinIcon } from "@/components/shell/icons";
import { ctaPrimary } from "@/components/ui";
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

/** "Completed" / "Recording available" — the grey pill beside the chip once an
 *  event is over. Never derived here: the API says which, or says nothing. */
export function EventBadge({ badge }: { badge: string }) {
  if (!badge) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-inset px-3 py-1.5 text-sm font-medium text-ink-soft">
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
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-inset text-xs font-semibold text-ink-soft"
    >
      {initials}
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
      <div className="ps-5 pe-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryChip category={event.category} />
          <EventBadge badge={event.badge} />
        </div>

        {/* `hi-tight` because `.hi` is unlayered and beats every leading
            utility — at 1.85 a two-line Devanagari title opens a hole under
            the chip. The Latin case gets `leading-snug`, where no `.hi` rule
            is in play to outrank it. */}
        <h3
          {...t}
          className={`${t.className} ${
            t.lang === "hi" ? "hi-tight" : "font-display leading-snug"
          } mt-3 text-[1.3125rem] font-semibold`}
        >
          <Link href={href} className="after:absolute after:inset-0 hover:underline">
            {event.title}
          </Link>
        </h3>

        {(event.prabodhak || event.language?.name) && (
          <div className="mt-3 flex items-center gap-2.5">
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

        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
          {dates && (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden style={{ color: "var(--ws-ink)" }}>
                <CalendarChipIcon className="h-4 w-4" />
              </span>
              {dates}
            </span>
          )}
          {event.location && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <span aria-hidden className="shrink-0" style={{ color: "var(--ws-ink)" }}>
                <PinIcon />
              </span>
              <span className="truncate">{event.location}</span>
            </span>
          )}
        </p>

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
        <div className="relative z-10 mt-4 flex items-stretch gap-2.5">
          <span
            aria-hidden
            className={`${ctaPrimary} pointer-events-none flex-1`}
            style={{ background: "var(--ws-color)" }}
          >
            View Details
          </span>
          <EventShare title={event.title} path={href} />
        </div>
      </div>
    </article>
  );
}
