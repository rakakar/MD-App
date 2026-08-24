import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryChip, EventBadge } from "@/components/connect/EventCard";
import {
  ContactChip,
  EventLinkRow,
  EventPanel,
  InfoRow,
} from "@/components/connect/EventDetail";
import { EventNote } from "@/components/connect/EventNote";
import { EventPoster } from "@/components/connect/EventPoster";
import { EventShare } from "@/components/connect/EventShare";
import { EventTracker } from "@/components/connect/EventTracker";
import {
  BackIcon,
  CalendarChipIcon,
  LanguageIcon,
  PinIcon,
  UserIcon,
} from "@/components/shell/icons";
import { ctaPrimary, PageContainer } from "@/components/ui";
import { ApiError, getEvent } from "@/lib/api";
import { fullDateRange, type EventDetail } from "@/lib/events";
import { contentLang } from "@/lib/script";

export const revalidate = 300;

/** Draft events 404 here, exactly as an unknown slug does — so a failure that
 *  is not a 404 must not be swallowed into one. */
async function load(slug: string): Promise<EventDetail | null> {
  try {
    return await getEvent(slug);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await load(slug).catch(() => null);
  if (!event) return { title: "Event" };
  return {
    title: event.title,
    description: event.invitation_note.slice(0, 180) || undefined,
    openGraph: event.poster ? { images: [event.poster] } : undefined,
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await load(slug);
  if (!event) notFound();

  const t = contentLang(event.title);
  const dates = fullDateRange(event);
  const location = event.address || event.location;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: event.start_date,
    endDate: event.end_date ?? event.start_date,
    eventAttendanceMode:
      event.mode_code === "online"
        ? "https://schema.org/OnlineEventAttendanceMode"
        : "https://schema.org/OfflineEventAttendanceMode",
    location: location ? { "@type": "Place", name: location } : undefined,
    image: event.poster ?? undefined,
    description: event.invitation_note || undefined,
    inLanguage: event.language?.code || undefined,
    url: event.registration_url || undefined,
  };

  return (
    <PageContainer>
      <EventTracker />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/*
        The comps' own header row: back, "Event", a bookmark and a share.

        The bookmark is not drawn. `me/bookmarks/` covers book paragraphs and
        nothing else today — an event cannot be saved — and a control that does
        nothing is worse on this screen than a gap, because it is the one thing
        a reader would press to keep a date they might otherwise miss. It comes
        back when the endpoint does; nothing else here changes when it lands.
      */}
      <div className="mb-4 flex items-center gap-2.5">
        <Link
          href="/connect"
          aria-label="Back to events"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-rule bg-card text-ink transition-colors active:bg-ink/[.04]"
        >
          <BackIcon className="h-4.5 w-4.5" />
        </Link>
        <p className="min-w-0 flex-1 truncate text-title font-semibold">Event</p>
        <EventShare title={event.title} path={`/connect/events/${event.slug}`} variant="icon" />
      </div>

      <EventPoster src={event.poster} title={event.title} />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <CategoryChip category={event.category} />
        <EventBadge badge={event.badge} />
        {/* Tags are the manager's own grey chips ("Pustak") and are often
            empty; the language rides with them, as drawn. */}
        {event.tags.map((tag) => (
          <span
            key={tag}
            {...contentLang(tag)}
            className={`${contentLang(tag).className} inline-flex items-center rounded-full bg-inset px-3 py-1.5 text-sm font-medium text-ink-soft`}
          >
            {tag}
          </span>
        ))}
        {event.language?.name && (
          <span className="inline-flex items-center rounded-full bg-inset px-3 py-1.5 text-sm font-medium text-ink-soft">
            {event.language.name}
          </span>
        )}
      </div>

      <h1
        {...t}
        className={`${t.className} ${
          t.lang === "hi" ? "hi-tight" : "font-display leading-snug"
        } mt-3 text-[1.625rem] font-semibold`}
      >
        {event.title}
      </h1>

      <div className="mt-5 flex flex-col gap-2.5">
        {event.prabodhak && (
          <InfoRow icon={<UserIcon className="h-5 w-5" />} label="Prabodhak">
            {/* Already resolved to one name, "Multiple", or nothing — this
                screen never counts the prabodhaks array to decide. */}
            <span {...contentLang(event.prabodhak)} className={contentLang(event.prabodhak).className}>
              {event.prabodhak}
            </span>
          </InfoRow>
        )}
        {dates && (
          <InfoRow icon={<CalendarChipIcon className="h-5 w-5" />} label="Date">
            {dates}
          </InfoRow>
        )}
        {event.language?.name && (
          <InfoRow icon={<LanguageIcon className="h-5 w-5" />} label="Language">
            {event.language.name}
          </InfoRow>
        )}
        {location && (
          <InfoRow icon={<PinIcon />} label="Location">
            {event.map_url ? (
              <a
                href={event.map_url}
                target="_blank"
                rel="noopener noreferrer"
                lang={contentLang(location).lang}
                className={`${contentLang(location).className} underline decoration-1 underline-offset-2`}
              >
                {location}
              </a>
            ) : (
              <span {...contentLang(location)} className={contentLang(location).className}>
                {location}
              </span>
            )}
          </InfoRow>
        )}
        <InfoRow icon={<PinIcon />} label="Mode">
          {event.mode}
        </InfoRow>
      </div>

      {/*
        Registration is the organiser's own form and nothing else: no endpoint
        accepts a reader's details, by design, so there is no in-app form to
        fall back to. The button is simply absent when the field is empty.
      */}
      {event.registration_url && (
        <a
          href={event.registration_url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${ctaPrimary} mt-5 w-full`}
          style={{ background: "var(--ws-color)" }}
        >
          Register for this shivir ↗
        </a>
      )}

      <div className="mt-5 flex flex-col gap-4">
        {(event.invitation_note || event.contacts.length > 0) && (
          <EventPanel title="Invitation Note">
            {event.invitation_note && <EventNote note={event.invitation_note} />}
            {event.contacts.length > 0 && (
              <div
                className={
                  event.invitation_note ? "mt-4 border-t border-rule pt-4" : undefined
                }
              >
                {/* The note's own last line is usually the lead-in ("अधिक
                    जानकारी हेतु:"), which is why the comps draw no heading
                    here. A screen reader still gets one. */}
                <h3 className="sr-only">Contacts</h3>
                <div className="flex flex-wrap gap-2">
                  {event.contacts.map((c) => (
                    <ContactChip key={`${c.name}-${c.phone}`} contact={c} />
                  ))}
                </div>
              </div>
            )}
          </EventPanel>
        )}

        {event.links.length > 0 && (
          <EventPanel title="Links">
            {/* The playlist is served separately and is already excluded from
                this list, so it renders straight through. */}
            <div className="[&>a+a]:border-t [&>a+a]:border-rule">
              {event.links.map((l) => (
                <EventLinkRow key={l.url} link={l} />
              ))}
            </div>
          </EventPanel>
        )}

        {event.recording_url && (
          <EventPanel title="Shivir Recording Playlist">
            <EventLinkRow
              link={{
                type: "playlist",
                type_label: "Playlist",
                label: "Click to watch on youtube",
                url: event.recording_url,
              }}
            />
          </EventPanel>
        )}
      </div>
    </PageContainer>
  );
}
