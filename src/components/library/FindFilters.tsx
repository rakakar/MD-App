"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { KIND_LABEL, KIND_ORDER } from "./format";
import { AXIS_LABEL, chipLabel } from "./Sieve";
import { yearBands, yearSpan } from "./years";
import { FilterIcon, PinIcon, SortIcon, TagIcon, UserIcon } from "@/components/shell/icons";
import {
  ActiveFilters,
  Chip,
  FilterButton,
  FilterSection,
  RadioList,
  Sheet,
  SheetAction,
  SheetTextAction,
} from "@/components/ui";
import {
  FIND_AXES,
  FIND_ORDERINGS,
  ORDERING_LABEL,
  clearAxis,
  effectiveOrdering,
  findHref,
  isChipOn,
  setOrdering,
  toggleChip,
  toggleGroup,
  type FindAxis,
  type FindOrdering,
  type FindState,
} from "@/lib/find";
import type { FacetValue, FileKind, LibraryFacets, Topic } from "@/lib/types";

/**
 * The shelf's filters, as the finished comps draw them: **a counted button
 * beside the search box, a bottom sheet behind it, and a row of what is on**
 * ("Audio Video - filters modal", "- filters active").
 *
 * This replaces `FilterCards`' two closed `<details>` rows, which were the
 * previous answer to the same problem — six axes of chips run to some five
 * hundred pixels, and open above the grid they push the collections a reader
 * came for off the bottom of a phone. The panels solved the height by folding;
 * the sheet solves it by moving the whole thing off the page, which is better
 * for the two reasons the designer drew it that way. The chrome above the grid
 * becomes *one* row rather than three, so the Library's first collection is on
 * the first screen. And a sheet is the only surface where an axis can be shown
 * open, in full, without costing the page anything — the panels had to stay
 * shut to fit, which meant the reader chose what to filter by before seeing
 * what was in it.
 *
 * **The URL is still the state, and that policy is untouched** (`lib/find.ts`).
 * Every chip in here is a `Link` onto this same page with one value toggled, so
 * a narrowed shelf stays a real address, the back button still walks out of a
 * filter one chip at a time, and nothing has to be applied. The sheet is client
 * state for exactly one fact — whether it is open — and taps inside it navigate
 * underneath it, which is why the footer's count is live rather than a promise.
 *
 * **Sort by is the third section**, as drawn. It reads and writes `ordering`
 * (contract §13.8) through the URL like every other control here, so the sort
 * is part of a shared address rather than something the reader has to redo.
 * The one thing it does not do is offer a radio for relevance: the comp draws
 * three options and relevance is not one of them, so with words in the box the
 * section shows nothing selected and reads "Best match" instead of claiming an
 * order the list is not in.
 */

/** the axes the sheet offers, in the order the comp stacks them */
const SHEET_AXES: FindAxis[] = [
  "topic",
  "year",
  "kind",
  ...FIND_AXES.filter((a) => a !== "year" && a !== "kind"),
];

const AXIS_HEADING: Record<FindAxis, string> = {
  topic: "By topic",
  year: "By year",
  kind: "By category",
  provenance: "By source",
  place: "By place",
  person: "By person",
  language: "By language",
};

/**
 * The comps head only two of these — a tag on BY TOPIC and the sieve's own
 * descending lines on BY YEAR — so those two are copied exactly and the rest
 * take the nearest glyph the app already owns. A second calendar or a second
 * tag invented for an axis the designer has not drawn is how a set of icons
 * stops meaning anything.
 */
function axisIcon(axis: FindAxis) {
  if (axis === "topic") return <TagIcon className="h-4 w-4" />;
  if (axis === "place") return <PinIcon className="h-4 w-4" />;
  if (axis === "person") return <UserIcon className="h-4 w-4" />;
  return <FilterIcon className="h-4 w-4" />;
}

/**
 * Which axes this surface may draw, with the options each of them has.
 *
 * The same rule the sieve has always applied: one option narrows nothing, so an
 * axis with a single value would be an instruction to press a button that
 * changes nothing. An axis stays on screen once it is in use however narrow the
 * scope has become — a shared link must never hide the control that produced
 * what is on it.
 *
 * `hideAxes` drops an axis the page controls elsewhere (`/av` promotes Type to
 * the segments at the top). Both halves matter: a hidden axis that still counted
 * would leave the button permanently reading "1" for a chip the reader never set
 * and cannot reach.
 */
function liveAxes(
  facets: LibraryFacets,
  state: FindState,
  hideAxes: FindAxis[]
): { axis: FindAxis; options: FacetValue[]; on: number }[] {
  return SHEET_AXES.filter((axis) => !hideAxes.includes(axis))
    .map((axis) => ({
      axis,
      options: axis === "kind" ? orderedKinds(facets.kind) : (facets[axis] ?? []),
      on: state.selection[axis]?.length ?? 0,
    }))
    .filter(({ options, on }) => options.length > 1 || on > 0);
}

/**
 * The axes with something to *draw*, which is not quite the axes in use.
 *
 * A shelf can suppress values on an axis it still offers — the Library drops
 * Audio and Video from Category, because recordings have a tab of their own —
 * and a hand-typed `?kind=video` then lands on an axis that is on and has
 * nothing left to show. The section would be a heading over a hole. It drops
 * out of the sheet and stays in the chip row below, which is where the reader
 * can see it and switch it off.
 */
function drawableAxes(axes: ReturnType<typeof liveAxes>) {
  return axes.filter(({ options }) => options.length > 0);
}

/** how many chips are on across the axes this surface is actually offering */
function shownCount(
  axes: { axis: FindAxis }[],
  state: FindState
): number {
  return axes.reduce((n, { axis }) => n + (state.selection[axis]?.length ?? 0), 0);
}

/** everything the button counts, off — the query and any locked axis kept */
function clearShown(state: FindState, axes: { axis: FindAxis }[]): FindState {
  return axes.reduce((next, { axis }) => clearAxis(next, axis), state);
}

/**
 * What the **sheet's** "Clear all" resets — the chips and the sort.
 *
 * The sort is not counted on the button (the comp's badge reads 3 for three
 * chips while Newest first sits selected), but it is one of the sheet's
 * controls, and a sort still standing after Clear all is something the reader
 * cleared and did not clear. The chip row's own `Clear` outside the sheet stays
 * chips-only: it names what it removes, and it cannot name this.
 */
function clearSheet(state: FindState, axes: { axis: FindAxis }[]): FindState {
  return setOrdering(clearShown(state, axes), "");
}

/**
 * The button beside the search box, and the sheet behind it.
 *
 * Draws nothing at all when there is nothing to filter by — a folder whose
 * material is all one year, one kind and untagged should not be offered a
 * control that opens onto an empty sheet.
 */
export function FindFilters({
  topics,
  facets,
  state,
  basePath,
  itemCount,
  noun = "item",
  hideAxes = [],
}: {
  topics: Topic[];
  facets: LibraryFacets;
  state: FindState;
  basePath: string;
  /** how much is in scope right now — what the footer offers to show */
  itemCount: number;
  /** what this page's rows are called, singular: "item", "recording" */
  noun?: string;
  hideAxes?: FindAxis[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const live = liveAxes(facets, state, hideAxes);
  const axes = drawableAxes(live).filter(
    // Topic is drawn from the manager's list rather than from the facet alone,
    // so it is live whenever that list has more than one usable value.
    ({ axis, options }) => (axis === "topic" ? liveTopics(topics, options).length > 1 : true)
  );
  if (axes.length === 0) return null;
  // Counted over every axis in use, drawable or not, so the button and the chip
  // row below it can never disagree about how narrowed the page is.
  const count = shownCount(live, state);

  return (
    <>
      <FilterButton count={count} onClick={() => setOpen(true)} />
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Filters"
        actions={
          count > 0 || state.ordering ? (
            <SheetTextAction
              onClick={() => router.push(findHref(basePath, clearSheet(state, live)))}
            >
              Clear all
            </SheetTextAction>
          ) : undefined
        }
        footer={
          <SheetAction onClick={() => setOpen(false)}>
            {`Show ${itemCount} ${itemCount === 1 ? noun : `${noun}s`}`}
          </SheetAction>
        }
      >
        {axes.map(({ axis, options }) => (
          <FilterSection
            key={axis}
            icon={axisIcon(axis)}
            label={AXIS_HEADING[axis]}
            status={sectionStatus(axis, state, facets)}
          >
            {axis === "topic" ? (
              <TopicChips
                topics={liveTopics(topics, options)}
                state={state}
                basePath={basePath}
              />
            ) : axis === "year" ? (
              <YearChips options={options} state={state} basePath={basePath} />
            ) : (
              <div className="flex flex-wrap gap-2" role="group" aria-label={AXIS_LABEL[axis]}>
                {options.map((chip) => (
                  <Chip
                    key={chip.value}
                    label={chipLabel(axis, chip)}
                    href={findHref(basePath, toggleChip(state, axis, chip.value))}
                    selected={isChipOn(state, axis, chip.value)}
                  />
                ))}
              </div>
            )}
          </FilterSection>
        ))}
        <SortSection state={state} basePath={basePath} />
      </Sheet>
    </>
  );
}

/**
 * The comp's third section — Newest / Oldest / Longest first.
 *
 * A ruled radio list rather than chips, because chips say "combine these" and a
 * sort cannot be combined; `RadioList` was built for this and has been sitting
 * unused since. Each choice navigates, like every other control in the sheet, so
 * the sort is part of the address and the footer's count stays live underneath.
 *
 * **Nothing is selected while there are words in the box.** The list is then
 * ranked by relevance, which is not one of the three options the comp draws, and
 * showing "Newest first" lit above a list that is not in that order is worse
 * than showing none of them lit. The status says "Best match" so the state has a
 * name; picking any of the three is how the reader overrides it.
 */
function SortSection({ state, basePath }: { state: FindState; basePath: string }) {
  const router = useRouter();
  const current = effectiveOrdering(state);
  return (
    <FilterSection
      icon={<SortIcon className="h-4 w-4" />}
      label="Sort by"
      status={current === "" ? "Best match" : undefined}
    >
      <RadioList<FindOrdering>
        label="Sort by"
        options={FIND_ORDERINGS.map((value) => ({ value, label: ORDERING_LABEL[value] }))}
        value={current}
        onChange={(value) => router.push(findHref(basePath, setOrdering(state, value)))}
      />
    </FilterSection>
  );
}

/** "2 selected" for an axis a reader combines, the span for the one they cut */
function sectionStatus(axis: FindAxis, state: FindState, facets: LibraryFacets) {
  const on = state.selection[axis]?.length ?? 0;
  if (on > 0) return `${on} selected`;
  if (axis === "year") return <span className="tabular-nums">{yearSpan(facets.year)}</span>;
  return undefined;
}

/**
 * Topics a reader can actually get somewhere with.
 *
 * Before the facets arrive there is nothing honest to count with, so this falls
 * back to "is this topic used anywhere at all" rather than offering a chip that
 * filters to nothing. Manager order, not count order — they arrange the list.
 */
function liveTopics(topics: Topic[], facets: FacetValue[]): Topic[] {
  const counts = new Map(facets.map((f) => [f.value, f.count]));
  return topics
    .filter((t) => (facets.length > 0 ? (counts.get(t.code) ?? 0) > 0 : t.node_count > 0))
    .sort((a, b) => a.ordering - b.ordering);
}

/**
 * Topic — and it narrows in place, as the designer asks: selecting one filters
 * every collection at once and the chip persists as the reader moves into a
 * collection.
 *
 * **The door survives at the foot of the section.** "Everything filed under
 * this topic wherever it lives" is a real question; it is just not the one being
 * asked by someone standing on a shelf, and it used to cost them the shelf to
 * ask it by accident. One topic selected has somewhere to go and several do not
 * — `?topic=` takes one code — so the link appears only for the one.
 */
function TopicChips({
  topics,
  state,
  basePath,
}: {
  topics: Topic[];
  state: FindState;
  basePath: string;
}) {
  const on = state.selection.topic ?? [];
  const single = on.length === 1 ? topics.find((t) => t.code === on[0]) : undefined;
  return (
    <>
      <div className="flex flex-wrap gap-2" role="group" aria-label={AXIS_LABEL.topic}>
        {topics.map((topic) => (
          <Chip
            key={topic.code}
            /* The one taxonomy label that arrives in Hindi and is shown as a
               manager typed it — they add topics without a deploy, so the FE
               cannot hold a label it has never seen. */
            label={topic.name}
            href={findHref(basePath, toggleChip(state, "topic", topic.code))}
            selected={isChipOn(state, "topic", topic.code)}
          />
        ))}
      </div>
      {single && (
        <p className="mt-3">
          <Link
            href={`/library?topic=${encodeURIComponent(single.code)}`}
            className="inline-flex min-h-11 items-center text-sm font-semibold"
            style={{ color: "var(--ws-ink)" }}
          >
            See this topic across the whole library →
          </Link>
        </p>
      )}
    </>
  );
}

/**
 * Years, as the bands `years.ts` decides — individual years while they still
 * fit, five-year ranges once they do not.
 *
 * "All years" leads, as the comp draws it, and it is the axis's way out: a band
 * is a shorthand for the years inside it, so turning several off one at a time
 * is four taps for one decision.
 */
function YearChips({
  options,
  state,
  basePath,
}: {
  options: FacetValue[];
  state: FindState;
  basePath: string;
}) {
  const bands = yearBands(options);
  const any = (state.selection.year?.length ?? 0) > 0;
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={AXIS_LABEL.year}>
      <Chip
        label="All years"
        href={findHref(basePath, clearAxis(state, "year"))}
        selected={!any}
        /* A position in a set where something is always true, not a filter
           switched on — so `tint`, and no check. */
        variant="tint"
      />
      {bands.map((band) => (
        <Chip
          key={band.label}
          label={band.label}
          href={findHref(basePath, toggleGroup(state, "year", band.values))}
          selected={band.values.every((v) => isChipOn(state, "year", v))}
        />
      ))}
    </div>
  );
}

/**
 * What is currently on, under the controls and above the count — the comp's
 * "filters active" row.
 *
 * Each chip removes its own filter and `Clear` removes all of them, both by
 * navigation, because these are the same chips as the ones in the sheet seen
 * from outside it. What it never touches is the query or an axis the page owns:
 * clearing the filters on `/av` must leave the reader on Audio/Video rather than
 * quietly widening to the whole library, which is a different question than the
 * one they asked.
 */
export function ActiveFindFilters({
  topics,
  facets,
  state,
  basePath,
  hideAxes = [],
}: {
  topics: Topic[];
  facets: LibraryFacets;
  state: FindState;
  basePath: string;
  hideAxes?: FindAxis[];
}) {
  const router = useRouter();
  const axes = liveAxes(facets, state, hideAxes);
  if (shownCount(axes, state) === 0) return null;

  const go = (next: FindState) => router.push(findHref(basePath, next));
  const items: { key: string; label: string; onRemove: () => void }[] = [];

  for (const { axis, options } of axes) {
    const on = state.selection[axis] ?? [];
    if (on.length === 0) continue;

    if (axis === "year") {
      // Grouped back into the bands they were chosen as — a reader who turned
      // "2004–2008" on should not be handed five chips to turn it off with.
      const bands = yearBands(options);
      const covered = new Set<string>();
      for (const band of bands) {
        if (!band.values.every((v) => on.includes(v))) continue;
        band.values.forEach((v) => covered.add(v));
        items.push({
          key: `year:${band.label}`,
          label: band.label,
          onRemove: () => go(toggleGroup(state, "year", band.values)),
        });
      }
      for (const value of on.filter((v) => !covered.has(v))) {
        items.push({
          key: `year:${value}`,
          label: value,
          onRemove: () => go(toggleChip(state, "year", value)),
        });
      }
      continue;
    }

    for (const value of on) {
      items.push({
        key: `${axis}:${value}`,
        label: valueLabel(axis, value, options, topics),
        onRemove: () => go(toggleChip(state, axis, value)),
      });
    }
  }

  return (
    <div className="mt-3">
      <ActiveFilters items={items} onClear={() => go(clearShown(state, axes))} />
    </div>
  );
}

/**
 * What a lit chip says outside the sheet.
 *
 * The facet is asked first because it is the only thing that labels a place or
 * a person; a topic that has scrolled out of the current scope's facets still
 * has its name in the manager's list, and a value with neither is shown as
 * itself rather than dropped — a filter the reader cannot see is a filter they
 * cannot remove.
 */
function valueLabel(
  axis: FindAxis,
  value: string,
  options: FacetValue[],
  topics: Topic[]
): string {
  const facet = options.find((o) => o.value === value);
  if (facet) return chipLabel(axis, facet);
  if (axis === "topic") return topics.find((t) => t.code === value)?.name ?? value;
  if (axis === "kind") return KIND_LABEL[value as FileKind] ?? value;
  return value;
}

/** Kinds in the order files are shown in, not in the order they were counted. */
function orderedKinds(facets: FacetValue[] | undefined): FacetValue[] {
  const by = new Map((facets ?? []).map((f) => [f.value, f]));
  const known = KIND_ORDER.map((k) => by.get(k)).filter((f): f is FacetValue => !!f);
  const rest = (facets ?? []).filter((f) => !KIND_ORDER.includes(f.value as FileKind));
  return [...known, ...rest];
}
