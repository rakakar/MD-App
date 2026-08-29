import { BookRail } from "@/components/home/BookRail";
import { ContinueReading } from "@/components/home/ContinueReading";
import { ExploreWorkspaces } from "@/components/home/ExploreWorkspaces";
import { LibraryBand } from "@/components/home/LibraryBand";
import { ShortsRail } from "@/components/home/ShortsRail";
import { SutraCard } from "@/components/home/SutraCard";
import { NotificationBanner } from "@/components/push/NotificationBanner";
import {
  EmptyState,
  PageContainer,
  PromoBand,
  SectionHeading,
  SeeAll,
} from "@/components/ui";
import { EventCardView } from "@/components/connect/EventCard";
import { getBooks, getEvents } from "@/lib/api";
import type { EventCard } from "@/lib/events";
import { SHIVIRS, byGenre } from "@/lib/labels";
import { getShorts, type Short } from "@/lib/shorts";
import { ACTIVE_SUTRA_SOURCE } from "@/lib/sutra";
import type { BookSummary, SutraOfTheDay } from "@/lib/types";

export const revalidate = 900;

async function loadHome(): Promise<{
  books: BookSummary[];
  sutra: SutraOfTheDay | null;
  events: EventCard[];
  shorts: Short[];
}> {
  const [books, sutra, events, shorts] = await Promise.all([
    getBooks({ workspace: "originals" })
      // Parichay first, then Darshan, Vaad, Shastra — see `byGenre`. The rail
      // shows the first few and "All Books →" the rest, so which few is
      // decided here rather than by whatever the API happened to return first.
      .then(byGenre)
      .catch(() => [] as BookSummary[]),
    ACTIVE_SUTRA_SOURCE.getToday().catch(() => null),
    getEvents({ bucket: "upcoming" })
      // Soonest first, straight from the API — the bucket and the order are
      // the server's, so this strip and Connect's own list can never
      // disagree about which shivir is next.
      .then((r) => r.results)
      .catch(() => [] as EventCard[]),
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
  const shivirs = events.slice(0, 3);

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
              {/* A rail, not a stack — the same one the books and the shorts
                  ride in, down to the full-bleed and the snap. Three cards is
                  what `shivirs` slices to, and three is the number the app bar
                  used to promise before the chip moved here: enough that the
                  next one is visibly not the only one, few enough that the
                  home page does not turn into the Connect list.

                  `items-stretch` and `h-full` on the card, so three cards of
                  different title lengths are one height rather than three —
                  in a row you scroll sideways, ragged bottoms read as a
                  rendering fault. */}
              <ul className="-mx-4 -mb-1 flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-4 pb-1 scroll-pl-4 sm:mx-0 sm:px-0 sm:scroll-pl-0">
                {shivirs.map((e) => (
                  <li
                    key={e.slug}
                    className="w-[17.5rem] shrink-0 snap-start sm:w-[20rem]"
                  >
                    <EventCardView event={e} compact />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </PageContainer>
  );
}

