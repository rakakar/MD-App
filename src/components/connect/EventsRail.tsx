"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "@/components/shell/icons";
import { parseDay } from "@/lib/dates";
import {
  categoryStyle,
  type EventBucket,
  type EventCard,
  type EventCategory,
  type EventFilterState,
} from "@/lib/events";

/**
 * The Events page's right-hand rail on a desktop — a month calendar and the
 * counts by shivir category (designer's comp, 23 Oct 2026).
 *
 * **The calendar narrows the list it sits beside, in the app.** `events/` has
 * no date parameter, but it hands back each tab's *whole* list unpaged — so
 * the days tinted here, and the cards a click on one leaves standing, are the
 * full answer rather than a guess from a first page. If the endpoint ever
 * pages, this has to become a server filter.
 */

/** `2026-11-05` — a calendar day as a key, in local time like `parseDay`. */
export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Whether an event runs on the given day — start to end, both included. */
export function coversDay(e: Pick<EventCard, "start_date" | "end_date">, key: string): boolean {
  const a = parseDay(e.start_date);
  if (!a) return false;
  const b = parseDay(e.end_date) ?? a;
  return dayKey(a) <= key && key <= dayKey(b);
}

/** Every day any of these events runs on. Capped per event, so a typo'd end
 *  year cannot make one card paint a decade. */
function eventDays(events: EventCard[]): Set<string> {
  const days = new Set<string>();
  for (const e of events) {
    const a = parseDay(e.start_date);
    if (!a) continue;
    const b = parseDay(e.end_date) ?? a;
    const d = new Date(a);
    for (let i = 0; d <= b && i < 120; i++) {
      days.add(dayKey(d));
      d.setDate(d.getDate() + 1);
    }
  }
  return days;
}

const MONTH = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const WEEK_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Which month to show for a set of event days: for Upcoming and Ongoing the
 * first month from this one on that has an event, for Past the latest — so
 * the tinted days are on screen without paging. Worked out from the days
 * rather than the first card, so it does not depend on the list's order.
 */
function monthFor(days: Set<string>, bucket: EventBucket): Date {
  const today = new Date();
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const keys = [...days].sort();
  if (keys.length === 0) return thisMonth;
  const from = dayKey(thisMonth);
  const key =
    bucket === "past" ? keys[keys.length - 1] : (keys.find((k) => k >= from) ?? keys[0]);
  const d = parseDay(key)!;
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Whether any of the days falls in the given month. */
function hasDayIn(days: Set<string>, month: Date): boolean {
  const prefix = dayKey(month).slice(0, 7);
  for (const k of days) if (k.startsWith(prefix)) return true;
  return false;
}

const card = "rounded-card border border-rule bg-card shadow-card";

/** Remount it (`key`) when the tab changes, so it reopens on that tab's month;
 *  within a tab it follows the list on its own. */
export function EventCalendar({
  events,
  bucket,
  selected,
  onSelect,
}: {
  events: EventCard[];
  bucket: EventBucket;
  selected: string | null;
  onSelect: (day: string | null) => void;
}) {
  const days = useMemo(() => eventDays(events), [events]);
  const [month, setMonth] = useState(() => monthFor(days, bucket));

  // When the list changes — a filter, a search — and the month on screen has
  // none of its days, move to one that does. Adjusted during render rather
  // than in an effect, so there is no frame showing an empty month. A month
  // the reader paged to that still has events is left alone.
  const [seen, setSeen] = useState(days);
  if (seen !== days) {
    setSeen(days);
    if (days.size > 0 && !hasDayIn(days, month)) setMonth(monthFor(days, bucket));
  }
  const today = dayKey(new Date());

  const y = month.getFullYear();
  const m = month.getMonth();
  const lead = new Date(y, m, 1).getDay();
  const count = new Date(y, m + 1, 0).getDate();
  const step = (n: number) => setMonth(new Date(y, m + n, 1));

  const nav =
    "flex h-8 w-8 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5";

  return (
    <section className={`${card} p-5`} aria-label="Calendar">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-title font-semibold" aria-live="polite">
          {MONTH[m]} {y}
        </h2>
        <div className="flex gap-1">
          <button type="button" onClick={() => step(-1)} aria-label="Previous month" className={nav}>
            <ChevronRight className="h-4 w-4 rotate-180" />
          </button>
          <button type="button" onClick={() => step(1)} aria-label="Next month" className={nav}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1.5 text-center">
        {WEEK.map((w, i) => (
          <abbr
            key={w}
            title={WEEK_FULL[i]}
            className="pb-1 text-xs font-medium text-ink-soft no-underline"
          >
            {w}
          </abbr>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`lead-${i}`} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const d = i + 1;
          const key = dayKey(new Date(y, m, d));
          const has = days.has(key);
          const on = selected === key;
          const isToday = key === today;
          const base = "mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm tabular-nums";
          if (!has) {
            return (
              <span
                key={key}
                className={`${base} text-ink ${isToday ? "ring-1 ring-rule" : ""}`}
              >
                {d}
              </span>
            );
          }
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              aria-label={`${d} ${MONTH[m]} ${y}${isToday ? ", today" : ""} — show events on this day`}
              onClick={() => onSelect(on ? null : key)}
              className={`${base} font-semibold transition-colors`}
              style={
                on
                  ? { background: "var(--ws-color)", color: "var(--color-card)" }
                  : {
                      background: "color-mix(in srgb, var(--ws-color) 12%, var(--color-card))",
                      color: "var(--ws-ink)",
                    }
              }
            >
              {d}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-sm text-ink-soft">
        Tinted dates have an event. Click a date to filter.
      </p>
    </section>
  );
}

/**
 * The categories in the list beside it and how many cards each has.
 *
 * Counted from the list rather than taken from `events/filters/`: that
 * endpoint's category counts disagree with the list it describes (23 Oct
 * 2026 — Upcoming had four "A" events and it said one), and the list is the
 * whole unpaged answer, so a tally of it is exact — and it follows the
 * calendar's day, which the server's count cannot. Each row toggles that
 * category in the filters, so the rail is a shortcut into them rather than a
 * second set.
 */
export function EventsByType({
  events,
  filters,
  onChange,
}: {
  events: EventCard[];
  filters: EventFilterState;
  onChange: (f: EventFilterState) => void;
}) {
  const rows = useMemo(() => {
    const by = new Map<string, EventCategory & { count: number }>();
    for (const e of events) {
      const c = by.get(e.category.code);
      if (c) c.count++;
      else by.set(e.category.code, { ...e.category, count: 1 });
    }
    // A–G, the order the categories are lettered in.
    return [...by.values()].sort((a, b) => a.letter.localeCompare(b.letter));
  }, [events]);
  if (rows.length === 0) return null;

  return (
    <section className={`${card} p-5`} aria-labelledby="events-by-type">
      <h2 id="events-by-type" className="mb-2 text-title font-semibold">
        By type
      </h2>
      <ul>
        {rows.map((c) => {
          const on = filters.categories.includes(c.code);
          return (
            <li key={c.code}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() =>
                  onChange({
                    ...filters,
                    categories: on
                      ? filters.categories.filter((x) => x !== c.code)
                      : [...filters.categories, c.code],
                  })
                }
                style={categoryStyle(c.accent)}
                className={`-mx-2 flex min-h-10 w-[calc(100%+1rem)] items-center gap-3 rounded-control px-2 text-start text-sm transition-colors hover:bg-ink/5 ${
                  on ? "font-semibold" : ""
                }`}
              >
                <span
                  aria-hidden
                  className="h-5 w-1 shrink-0 rounded-full"
                  style={{ background: "var(--cat)" }}
                />
                <span className="min-w-0 flex-1 truncate" style={on ? { color: "var(--cat-ink)" } : undefined}>
                  {c.display}
                </span>
                <span className="tabular-nums text-ink-soft">{c.count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
