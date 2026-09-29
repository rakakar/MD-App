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
import { UpcomingShivirs } from "@/components/home/UpcomingShivirs";
import { getBooks, getEvents } from "@/lib/api";
import type { EventCard } from "@/lib/events";
import { byGenre } from "@/lib/labels";
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

      {/*
        The Nagraj-ji's-own-voice door used to sit here, under today's Sutra.
        It is reachable from the resources section, and a second entrance on
        home was one door too many.
      */}

      {/*
        One column on a phone, in DOM order. From lg, the designer's desktop
        revision (29 Sep 2026) — rows across the page rather than three
        columns side by side, which left each column a narrow stripe and the
        books two covers wide:

          Sutra (2/3)            | Upcoming shivirs (1/3)
          Continue Reading, full width — when there is something to resume
          Books, one row of covers across the page
          Shorts (2/3)           | Library (1/3)
          ─────────────────────────────────────────────
          Explore workspaces, four across

        The shivirs are last in the DOM, where the phone has always had them,
        and are lifted into the top-right cell by placement. Every child is a
        grid cell directly — a wrapper left empty becomes an empty cell.

        On a phone the gap is 20px, everywhere: `mt-5` is what a SectionHeading
        puts above itself between two sections, so the stack repeats it. Change
        the number in two places (here and SectionHeading) or the phone loses
        its rhythm. The desktop rows take 40px, as drawn.
      */}
      <div className="mt-5 flex flex-col gap-5 lg:grid lg:grid-cols-3 lg:gap-x-6 lg:gap-y-10">
        {sutra && <SutraCard sutra={sutra} className="lg:col-span-2 lg:row-start-1" />}

        {/* Rails at every width, now that it has the page's full width on
            desktop. `className` replaces the section's own top margin, which
            doubled the grid's gap. */}
        <ContinueReading className="lg:col-span-3" />

        <section className="lg:col-span-3">
          <SectionHeading
            tier="title"
            action={books.length > 0 ? <SeeAll href="/books">All books</SeeAll> : undefined}
          >
            Books
          </SectionHeading>
          {books.length > 0 ? (
            <BookRail books={books} />
          ) : (
            <EmptyState title="No books available yet" hint="Published books will appear here." />
          )}
        </section>

        {/* Draws nothing until there is something; see lib/shorts, which is
            where the fact that there is not yet is kept. */}
        {shorts.length > 0 && (
          <section className="lg:col-span-2">
            <SectionHeading tier="title">Shorts</SectionHeading>
            <ShortsRail shorts={shorts} />
          </section>
        )}

        {/*
          The spec's pair of media cards sat here, pointing at the audio and
          video shelves that Content Model v3 dissolved, and were pulled rather
          than left pointing at nothing. One of them came back once /av was
          real. The desktop revision leaves it off: there the sidebar's
          Audio/Video item is always in view, and the band was a second door
          to the same room. On a phone the tab bar says "Media" and the band
          still earns its place.
        */}
        <section className="lg:hidden">
          <SectionHeading tier="title">Audio &amp; Video</SectionHeading>
          <PromoBand
            href="/av"
            title="Audio & Video"
            subtitle="Samvaad, talks & shivir — listen or watch"
          />
        </section>

        {/*
          The folders Originals actually holds, as counted tiles. Drawn only
          when there are some — named-kind cards are what could promise an
          empty shelf; a folder that exists cannot. Pinned to the right-hand
          column so it stays there on a day the Shorts feed is empty.
        */}
        <LibraryBand className="lg:col-start-3" />

        {/* The rule is desktop-only: it separates "this workspace" from "the
            others", which on a phone the stack's order already says. */}
        <section className="lg:col-span-3 lg:border-t lg:border-rule lg:pt-8">
          <SectionHeading tier="title">Explore workspaces</SectionHeading>
          <ExploreWorkspaces current="originals" />
        </section>

        {/* Three: enough that the next one is visibly not the only one, few
            enough that Home does not turn into the Connect list. Beside the
            Sutra on desktop; with no Sutra to sit beside, a full row. */}
        <UpcomingShivirs
          shivirs={shivirs}
          className={
            sutra ? "lg:col-start-3 lg:row-start-1" : "lg:col-span-3 lg:row-start-1"
          }
        />
      </div>
    </PageContainer>
  );
}

