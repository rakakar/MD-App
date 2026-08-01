import Link from "next/link";
import { BookRail } from "@/components/home/BookRail";
import { ContinueReading } from "@/components/home/ContinueReading";
import { ExploreWorkspaces } from "@/components/home/ExploreWorkspaces";
import { SutraCard } from "@/components/home/SutraCard";
import { NotificationBanner } from "@/components/push/NotificationBanner";
import { ChevronRight, PinIcon } from "@/components/shell/icons";
import { EmptyState, PageContainer, SectionHeading, SeeAll } from "@/components/ui";
import { getBooks, getEvents } from "@/lib/api";
import { eventLocation, eventStart, eventTitle, shortDate, upcomingEvents } from "@/lib/events";
import { ACTIVE_SUTRA_SOURCE } from "@/lib/sutra";
import type { BookSummary, EventItem, SutraOfTheDay } from "@/lib/types";

export const revalidate = 900;

async function loadHome(): Promise<{
  books: BookSummary[];
  sutra: SutraOfTheDay | null;
  events: EventItem[];
}> {
  const [books, sutra, events] = await Promise.all([
    getBooks({ workspace: "originals" }).catch(() => [] as BookSummary[]),
    ACTIVE_SUTRA_SOURCE.getToday().catch(() => null),
    getEvents().catch(() => [] as EventItem[]),
  ]);
  return { books, sutra, events };
}

/**
 * Originals Home (design 1A): today's सूत्र, then straight back into the open
 * chapter, then what else exists — books, media, the other workspaces, and
 * the शिविर calendar.
 *
 * The one section the spec draws that is missing here is "News & updates":
 * the BE publishes no announcements feed, and a hardcoded card pretending to
 * be one would be worse than its absence.
 */
export default async function OriginalsHome() {
  const { books, sutra, events } = await loadHome();
  const shivirs = upcomingEvents(events).slice(0, 2);

  return (
    <PageContainer size="shelf">
      <h1 className="sr-only">Originals — मूल ग्रंथ</h1>

      {/* Above today's सूत्र only because it is dismissible and, once
          dismissed, gone for good — below the fold it would never be seen at
          all, and the offer would exist without ever being made. */}
      <NotificationBanner />

      {sutra && <SutraCard sutra={sutra} />}

      {/*
        The "नागराज जी की वाणी" door used to sit here, under today's सूत्र.
        It is reachable from the resources section, and a second entrance on
        home was one door too many.
      */}

      {/*
        One column on a phone; from lg, the spec's three (1A desktop). Home is
        a page of short, unrelated sections — stacked at 1088px each one is a
        stripe with a screenful of dead space beside it, and the शिविर at the
        bottom fall below the fold on a screen that has room for everything.

        `items-start` so a tall section does not stretch its neighbours, and
        each child is a plain <section>: the columns are a layout, not a
        regrouping, so the reading order stays the order on the phone.
      */}
      <div className="lg:grid lg:grid-cols-3 lg:items-start lg:gap-x-6">
        <section>
          <ContinueReading layout="stack" />
        </section>

        <section>
          <SectionHeading
            action={
              books.length > 0 ? <SeeAll href="/books">All {books.length}</SeeAll> : undefined
            }
          >
            Books · <span lang="hi" className="hi">ग्रंथ</span>
          </SectionHeading>
          {books.length > 0 ? (
            <BookRail books={books} />
          ) : (
            <EmptyState title="No books available yet" hint="Published books will appear here." />
          )}

          {/*
            The spec runs a pair of media cards on from the rail here. They
            pointed at the audio and video shelves, which Content Model v3
            dissolved — a recording is a file in a folder now, reached by
            browsing, by its विषय or by search. Nothing replaces them until
            there is something published to point at: a card promising
            "Discourse audio" that opens an empty library is a worse home page
            than one card fewer.
          */}
        </section>

        <section>
          <SectionHeading>Explore workspaces</SectionHeading>
          <ExploreWorkspaces current="originals" />

          {shivirs.length > 0 && (
            <>
              <SectionHeading tier="title" action={<SeeAll href="/connect">See all</SeeAll>}>
                Upcoming <span lang="hi" className="hi">शिविर</span>
              </SectionHeading>
              <ul className="flex flex-col gap-2">
                {shivirs.map((e) => {
                  const d = eventStart(e);
                  return (
                    <li key={e.id}>
                      <Link
                        href={`/connect/events/${e.id}`}
                        className="flex items-center gap-3 rounded-2xl border border-rule bg-white p-3.5 transition-shadow hover:shadow-md"
                      >
                        <span className="min-w-0 flex-1">
                          <span lang="hi" className="hi block truncate text-sm font-semibold">
                            {eventTitle(e)}
                          </span>
                          <span className="mt-1 flex items-center gap-1 text-[11.5px] text-ink-soft">
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

