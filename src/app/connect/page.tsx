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
    <PageContainer>
      <h1 className="sr-only">Events</h1>
      {initial ? (
        <EventsScreen initial={initial as EventListResponse} />
      ) : (
        <ErrorState />
      )}
    </PageContainer>
  );
}
