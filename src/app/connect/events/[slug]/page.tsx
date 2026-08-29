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
import { EventDetailHeader } from "@/components/connect/EventDetailHeader";
import { EventNote } from "@/components/connect/EventNote";
import { EventPoster } from "@/components/connect/EventPoster";
import { EventShare } from "@/components/connect/EventShare";
import { EventTracker } from "@/components/connect/EventTracker";
import {
  CalendarChipIcon,
  LanguageIcon,
  PinIcon,
  UserIcon,
} from "@/components/shell/icons";
import { ctaPrimaryBar, PageContainer } from "@/components/ui";
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

      <EventDetailHeader
        title={event.title}
        path={`/connect/events/${event.slug}`}
        watch="event-title"
      />

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
        id="event-title"
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
        {/* `h-5 w-5` on the pin, like the three rows above it. `PinIcon`'s own
            default is 14px, which left the one glyph in this stack that was not
            20px — and in a column of tinted tiles the odd one reads as a
            smaller tile rather than as a smaller icon. */}
        {location && (
          <InfoRow icon={<PinIcon className="h-5 w-5" />} label="Location">
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
        {/* No Mode row. The comps draw four facts here — prabodhak, date,
            language, location — and mode was ours. It is not a fifth fact of
            the same kind: "Online" is already the whole of the location line
            on an online shivir, and on an in-person one it repeats the address
            directly above it. It stays a filter, which is where it answers a
            question nobody can read off the page. */}
      </div>

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

      {/*
        **The Register bar, pinned to the foot.**

        Registration is the organiser's own form and nothing else: no endpoint
        accepts a reader's details, by design (Events_API §5), so this opens
        theirs in a new tab and there is no in-app form to fall back to.

        Pinned because it is the one thing this screen is asking the reader to
        do, and the page it sits under is long — the poster, four facts, the
        invitation note and the links can run to three or four screens, so a
        button in the flow was reachable only by whoever scrolled to the exact
        right place. The comps draw it docked.

        **Absent, not disabled, when there is no `registration_url`.** Plenty
        of shivirs take no registration at all, and on those the honest screen
        is the one that ends — a permanently dead bar across the foot of every
        such event would cost them a strip of the page to say nothing. Same
        rule the bookmark and the Centres tab follow.

        The spacer below the content is what keeps the last link row off the
        bar; `pb-24` on the scroller would not survive the bar being absent.
      */}
      {event.registration_url && (
        <>
          <div aria-hidden className="h-20" />
          <div
            className="fixed inset-x-0 z-30 border-t border-rule bg-surface/95 px-4 py-3 backdrop-blur sm:px-6 lg:bottom-0 lg:ps-72 lg:pe-8"
            /* Clears the tab bar and the home indicator — the same number the
               player pill uses for the same job. On a desktop there is no tab
               bar, so `lg:bottom-0` puts it on the floor and the sidebar's
               width is padded off the start edge instead. */
            style={{ bottom: "calc(env(safe-area-inset-bottom) + 3.9rem)" }}
          >
            <div className="mx-auto w-full max-w-3xl">
              <a
                href={event.registration_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${ctaPrimaryBar} w-full`}
                style={{ background: "var(--ws-color)" }}
              >
                Register
              </a>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}
