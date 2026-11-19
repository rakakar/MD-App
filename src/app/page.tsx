import { BookRail } from "@/components/home/BookRail";
import { ContinueRow } from "@/components/home/ContinueRow";
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
          Continue (books and recordings), full width — when there is something to resume
          Books, one row of covers across the page
          Shorts (2/3)           | Library (1/3)
          ─────────────────────────────────────────────
          Explore workspaces, four across

        The shivirs are last in the DOM, where the phone has always had them,
        and are lifted into the top-right cell by placement. (Moved up under
        Books on 15 Nov 2026 and put back on 16 Nov, designer's call.) Every
        child is a grid cell directly — a wrapper left empty becomes an empty
        cell.

        On a phone the gap is 20px, everywhere: `mt-5` is what a SectionHeading
        puts above itself between two sections, so the stack repeats it. No
        margin above the stack itself — the page's own top padding is that
        20px; a `mt-5` here put 40px between the app bar and the Sutra. The
        notification banner has no margin of its own and takes the gap like
        everything else. Change
        the number in two places (here and SectionHeading) or the phone loses
        its rhythm. The desktop rows take 40px, as drawn.
      */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-3 lg:gap-x-6 lg:gap-y-10">
        {sutra && <SutraCard sutra={sutra} className="lg:col-span-2 lg:row-start-1" />}

        {/* One resume row, books and recordings together, newest first — see
            `ContinueRow` (16 Nov 2026). It reuses the shelf fetched above
            rather than asking again; an empty list means that fetch failed,
            so the book cards try their own. */}
        <ContinueRow books={books.length > 0 ? books : undefined} className="lg:col-span-3" />

        {/* Below the Sutra and the resume row, never above. It appears after
            hydration (it reads storage and the push state), and at the top it
            shoved the whole page ~140px down under the reader's thumb. Down
            here it only pushes what is below it, which they have not reached.
            Dismissible, and gone for good once dismissed, so it still gets
            seen by anyone who scrolls at all. */}
        <NotificationBanner className="lg:col-span-3" />

        <section className="lg:col-span-3">
          <SectionHeading
            tier="title"
            action={
              books.length > 0 ? (
                // The visible words are the same on all three Home sections;
                // the sr-only copy says which one. `SeeAll` takes no label, and
                // the aria-hidden span carries its own gap because the
                // arrow's leading space is lost once a sibling is an element.
                <SeeAll href="/books">
                  <span aria-hidden className="me-1">See all</span>
                  <span className="sr-only">See all books</span>
                </SeeAll>
              ) : undefined
            }
          >
            Books
          </SectionHeading>
          {books.length > 0 ? (
            <BookRail books={books} allHref="/books" />
          ) : (
            <EmptyState title="No books available yet" hint="Published books will appear here." />
          )}
        </section>

        {/* Draws nothing until there is something; see lib/shorts, which is
            where the fact that there is not yet is kept. */}
        {shorts.length > 0 && (
          // A column on desktop, so the rail can take whatever height Media and
          // Library give the two rows it spans (ShortsRail stretches to it).
          <section className="lg:col-span-2 lg:row-span-2 lg:flex lg:flex-col">
            <SectionHeading tier="title">Shorts</SectionHeading>
            <ShortsRail shorts={shorts} />
          </section>
        )}

        {/*
          The spec's pair of media cards sat here, pointing at the audio and
          video shelves that Content Model v3 dissolved, and were pulled rather
          than left pointing at nothing. One of them came back once /av was
          real. The desktop revision left it off, the sidebar's Media item
          being a second door to the same room; it came back on desktop on
          19 Nov 2026 (Raka) — Home is where a reader looks for what there is,
          and the sidebar item is easy to read past. On desktop it stacks with
          Library in the right-hand column, beside Shorts (which spans both
          rows), filling the space the Library tiles left under them. The
          pair sits 20px apart, not the grid's 40: they are one column of
          small things, and 40 read as a hole between them (Raka, 19 Nov
          2026). A negative margin rather than a smaller row gap, which would
          close every desktop row; the Shorts cards shrink with it.
        */}
        <section className="lg:col-start-3 lg:-mb-5">
          <SectionHeading tier="title">Media</SectionHeading>
          <PromoBand
            href="/av"
            title="Media"
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
