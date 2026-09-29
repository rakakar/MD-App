import Link from "next/link";
import type { CSSProperties } from "react";
import { CalendarChipIcon, PinIcon } from "@/components/shell/icons";
import { EventCardView } from "@/components/connect/EventCard";
import { SectionHeading, SeeAll } from "@/components/ui";
import { dayMonth, MONTH_SHORT, parseDay } from "@/lib/dates";
import { cardDateRange, type EventCard } from "@/lib/events";
import { SHIVIRS } from "@/lib/labels";
import { contentLang } from "@/lib/script";

/**
 * Connect's own hue, scoped to one element. `data-ws` is what makes `--ws-ink`
 * re-derive from this `--ws-color` — so the tile's figures get the dark theme's
 * lifted ink like every other workspace ink does, rather than the raw hue at
 * 3:1 on a near-black card.
 */
const CONNECT = { "--ws-color": "var(--color-ws-connect)" } as CSSProperties;
const TINT = "color-mix(in srgb, var(--ws-color) 10%, var(--color-card))";

/**
 * Home's shivir section — the soonest three, or on desktop, the fact that
 * there are none.
 *
 * Two drawings of one list. On a phone it is the rail it has always been, the
 * Connect card in its compact form. On desktop (Home, desktop revision, 29 Sep
 * 2026) it sits beside today's Sutra in the top row, and there a stack of
 * three short rows — a date tile, the name, where and when — is what fits a
 * third of the page: the full card was built for a column twice as wide.
 *
 * Empty, a phone draws nothing, as before. The desktop cannot: this section
 * owns the top-right of the page, and a hole there reads as a page that failed
 * to load. So it says so, and points at Connect, where past shivirs and the
 * centres a reader can call are.
 */
export function UpcomingShivirs({
  shivirs,
  className = "",
}: {
  shivirs: EventCard[];
  className?: string;
}) {
  const empty = shivirs.length === 0;
  const plural = SHIVIRS.toLowerCase();

  return (
    <section className={`${empty ? "hidden lg:flex" : "flex"} flex-col ${className}`}>
      <SectionHeading
        tier="title"
        action={empty ? undefined : <SeeAll href="/connect">See all</SeeAll>}
      >
        {`Upcoming ${plural}`}
      </SectionHeading>

      {empty ? (
        <div className="flex flex-1 flex-col items-start rounded-card border border-dashed border-rule bg-card/50 p-5">
          <span
            data-ws
            aria-hidden
            style={{ ...CONNECT, background: TINT, color: "var(--ws-ink)" }}
            className="flex h-11 w-11 items-center justify-center rounded-tile"
          >
            <CalendarChipIcon className="h-5 w-5" />
          </span>
          <p lang="hi" className="hi hi-tight mt-4 text-sm font-semibold text-ink">
            अभी कोई शिविर निर्धारित नहीं
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">
            {`New ${plural} appear here as soon as they’re announced. Past ${plural} and centre contacts are in Connect.`}
          </p>
          <Link
            href="/connect"
            data-ws
            style={{
              ...CONNECT,
              background: TINT,
              color: "var(--ws-ink)",
              borderColor: "color-mix(in srgb, var(--ws-color) 30%, var(--color-card))",
            }}
            className="mt-4 inline-flex min-h-11 items-center rounded-control border px-3.5 text-xs font-semibold transition hover:brightness-95"
          >
            Open Connect →
          </Link>
        </div>
      ) : (
        <>
          {/* Phone: the rail. `items-stretch` and the card's own `h-full`, so
              three titles of different lengths make one height, not three. */}
          <ul className="-mx-4 -mb-1 flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-4 pb-1 scroll-pl-4 sm:mx-0 sm:px-0 sm:scroll-pl-0 lg:hidden">
            {shivirs.map((e) => (
              <li key={e.slug} className="w-[17.5rem] shrink-0 snap-start sm:w-[20rem]">
                <EventCardView event={e} compact />
              </li>
            ))}
          </ul>

          {/* Desktop: a stack that fills the column's height, so the section
              ends level with the Sutra card beside it. */}
          <ul className="hidden flex-1 flex-col gap-3 lg:flex">
            {shivirs.map((e) => (
              <li key={e.slug} className="flex flex-1">
                <ShivirRow event={e} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/** One shivir as a row: the start date as a tile, then the name, then where and when. */
function ShivirRow({ event }: { event: EventCard }) {
  const start = parseDay(event.start_date);
  const t = contentLang(event.title);
  const place = event.city || event.location;
  const when = cardDateRange(event);

  return (
    <Link
      href={`/connect/events/${event.slug}`}
      className="flex w-full items-center gap-3.5 rounded-card border border-rule bg-card px-3.5 py-3 shadow-card transition-shadow hover:shadow-raised"
    >
      {start && (
        <span
          data-ws
          aria-hidden
          style={{ ...CONNECT, background: TINT, color: "var(--ws-ink)" }}
          className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-tile"
        >
          <span className="text-title font-bold leading-none tabular-nums">{start.getDate()}</span>
          <span className="mt-1 text-xs leading-none">{MONTH_SHORT[start.getMonth()]}</span>
        </span>
      )}
      <span className="min-w-0 flex-1">
        {/* The tile is decoration; this is where the date is actually said. */}
        {start && <span className="sr-only">{dayMonth(start)}: </span>}
        <span
          {...t}
          className={`${t.className} hi-tight block truncate text-sm font-semibold text-ink`}
        >
          {event.title}
        </span>
        {(place || when) && (
          <span className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-ink-soft">
            <PinIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{[place, when].filter(Boolean).join(" · ")}</span>
          </span>
        )}
      </span>
    </Link>
  );
}
