"use client";

import { useEffect, useRef, useState } from "react";
import { SearchField } from "@/components/SearchField";
import {
  ActiveFilters,
  CountedSegmented,
  EmptyState,
  ErrorState,
  FilterButton,
  FindRow,
} from "@/components/ui";
import { getEventFilters, getEvents } from "@/lib/api";
import {
  activeFilterCount,
  BUCKET_LABEL,
  EMPTY_EVENT_FILTERS,
  EVENT_BUCKETS,
  eventQuery,
  type EventBucket,
  type EventFilterOptions,
  type EventFilterState,
  type EventListResponse,
} from "@/lib/events";
import { EventCardView } from "./EventCard";
import { EventFiltersPopover, EventFiltersSheet } from "./EventFiltersSheet";
import { useIsDesktop } from "@/components/ui/Dialog";
import { coversDay, EventCalendar, EventsByType } from "./EventsRail";
import { dayMonthYear, parseDay } from "@/lib/dates";

/**
 * Connect → Events: the three tabs, the search box, the filter sheet, the
 * cards.
 *
 * **The tabs are the API's counts, not a client-side split.** They arrive with
 * every list response, counted under exactly the filters the list was counted
 * under, so a tab can never disagree with what tapping it returns — and
 * nothing here works out which bucket an event falls in. That derivation is
 * date arithmetic whose answer changes at midnight while nobody is deploying,
 * which is why it belongs on one server rather than in every client.
 *
 * Search is submit-only, like every other network-backed box in the app: on
 * the device a search can be instant, over the network it waits to be asked.
 * A bare four-digit number is read by the API as a **year** rather than as
 * text — "2026" means that year's shivirs — so the placeholder says "year".
 *
 * **And it says "prabodhak", because `q=` matches one.** Measured against the
 * live API: "Shriram", "Narasimhan" and the full name each return that
 * prabodhak's shivirs, as do title words, the city, the state and the year.
 * The placeholder used to say "Search by name, topic, year…", which does not
 * fit: the box shares its row with Filters and measures 172px on a 390pt
 * phone, where that string wants 208 and the version naming the prabodhak
 * wants 250 — it truncated mid-word, at "prabo…", which advertises the one
 * thing it was changed to advertise and then hides it. Three words and no
 * "Search by", measured at 169px. "Topic" went rather than "year", because
 * the box does no better at a topic than "name" already promises, while the
 * year is a real behaviour nothing else says.
 *
 * It is not a *filter*, and cannot be one yet. `events/filters/` offers
 * categories, languages, modes and cities and no prabodhaks, so the sheet has
 * nothing to build chips from; and `events/?prabodhak=` answers **HTTP 500**
 * today, where a genuinely unknown parameter (`teacher=`) is ignored with a
 * 200 — so that name is half-wired on the server rather than absent. Both are
 * BE asks. Filtering the fetched page here instead would be the one thing
 * `Events_API_v1` §0 rules out: a count the app worked out for itself, wrong
 * the moment the list is longer than a page.
 *
 * The page hands over the prerendered `upcoming` payload and this screen takes
 * over from there; the first render costs no request.
 */
export function EventsScreen({ initial }: { initial: EventListResponse }) {
  const [bucket, setBucket] = useState<EventBucket>("upcoming");
  const [query, setQuery] = useState("");
  const [asked, setAsked] = useState("");
  const [filters, setFilters] = useState<EventFilterState>(EMPTY_EVENT_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  /** the desktop calendar's chosen day, `YYYY-MM-DD` — see `EventsRail` */
  const [day, setDay] = useState<string | null>(null);

  const [data, setData] = useState<EventListResponse>(initial);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // The query string *is* the identity of the request, so it is what the
  // effect watches — three pieces of state that change independently, and one
  // fetch when any of them does.
  const sig = eventQuery(bucket, asked, filters);
  const first = useRef(true);

  useEffect(() => {
    // The server already answered this exact question and the answer is in
    // `initial`; asking again on mount would be one wasted round trip on the
    // first screen of the workspace.
    if (first.current) {
      first.current = false;
      return;
    }
    const ac = new AbortController();
    setPending(true);
    getEvents({ bucket, q: asked, filters, signal: ac.signal })
      .then((r) => {
        setData(r);
        setFailed(false);
      })
      .catch((e) => {
        if ((e as Error)?.name !== "AbortError") setFailed(true);
      })
      .finally(() => setPending(false));
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  // `?q=` arrives searched — the Assistant's "find me shivir in surat" opens
  // here with Surat already asked. Read after mount, not as a prop: the page is
  // prerendered, and reading the query on the server would make every visit
  // to the workspace dynamic for the sake of the few that carry one. Sits
  // after the fetch effect so the prerendered first answer is still skipped,
  // and the change of `asked` is what asks the narrowed question.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q")?.trim();
    if (!q) return;
    setQuery(q);
    setAsked(q);
  }, []);

  const filterCount = activeFilterCount(filters);
  const desktop = useIsDesktop();
  const results = day ? data.results.filter((e) => coversDay(e, day)) : data.results;
  const clearAll = () => {
    setDay(null);
    setFilters(EMPTY_EVENT_FILTERS);
    setQuery("");
    setAsked("");
  };

  // Names for the applied-filter chips. The state holds codes ("hi",
  // "in_person"); `events/filters/` lists every category, language and mode
  // by name whatever the bucket, so it is asked once, the first time a filter
  // goes on, and kept.
  const [names, setNames] = useState<EventFilterOptions | null>(null);
  const anyFilter = filterCount > 0;
  useEffect(() => {
    if (!anyFilter || names) return;
    getEventFilters()
      .then(setNames)
      .catch(() => undefined);
  }, [anyFilter, names]);

  const nameOf = (list: { code: string; name: string }[] | undefined, code: string) =>
    list?.find((x) => x.code === code)?.name ?? code;
  const dayDate = parseDay(day);
  const chips = [
    ...filters.categories.map((code) => ({
      key: `c-${code}`,
      label:
        names?.categories.find((c) => c.code === code)?.display ??
        data.results.find((e) => e.category.code === code)?.category.display ??
        code,
      onRemove: () =>
        setFilters((f) => ({ ...f, categories: f.categories.filter((c) => c !== code) })),
    })),
    ...filters.languages.map((code) => ({
      key: `l-${code}`,
      label: nameOf(names?.languages, code),
      onRemove: () =>
        setFilters((f) => ({ ...f, languages: f.languages.filter((c) => c !== code) })),
    })),
    ...(filters.mode
      ? [
          {
            key: "mode",
            label: nameOf(names?.modes, filters.mode),
            onRemove: () => setFilters((f) => ({ ...f, mode: "" })),
          },
        ]
      : []),
    ...(filters.city
      ? [{ key: "city", label: filters.city, onRemove: () => setFilters((f) => ({ ...f, city: "" })) }]
      : []),
    // The calendar's day (desktop only) is a narrowing like any other, so it
    // is a chip like any other.
    ...(day
      ? [{ key: "day", label: dayDate ? dayMonthYear(dayDate) : day, onRemove: () => setDay(null) }]
      : []),
  ];
  const clearChips = () => {
    setFilters(EMPTY_EVENT_FILTERS);
    setDay(null);
  };

  return (
    <div className="mx-auto max-w-3xl lg:max-w-none">
      {/* Desktop: the tabs, the box and Filters on one ruled row, as drawn.
          `contents` below lg, so the sticky search row under it keeps the
          page as its containing block and still pins on a phone. */}
      <div className="contents lg:sticky lg:top-0 lg:z-30 lg:-mx-8 lg:flex lg:items-center lg:justify-between lg:gap-8 lg:border-b lg:border-rule lg:bg-surface lg:px-8 lg:py-4">
      <div className="lg:w-[30rem] lg:shrink-0">
      <CountedSegmented
        label="Events"
        value={bucket}
        onChange={(b) => {
          setBucket(b);
          setDay(null);
        }}
        segments={EVENT_BUCKETS.map((b) => ({
          value: b,
          label: BUCKET_LABEL[b],
          count: data.counts[b] ?? 0,
        }))}
      />
      </div>

      {/* **Search and filters pin under the app bar.**

          The list they narrow is the only thing on this screen, and it runs
          long — so the two controls that decide what is in it were scrolling
          away from the results they govern, and changing your mind about a
          filter meant scrolling back to the top to reach the button. The tabs
          above are deliberately *not* sticky: they are three fixed buckets a
          reader picks once on arrival, not something they adjust while reading
          down a list.

          Full-bleed on a phone and inline from sm, and opaque `bg-surface`
          rather than the app bar's translucency — this row stops directly
          under that bar, and two blurred layers over one another is a smear
          rather than a material. `z-30` keeps it under the bar (z-40) and over
          the cards. The same arrangement as the book's Highlights filters.

          **The air above the box is padding, not a bigger `top`.** Pinned
          flush, the box sat on the app bar's edge with the two borders
          touching. Pushing the sticky offset down instead would have opened a
          band between the bar and this row that belongs to neither, and the
          cards would scroll up through it in the clear. The padding is inside
          the sticky box, so the same `bg-surface` that hides the cards behind
          the row also fills the gap above it.

          `mt-1` rather than `mt-3` to pay for it: unstuck, the padding and the
          margin stack, and the tabs would otherwise sit further from the box
          than they did before it gained any room. */}
      <div className="sticky top-(--app-header-h) z-30 -mx-4 mt-1 bg-surface px-4 pb-2 pt-2 sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:mt-0 lg:max-w-[44rem] lg:flex-1 lg:p-0">
        <FindRow
          search={
            <SearchField
              inputRef={inputRef}
              value={query}
              onChange={setQuery}
              onSubmit={() => setAsked(query)}
              onClear={() => {
                setQuery("");
                setAsked("");
              }}
              placeholder="Name, prabodhak, year"
              label="Search events"
              unasked={query.trim() !== asked.trim()}
              pending={pending}
            />
          }
          filters={
            desktop ? (
              <EventFiltersPopover
                bucket={bucket}
                q={asked}
                applied={filters}
                onApply={setFilters}
                count={filterCount}
              />
            ) : (
              <FilterButton count={filterCount} onClick={() => setSheetOpen(true)} />
            )
          }
        />
      </div>
      </div>

      {/* Phone: what is on, under the bar, as Media draws it. */}
      {chips.length > 0 && (
        <div className="mt-1 mb-1 lg:hidden">
          <ActiveFilters items={chips} onClear={clearChips} />
        </div>
      )}

      <div className="lg:mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
      <div
        /* `mt-2`, not `mt-4`: the row above is sticky and already carries its
           own `pb-2`, so the two paddings stacked into a gap wider than any
           other on the screen — and the first card is what the search box is
           for, which is an odd thing to hold at arm's length. */
        className={`mt-2 transition-opacity lg:mt-0 ${pending ? "opacity-60" : ""}`}
        aria-busy={pending}
      >
        {/* Desktop: the count with the filters that made it, as removable
            chips — the same line Media and the Library draw. */}
        {chips.length > 0 && !failed && (
          <div className="mb-4 hidden flex-wrap items-center gap-x-3 gap-y-2 text-xs text-ink-soft lg:flex">
            <span className="tabular-nums">
              {results.length} {results.length === 1 ? "event" : "events"}
            </span>
            <ActiveFilters items={chips} onClear={clearChips} compact />
          </div>
        )}
        {failed ? (
          <ErrorState />
        ) : results.length > 0 ? (
          <>
          <ul className="flex flex-col gap-3.5 lg:gap-5">
            {results.map((e) => (
              <li key={e.slug}>
                <EventCardView event={e} />
              </li>
            ))}
          </ul>
          </>
        ) : filterCount > 0 || asked || day ? (
          // The one empty state a reader can arrive at by their own doing, so
          // it carries the way back out — an empty screen with no control on
          // it is the only place in the app you can be stuck.
          <EmptyState
            title="Nothing matches"
            hint={
              <button
                type="button"
                onClick={clearAll}
                className="min-h-11 font-semibold underline underline-offset-2"
                style={{ color: "var(--ws-ink)" }}
              >
                Clear search and filters
              </button>
            }
          />
        ) : (
          <EmptyState
            title={`No ${BUCKET_LABEL[bucket].toLowerCase()} events`}
            hint={
              bucket === "past"
                ? "Shivirs appear here once they have finished."
                : "New shivirs and gatherings will appear here."
            }
          />
        )}
      </div>

      {/* The rail — desktop only, and only once the breakpoint is known, so
          a phone never mounts the calendar or asks for the category counts.
          Sticks under the toolbar while the cards scroll. */}
      {desktop && (
        <aside className="sticky top-28 flex flex-col gap-5">
          <EventCalendar
            key={data.results[0]?.bucket ?? bucket}
            events={data.results}
            bucket={bucket}
            selected={day}
            onSelect={setDay}
          />
          <EventsByType events={results} filters={filters} onChange={setFilters} />
        </aside>
      )}
      </div>

      {/* Mounted only while open, so the pending selection is initialised from
          the applied one at mount and thrown away on close — no effect copying
          a prop into state every time the sheet appears. */}
      {sheetOpen && !desktop && (
        <EventFiltersSheet
          onClose={() => setSheetOpen(false)}
          bucket={bucket}
          q={asked}
          applied={filters}
          onApply={setFilters}
        />
      )}
    </div>
  );
}

