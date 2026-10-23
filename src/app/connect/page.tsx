import type { Metadata } from "next";
import { EventsScreen } from "@/components/connect/EventsScreen";
import { ErrorState, PageContainer } from "@/components/ui";
import { getEvents } from "@/lib/api";
import type { EventListResponse } from "@/lib/events";

// The one list in this app that expires without anybody editing it: an event
// moves from Upcoming to Ongoing to Past on its own, at midnight.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Events",
  description: "Shivirs and gatherings — upcoming, ongoing and past.",
};

/**
 * Connect's home: the events list.
 *
 * The first tab is prerendered here and handed to the screen, so arriving at
 * the workspace costs no client request and the cards are in the HTML for
 * anything that does not run JavaScript. Everything after the first tap is the
 * screen's own.
 *
 * No page heading and no section nav, as drawn: the app bar overhead already
 * says Connect, and the tabs are the first thing under it. The `h1` is there
 * for anyone navigating by headings, which is the one reader a comp cannot
 * show.
 */
export default async function ConnectPage() {
  const initial = await getEvents({ bucket: "upcoming" }).catch(() => null);

  return (
    <PageContainer flushTop size="shelf">
      {/* Phone: no visible heading, as drawn — the app bar says Connect.
          Desktop: the title with its line beside it (designer's comp,
          23 Oct 2026), since there is no app bar there to say it. */}
      <div className="lg:flex lg:items-baseline lg:gap-4 lg:pb-2 lg:pt-6">
        <h1 className="sr-only lg:not-sr-only lg:font-display lg:text-4xl lg:font-medium lg:leading-tight lg:tracking-[-0.015em]">
          Events
        </h1>
        <p className="hidden text-ink-soft lg:block">Shivirs and study sessions across centres</p>
      </div>
      {initial ? (
        <EventsScreen initial={initial as EventListResponse} />
      ) : (
        <ErrorState />
      )}
    </PageContainer>
  );
}
