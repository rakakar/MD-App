import type { Metadata } from "next";
import { EventsView } from "@/components/connect/EventsView";
import { PageContainer } from "@/components/ui";
import { getEvents } from "@/lib/api";
import type { EventItem } from "@/lib/types";

// Connect home = upcoming events feed (v1 news, PRD §8) — short revalidate
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Connect · संपर्क",
  description: "Upcoming events, shivir calendar and centers.",
};

export default async function ConnectPage() {
  const events = await getEvents().catch(() => [] as EventItem[]);

  return (
    <PageContainer>
      <h1 className="text-xl font-bold">Connect · संपर्क</h1>
      <p className="mt-1 text-sm text-ink-soft">Upcoming shivirs, gatherings and updates.</p>
      <div className="mt-4">
        <EventsView events={events} />
      </div>
    </PageContainer>
  );
}
