import type { EventItem } from "./types";

// Event shapes come from §9 (may evolve) — read dates defensively.
export function eventStart(e: EventItem): Date | null {
  const raw = e.start_date ?? e.starts_at ?? e.date;
  if (!raw) return null;
  const d = new Date(raw as string);
  return isNaN(d.getTime()) ? null : d;
}

export function eventEnd(e: EventItem): Date | null {
  const raw = e.end_date ?? e.ends_at;
  if (!raw) return eventStart(e);
  const d = new Date(raw as string);
  return isNaN(d.getTime()) ? null : d;
}

export function eventTitle(e: EventItem): string {
  return e.title_hi || "Event";
}

export function eventLocation(e: EventItem): string {
  if (e.location_text) return e.location_text;
  if (e.center) {
    return [e.center.name_hi, e.center.city].filter(Boolean).join(", ");
  }
  return "";
}

export function isUpcoming(e: EventItem, now = new Date()): boolean {
  const end = eventEnd(e);
  if (!end) return false;
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  return end.getTime() >= todayStart.getTime();
}

export function upcomingEvents(events: EventItem[]): EventItem[] {
  return events
    .filter((e) => isUpcoming(e))
    .sort((a, b) => (eventStart(a)?.getTime() ?? 0) - (eventStart(b)?.getTime() ?? 0));
}

export function pastEvents(events: EventItem[]): EventItem[] {
  return events
    .filter((e) => !isUpcoming(e))
    .sort((a, b) => (eventStart(b)?.getTime() ?? 0) - (eventStart(a)?.getTime() ?? 0));
}

const DATE_FMT = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
});

export function shortDate(d: Date): string {
  return DATE_FMT.format(d);
}

export function longDate(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}
