"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "@/components/shell/icons";
import { getEvents, searchLibrary } from "@/lib/api";
import {
  bookDestinations,
  matchDestinations,
  resumeDestination,
  type Destination,
} from "@/lib/assistant/destinations";
import { cardDateRange, type EventListResponse } from "@/lib/events";
import { nodeHref } from "@/lib/library";
import { contentLang } from "@/lib/script";
import type { BookSummary, LibrarySearchRow } from "@/lib/types";
import { DestinationGlyph, FolderGlyph } from "./icons";
import { AnswerEyebrow, SuggestionChip } from "./parts";
import type { Ask } from "./types";

/**
 * 8 · Navigate — take me there.
 *
 * The best-matching place is one big card; up to two runners-up sit under
 * "Also possible". Words that named no place — "Avlokan" in "where are my
 * Avlokan notes" — are the reader's subject, so they are looked up in the
 * library as well: a shivir's folder is a place too, just one the app's own
 * map cannot know about.
 *
 * Nothing here counts the reader's own things ("12 notes tagged Avlokan") —
 * notes carry no tags, and a number the app cannot stand behind is worse than
 * none. The card says what the place holds instead.
 */
export function NavigateAnswer({
  query,
  books,
  onAsk,
  onSettle,
}: {
  query: string;
  books: BookSummary[] | null;
  onAsk: Ask;
  onSettle: (summary: string, count: number) => void;
}) {
  const answer = useMemo(() => {
    const resume = resumeDestination();
    return matchDestinations(query, [...(resume ? [resume] : []), ...bookDestinations(books ?? [])]);
  }, [query, books]);

  const [library, setLibrary] = useState<LibrarySearchRow[] | null>(null);
  const subject = answer.leftover.join(" ");
  useEffect(() => {
    if (subject.length < 3) {
      setLibrary([]);
      return;
    }
    const ctrl = new AbortController();
    searchLibrary(subject, ctrl.signal)
      .then((rows) => setLibrary(rows.filter((r) => r.type === "folder").slice(0, 2)))
      .catch(() => setLibrary([]));
    return () => ctrl.abort();
  }, [subject]);

  const [best, ...others] = answer.matches.map((m) => m.destination);

  // "find me shivir in surat": the place is Events and the leftover word is
  // where. The events endpoint already searches by city, so the answer can be
  // the shivirs themselves rather than a door to a list the reader then has to
  // search again. Null until asked, and for every other place.
  const eventsSubject = best?.id === "events" && subject.length >= 3 ? subject : "";
  const [events, setEvents] = useState<EventListResponse | null>(null);
  useEffect(() => {
    if (!eventsSubject) {
      setEvents(null);
      return;
    }
    const ctrl = new AbortController();
    getEvents({ bucket: "upcoming", q: eventsSubject, signal: ctrl.signal })
      .then(setEvents)
      .catch(() => setEvents(null));
    return () => ctrl.abort();
  }, [eventsSubject]);
  // The Events page, already searched for the same words.
  const bestHref =
    best && eventsSubject ? `${best.href}?q=${encodeURIComponent(eventsSubject)}` : best?.href;

  useEffect(() => {
    onSettle(best ? `Go to ${best.section} · ${best.title}` : "No place matched", answer.matches.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [best?.id]);

  if (!best && library?.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <AnswerEyebrow label="Go to" />
        <p className="text-sm text-ink-soft">
          There is no place in the app called “{query}”. Try “my notes”, “downloads” or “events” —
          or look for it in the books.
        </p>
        <div className="flex flex-wrap gap-2">
          <SuggestionChip onClick={() => onAsk(query, "books")}>Search the books</SuggestionChip>
          <SuggestionChip onClick={() => onAsk("open conversations", "navigate")}>
            Past conversations
          </SuggestionChip>
        </div>
      </div>
    );
  }

  const also = [
    ...others.slice(0, library && library.length > 0 ? 1 : 2).map((d) => ({ kind: "place" as const, d })),
    ...(library ?? []).map((row) => ({ kind: "folder" as const, row })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <AnswerEyebrow label="Go to" />
      {best && <BestCard d={best} href={bestHref} />}

      {events && (
        events.results.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {events.results.slice(0, 3).map((e) => (
              <li key={e.slug}>
                <Row
                  href={`/connect/events/${encodeURIComponent(e.slug)}`}
                  icon={<DestinationGlyph icon="events" className="h-5 w-5" />}
                  title={e.title}
                  detail={[cardDateRange(e), e.location || e.city].filter(Boolean).join(" · ")}
                />
              </li>
            ))}
            {events.results.length > 3 && (
              <li>
                <Link href={bestHref!} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold" style={{ color: "var(--ws-ink)" }}>
                  All {events.results.length} upcoming
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </li>
            )}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">
            No upcoming shivirs match “{eventsSubject}”.
            {events.counts.past > 0 && (
              <>
                {" "}
                {events.counts.past} past {events.counts.past === 1 ? "one is" : "ones are"} under Past on{" "}
                <Link href={bestHref!} className="font-semibold underline" style={{ color: "var(--ws-ink)" }}>
                  Events
                </Link>
                .
              </>
            )}
          </p>
        )
      )}

      {also.length > 0 && (
        <>
          <p className="text-sm text-ink-soft">Also possible:</p>
          <ul className="flex flex-col gap-2">
            {also.map((a) =>
              a.kind === "place" ? (
                <li key={a.d.id}>
                  <Row href={a.d.href} icon={<DestinationGlyph icon={a.d.icon} className="h-5 w-5" />}
                    title={`${a.d.section} · ${a.d.title}`} detail={a.d.detail} />
                </li>
              ) : (
                <li key={`f${a.row.id}`}>
                  <Row
                    href={nodeHref(a.row.id)}
                    icon={<FolderGlyph className="h-5 w-5" />}
                    title={`Library · ${a.row.type === "folder" ? a.row.name : a.row.title}`}
                    detail={a.row.type === "folder" ? folderDetail(a.row) : undefined}
                  />
                </li>
              )
            )}
          </ul>
        </>
      )}
    </div>
  );
}

function folderDetail(row: LibrarySearchRow & { type: "folder" }): string | undefined {
  const n = row.item_count ?? 0;
  return n > 0 ? `${n} ${n === 1 ? "item" : "items"}` : undefined;
}

function BestCard({ d, href = d.href }: { d: Destination; href?: string }) {
  const title = `${d.section} · ${d.title}`;
  const l = contentLang(title);
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-card border border-rule bg-card p-4 shadow-card"
    >
      <span
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-tile"
        style={{
          background: "color-mix(in srgb, var(--ws-color) 12%, var(--color-card))",
          color: "var(--ws-ink)",
        }}
      >
        <DestinationGlyph icon={d.icon} className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span lang={l.lang} className={`${l.lang === "hi" ? "hi-note" : ""} block text-lg font-semibold leading-snug`}>
          {title}
        </span>
        {d.detail && <span className="mt-0.5 line-clamp-2 block text-sm text-ink-soft">{d.detail}</span>}
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 font-semibold" style={{ color: "var(--ws-ink)" }}>
        Open
        <ChevronRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

function Row({
  href,
  icon,
  title,
  detail,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  detail?: string;
}) {
  const l = contentLang(title);
  return (
    <Link href={href} className="flex min-h-16 items-center gap-3 rounded-card border border-rule bg-card px-4 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-inset text-ink-soft">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span lang={l.lang} className={`${l.lang === "hi" ? "hi-note" : ""} block font-semibold leading-snug`}>
          {title}
        </span>
        {detail && <span className="block truncate text-sm text-ink-soft">{detail}</span>}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
    </Link>
  );
}
