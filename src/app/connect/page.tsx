import type { Metadata } from "next";
import { EventsView } from "@/components/connect/EventsView";
import { PageContainer, SegmentedNav } from "@/components/ui";
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
      <h1 className="font-display text-2xl font-medium">Connect · <span lang="hi" className="hi">संपर्क</span></h1>
      <p className="mt-1 text-sm text-ink-soft">Upcoming shivirs, gatherings and updates.</p>
      {/* One workspace, two sections (design 9A) — News waits on a BE feed. */}
      <div className="mt-3">
        <SegmentedNav
          label="Connect sections"
          items={[
            { label: "Events", href: "/connect", active: true },
            { label: "Centres", href: "/connect/centers", active: false },
          ]}
        />
      </div>
      <div className="mt-4">
        <EventsView events={events} />
      </div>
    </PageContainer>
  );
}
