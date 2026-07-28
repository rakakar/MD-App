import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RegisterForm } from "@/components/connect/RegisterForm";
import { EventTracker } from "@/components/connect/EventTracker";
import { PageContainer, SectionHeading } from "@/components/ui";
import { getEvents } from "@/lib/api";
import { eventEnd, eventLocation, eventStart, eventTitle, longDate } from "@/lib/events";
import type { EventItem } from "@/lib/types";

export const revalidate = 300;

export const metadata: Metadata = { title: "Event" };

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // the live API exposes events as a list only — resolve detail from it
  const events = await getEvents().catch(() => [] as EventItem[]);
  const event = events.find((e) => String(e.id) === id);
  if (!event) notFound();

  const start = eventStart(event);
  const end = eventEnd(event);
  const location = eventLocation(event);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: eventTitle(event),
    startDate: event.start_date,
    endDate: event.end_date,
    location: location
      ? { "@type": "Place", name: location, address: event.center?.address }
      : undefined,
    description: event.description || undefined,
  };

  return (
    <PageContainer>
      <EventTracker />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {event.event_type && (
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--ws-ink)" }}>
          {event.event_type}
        </p>
      )}
      <h1 lang="hi" className="hi mt-1 text-2xl font-bold leading-snug">
        {eventTitle(event)}
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        {start ? longDate(start) : "Date TBD"}
        {end && start && end.getTime() !== start.getTime() ? ` – ${longDate(end)}` : ""}
      </p>
      {location && <p className="mt-1 text-sm text-ink-soft">📍 {location}</p>}
      {event.center?.map_url && (
        <a
          href={event.center.map_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-xs underline underline-offset-2"
          style={{ color: "var(--ws-ink)" }}
        >
          Open in maps
        </a>
      )}

      {event.description && (
        <p lang="hi" className="hi mt-5 whitespace-pre-wrap text-[15px] leading-relaxed">
          {event.description}
        </p>
      )}

      <SectionHeading>Registration</SectionHeading>
      <div className="rounded-2xl border border-rule bg-white p-4">
        <RegisterForm eventId={event.id} open={event.registration_open !== false} />
      </div>
    </PageContainer>
  );
}
