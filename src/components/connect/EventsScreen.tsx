"use client";

import { useEffect, useRef, useState } from "react";
import { SearchField } from "@/components/SearchField";
import {
  CountedSegmented,
  EmptyState,
  ErrorState,
  FilterButton,
  FindRow,
} from "@/components/ui";
import { getEvents } from "@/lib/api";
import {
  activeFilterCount,
  BUCKET_LABEL,
  EMPTY_EVENT_FILTERS,
  EVENT_BUCKETS,
  eventQuery,
  type EventBucket,
  type EventFilterState,
  type EventListResponse,
} from "@/lib/events";
import { EventCardView } from "./EventCard";
import { EventFiltersSheet } from "./EventFiltersSheet";

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
 * The page hands over the prerendered `upcoming` payload and this screen takes
 * over from there; the first render costs no request.
 */
export function EventsScreen({ initial }: { initial: EventListResponse }) {
  const [bucket, setBucket] = useState<EventBucket>("upcoming");
  const [query, setQuery] = useState("");
  const [asked, setAsked] = useState("");
  const [filters, setFilters] = useState<EventFilterState>(EMPTY_EVENT_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);

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

  const filterCount = activeFilterCount(filters);
  const clearAll = () => {
    setFilters(EMPTY_EVENT_FILTERS);
    setQuery("");
    setAsked("");
  };

  return (
    <div>
      <CountedSegmented
        label="Events"
        value={bucket}
        onChange={setBucket}
        segments={EVENT_BUCKETS.map((b) => ({
          value: b,
          label: BUCKET_LABEL[b],
          count: data.counts[b] ?? 0,
        }))}
      />

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
          the cards. The same arrangement as the book's Highlights filters. */}
      <div className="sticky top-(--app-header-h) z-30 -mx-4 mt-3 bg-surface px-4 pb-2 sm:mx-0 sm:px-0 lg:top-0">
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
              placeholder="Search by name, topic, year…"
              label="Search events"
              unasked={query.trim() !== asked.trim()}
              pending={pending}
            />
          }
          filters={<FilterButton count={filterCount} onClick={() => setSheetOpen(true)} />}
        />
      </div>

      <div
        className={`mt-4 transition-opacity ${pending ? "opacity-60" : ""}`}
        aria-busy={pending}
      >
        {failed ? (
          <ErrorState />
        ) : data.results.length > 0 ? (
          <ul className="flex flex-col gap-3.5">
            {data.results.map((e) => (
              <li key={e.slug}>
                <EventCardView event={e} />
              </li>
            ))}
          </ul>
        ) : filterCount > 0 || asked ? (
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

      {/* Mounted only while open, so the pending selection is initialised from
          the applied one at mount and thrown away on close — no effect copying
          a prop into state every time the sheet appears. */}
      {sheetOpen && (
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
