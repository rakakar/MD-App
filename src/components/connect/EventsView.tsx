"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  eventLocation,
  eventStart,
  eventTitle,
  longDate,
  pastEvents,
  upcomingEvents,
} from "@/lib/events";
import type { EventItem } from "@/lib/types";

/** Hindi labels for the BE's event_type choices (design 9A badge). */
const TYPE_LABELS: Record<string, string> = {
  shivir: "Shivir",
  workshop: "Workshop",
  satsang: "Satsang",
  other: "Other",
};

export function eventTypeLabel(t: string): string {
  return TYPE_LABELS[t] ?? t;
}

function EventRow({ e }: { e: EventItem }) {
  const d = eventStart(e);
  const type = typeof e.event_type === "string" ? e.event_type : "";
  return (
    <Link
      href={`/connect/events/${e.id}`}
      className="flex items-center gap-4 rounded-2xl border border-rule bg-card p-4 transition-shadow hover:shadow-md"
    >
      <div
        className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl text-white"
        style={{ background: "var(--ws-color)" }}
      >
        <span className="text-base font-bold leading-none">{d ? d.getDate() : "?"}</span>
        <span className="text-xs uppercase">
          {d ? d.toLocaleString("en-IN", { month: "short" }) : ""}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p lang="hi" className="hi truncate text-sm font-semibold">{eventTitle(e)}</p>
        <p className="truncate text-xs text-ink-soft">
          {d ? longDate(d) : "Date TBD"}
          {eventLocation(e) ? ` · ${eventLocation(e)}` : ""}
        </p>
        {type && (
          <p lang="hi" className="hi mt-1 inline-block rounded-full border border-rule px-2 py-0.5 text-xs text-ink-soft">
            {eventTypeLabel(type)}
          </p>
        )}
      </div>
      {/* The design's per-card Register action. A styled span, not a nested
          link — the whole row already navigates to the event page, where the
          actual form lives; this badge says registration is open from here. */}
      {e.registration_open === true && (
        <span
          className="shrink-0 rounded-control px-3 py-1.5 text-xs font-semibold text-white"
          style={{ background: "var(--ws-color)" }}
        >
          Register
        </span>
      )}
    </Link>
  );
}

/** Month calendar with event dots; list ⇄ calendar toggle (PRD §8). */
function MonthCalendar({ events }: { events: EventItem[] }) {
  const [offset, setOffset] = useState(0);
  const month = useMemo(() => {
    const base = new Date();
    return new Date(base.getFullYear(), base.getMonth() + offset, 1);
  }, [offset]);

  const byDay = useMemo(() => {
    const map = new Map<number, EventItem[]>();
    for (const e of events) {
      const d = eventStart(e);
      if (d && d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth()) {
        const list = map.get(d.getDate()) ?? [];
        list.push(e);
        map.set(d.getDate(), list);
      }
    }
    return map;
  }, [events, month]);

  const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="rounded-2xl border border-rule bg-card p-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setOffset((o) => o - 1)} aria-label="Previous month" className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-ink/5">
          ←
        </button>
        <p className="text-sm font-semibold">
          {month.toLocaleString("en-IN", { month: "long", year: "numeric" })}
        </p>
        <button type="button" onClick={() => setOffset((o) => o + 1)} aria-label="Next month" className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-ink/5">
          →
        </button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-ink-soft">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          const dayEvents = day !== null ? (byDay.get(day) ?? []) : [];
          const first = dayEvents[0];
          const content = (
            <>
              <span className="text-xs">{day ?? ""}</span>
              {dayEvents.length > 0 && (
                <span className="mt-0.5 flex justify-center gap-0.5" aria-hidden>
                  {dayEvents.slice(0, 3).map((_, j) => (
                    <span key={j} className="h-1 w-1 rounded-full" style={{ background: "var(--ws-color)" }} />
                  ))}
                </span>
              )}
            </>
          );
          return first ? (
            <Link
              key={i}
              href={`/connect/events/${first.id}`}
              aria-label={`${dayEvents.length} event(s) on day ${day}`}
              className="flex aspect-square flex-col items-center justify-center rounded-lg bg-ink/[.03] hover:bg-ink/[.07]"
            >
              {content}
            </Link>
          ) : (
            <div key={i} className="flex aspect-square flex-col items-center justify-center">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EventsView({ events }: { events: EventItem[] }) {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [showPast, setShowPast] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  // Filter chips (design 9A) for the one facet the BE actually carries:
  // event_type. Teacher, language and mode are not model fields yet, so
  // offering those chips would be a row of dead controls. Counts on the
  // chips, and a chip only exists when at least one upcoming event has it.
  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of upcomingEvents(events)) {
      const t = typeof e.event_type === "string" ? e.event_type : "";
      if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return counts;
  }, [events]);

  const filtered =
    typeFilter === null ? events : events.filter((e) => e.event_type === typeFilter);
  const upcoming = upcomingEvents(filtered);
  const past = pastEvents(filtered);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex overflow-hidden rounded-full border border-rule bg-card text-xs" role="radiogroup" aria-label="View">
          {(["list", "calendar"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 capitalize ${view === v ? "font-semibold text-white" : ""}`}
              style={view === v ? { background: "var(--ws-color)" } : undefined}
            >
              {v}
            </button>
          ))}
        </div>

        {typeCounts.size > 1 && (
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Event type">
            {[...typeCounts.entries()].map(([t, n]) => {
              const selected = typeFilter === t;
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTypeFilter(selected ? null : t)}
                  className={`min-h-11 inline-flex items-center rounded-full border px-3 text-xs font-medium ${
                    selected ? "border-transparent text-white" : "border-rule bg-card text-ink"
                  }`}
                  style={selected ? { background: "var(--ws-color)" } : undefined}
                >
                  <span lang="hi" className="hi">{eventTypeLabel(t)}</span> · {n}
                </button>
              );
            })}
            {typeFilter !== null && (
              <button
                type="button"
                onClick={() => setTypeFilter(null)}
                className="text-xs text-ink-soft underline underline-offset-2"
              >
                Clear filter
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-4">
        {view === "calendar" ? (
          <MonthCalendar events={filtered} />
        ) : upcoming.length > 0 ? (
          <div className="flex flex-col gap-3">
            {upcoming.map((e) => (
              <EventRow key={e.id} e={e} />
            ))}
          </div>
        ) : typeFilter !== null ? (
          <div className="rounded-2xl border border-dashed border-rule bg-card/50 p-8 text-center">
            <p className="text-sm font-medium">No upcoming events of this type</p>
            <button
              type="button"
              onClick={() => setTypeFilter(null)}
              className="mt-2 text-xs font-medium underline underline-offset-2"
              style={{ color: "var(--ws-ink)" }}
            >
              Clear filter
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-rule bg-card/50 p-8 text-center">
            <p className="text-sm font-medium">No upcoming events</p>
            <p className="mt-1 text-xs text-ink-soft">New shivirs and gatherings will appear here.</p>
          </div>
        )}
      </div>

      {view === "list" && past.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            aria-expanded={showPast}
            className="text-xs font-medium text-ink-soft underline-offset-2 hover:underline"
          >
            {showPast ? "Hide past events" : `Past events (${past.length})`}
          </button>
          {showPast && (
            <div className="mt-3 flex flex-col gap-3 opacity-75">
              {past.map((e) => (
                <EventRow key={e.id} e={e} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
