import Link from "next/link";
import { BookRail } from "@/components/home/BookRail";
import { ContinueReading } from "@/components/home/ContinueReading";
import { ExploreWorkspaces } from "@/components/home/ExploreWorkspaces";
import { LibraryBand } from "@/components/home/LibraryBand";
import { ShortsRail } from "@/components/home/ShortsRail";
import { SutraCard } from "@/components/home/SutraCard";
import { NotificationBanner } from "@/components/push/NotificationBanner";
import { ChevronRight, PinIcon } from "@/components/shell/icons";
import {
  EmptyState,
  PageContainer,
  PromoBand,
  SectionHeading,
  SeeAll,
} from "@/components/ui";
import { getBooks, getEvents } from "@/lib/api";
import { eventLocation, eventStart, eventTitle, shortDate, upcomingEvents } from "@/lib/events";
import { SHIVIRS } from "@/lib/labels";
import { getShorts, type Short } from "@/lib/shorts";
import { ACTIVE_SUTRA_SOURCE } from "@/lib/sutra";
import type { BookSummary, EventItem, SutraOfTheDay } from "@/lib/types";

export const revalidate = 900;

async function loadHome(): Promise<{
  books: BookSummary[];
  sutra: SutraOfTheDay | null;
  events: EventItem[];
  shorts: Short[];
}> {
  const [books, sutra, events, shorts] = await Promise.all([
    getBooks({ workspace: "originals" }).catch(() => [] as BookSummary[]),
    ACTIVE_SUTRA_SOURCE.getToday().catch(() => null),
    getEvents().catch(() => [] as EventItem[]),
    getShorts().catch(() => [] as Short[]),
  ]);
  return { books, sutra, events, shorts };
}

/**
 * Originals Home (design 1A): today's Sutra, then straight back into the open
 * chapter, then what else exists — books, media, the other workspaces, and
 * the shivir calendar.
 *
 * The one section the spec draws that is missing here is "News & updates":
 * the BE publishes no announcements feed, and a hardcoded card pretending to
 * be one would be worse than its absence.
 */
export default async function OriginalsHome() {
  const { books, sutra, events, shorts } = await loadHome();
  // Three, not two. The next-shivir chip left the app bar with the designer's
  // finished header, and this is where its job landed — a date in the corner
  // could only ever say *when*, and the reason a reader looks is to find out
  // where and whether they can get to it.
  const shivirs = upcomingEvents(events).slice(0, 3);

  return (
    <PageContainer size="shelf">
      <h1 className="sr-only">Originals</h1>

      {/* Above today's Sutra only because it is dismissible and, once
          dismissed, gone for good — below the fold it would never be seen at
          all, and the offer would exist without ever being made. */}
      <NotificationBanner />

      {sutra && <SutraCard sutra={sutra} />}

      {/*
        The Nagraj-ji's-own-voice door used to sit here, under today's Sutra.
        It is reachable from the resources section, and a second entrance on
        home was one door too many.
      */}

      {/*
        One column on a phone; from lg, the spec's three (1A desktop). Home is
        a page of short, unrelated sections — stacked at 1088px each one is a
        stripe with a screenful of dead space beside it, and the shivirs at the
        bottom fall below the fold on a screen that has room for everything.

        `items-start` so a tall section does not stretch its neighbours, and
        each child is a plain <section>: the columns are a layout, not a
        regrouping, so the reading order stays the order on the phone.

        One gap, everywhere, and it is 20px. `mt-5` is what a SectionHeading
        puts above itself between two sections, so the stack repeats it here —
        above Continue Reading, which was reading as part of the Sutra card
        because a heading first in its own section had its margin collapsed
        away — and the rails no longer add their shadow headroom on top of it.
        Change the number in two places (here and SectionHeading) or the page
        loses its rhythm again.
      */}
      <div className="mt-5 flex flex-col gap-5 lg:grid lg:grid-cols-3 lg:items-start lg:gap-x-6">
        {/* Its own <section>, so it is a grid child directly. Wrapped in one,
            the wrapper stayed behind as a zero-height flex item when there is
            nothing to resume — and took a 28px gap on each side with it, which
            is how a reader who has never opened a book got a hole above Books
            where the rail they do not have would have been. */}
        <ContinueReading layout="stack" />

        <section>
          <SectionHeading
            tier="title"
            action={books.length > 0 ? <SeeAll href="/books">All Books</SeeAll> : undefined}
          >
            Books
          </SectionHeading>
          {books.length > 0 ? (
            <BookRail books={books} />
          ) : (
            <EmptyState title="No books available yet" hint="Published books will appear here." />
          )}

          {/* Draws nothing until there is something; see lib/shorts, which is
              where the fact that there is not yet is kept. */}
          {shorts.length > 0 && (
            <>
              <SectionHeading tier="title">Shorts</SectionHeading>
              <ShortsRail shorts={shorts} />
            </>
          )}

          {/*
            The spec's pair of media cards sat here, pointing at the audio and
            video shelves that Content Model v3 dissolved, and were pulled
            rather than left pointing at nothing. One of them is back, because
            the shelf it points at is now real: /av is a tab with forty hours
            of his voice behind it. The other — a "Photographs" card — is not,
            for exactly the old reason.
          */}
          <SectionHeading tier="title">Audio &amp; Video</SectionHeading>
          <PromoBand
            href="/av"
            title="Audio & Video"
            subtitle="Samvaad, talks & shivir — listen or watch"
          />
        </section>

        <section>
          {/*
            The folders Originals actually holds, as three counted tiles. Drawn
            only when there are some — named-kind cards are what could promise
            an empty shelf; a folder that exists cannot.
          */}
          <LibraryBand />

          <SectionHeading tier="title">Explore workspaces</SectionHeading>
          <ExploreWorkspaces current="originals" />

          {shivirs.length > 0 && (
            <>
              <SectionHeading tier="title" action={<SeeAll href="/connect">See all</SeeAll>}>
                Upcoming {SHIVIRS}
              </SectionHeading>
              <ul className="flex flex-col gap-2">
                {shivirs.map((e) => {
                  const d = eventStart(e);
                  return (
                    <li key={e.id}>
                      <Link
                        href={`/connect/events/${e.id}`}
                        className="flex items-center gap-3 rounded-2xl border border-rule bg-card p-3.5 transition-shadow hover:shadow-md"
                      >
                        <span className="min-w-0 flex-1">
                          <span lang="hi" className="hi block truncate text-sm font-semibold">
                            {eventTitle(e)}
                          </span>
                          <span className="mt-1 flex items-center gap-1 text-xs text-ink-soft">
                            <span aria-hidden className="shrink-0">
                              <PinIcon />
                            </span>
                            <span className="truncate">
                              {eventLocation(e) || "—"}
                              {d ? ` · ${shortDate(d)}` : ""}
                            </span>
                          </span>
                        </span>
                        <span aria-hidden className="shrink-0 text-muted">
                          <ChevronRight />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      </div>
    </PageContainer>
  );
}

