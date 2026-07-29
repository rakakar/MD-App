import Link from "next/link";
import { BookRail } from "@/components/home/BookRail";
import { ContinueReading } from "@/components/home/ContinueReading";
import { ExploreWorkspaces } from "@/components/home/ExploreWorkspaces";
import { SutraCard } from "@/components/home/SutraCard";
import { EmptyState, PageContainer, SectionHeading } from "@/components/ui";
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
  // section code === workspace id (contract §10)
  const [books, sutra, events] = await Promise.all([
    getBooks({ section: "originals" }).catch(() => [] as BookSummary[]),
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
    <PageContainer>
      <h1 className="sr-only">Originals — मूल ग्रंथ</h1>

      {sutra && <SutraCard sutra={sutra} />}

      <ContinueReading />

      <SectionHeading
        action={
          books.length > 0 ? (
            <Link href="/books" className="text-xs font-medium" style={{ color: "var(--ws-ink)" }}>
              All {books.length} →
            </Link>
          ) : undefined
        }
      >
        Books · <span lang="hi" className="hi">ग्रंथ</span>
      </SectionHeading>
      {books.length > 0 ? (
        <BookRail books={books} />
      ) : (
        <EmptyState title="No books available yet" hint="Published books will appear here." />
      )}

      <SectionHeading>Listen &amp; watch</SectionHeading>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/audio"
          className="rounded-2xl border border-rule bg-white p-5 transition-shadow hover:shadow-md"
        >
          <p className="text-base font-semibold">Discourse audio</p>
          <p className="mt-1 text-sm text-ink-soft">Plays as you read.</p>
        </Link>
        <Link
          href="/videos"
          className="rounded-2xl border border-rule bg-white p-5 transition-shadow hover:shadow-md"
        >
          <p className="text-base font-semibold">Videos</p>
          <p className="mt-1 text-sm text-ink-soft">Talks &amp; playlists.</p>
        </Link>
      </div>

      <SectionHeading>Explore workspaces</SectionHeading>
      <ExploreWorkspaces current="originals" />

      {shivirs.length > 0 && (
        <>
          <SectionHeading
            action={
              <Link href="/connect" className="text-xs font-medium" style={{ color: "var(--ws-ink)" }}>
                See all →
              </Link>
            }
          >
            Upcoming <span lang="hi" className="hi">शिविर</span>
          </SectionHeading>
          <ul className="flex flex-col gap-2">
            {shivirs.map((e) => {
              const d = eventStart(e);
              return (
                <li key={e.id}>
                  <Link
                    href={`/connect/events/${e.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-rule bg-white p-4 transition-shadow hover:shadow-md"
                  >
                    <span className="min-w-0 flex-1">
                      <span lang="hi" className="hi block truncate text-sm font-semibold">
                        {eventTitle(e)}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ink-soft">
                        {eventLocation(e) || "—"}
                        {d ? ` · ${shortDate(d)}` : ""}
                      </span>
                    </span>
                    <span aria-hidden className="shrink-0 text-ink-soft">
                      →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </PageContainer>
  );
}
