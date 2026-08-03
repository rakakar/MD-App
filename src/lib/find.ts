/**
 * **Find** — the query and chips a shelf or folder page is being asked
 * (contract §13.8, `docs/Catalogue_Search_v1.md`).
 *
 * The library has two ways of listing folders and they are different calls.
 * *Browsing* (`nodes/`, §13.2) is one level, cached, no breadcrumbs — the
 * shelf a reader lands on. *Finding* (`library/search/`) is deep, ranked,
 * faceted and paginated, and every row carries its path because its rows come
 * from everywhere. The FE switches between them on exactly one test, which is
 * `isAsked` below: **no query and no chip → browse; otherwise → find.**
 *
 * Everything lives in the URL, so a narrowed shelf is a real address: it can
 * be shared, bookmarked, and the back button walks the reader out of a filter
 * one chip at a time (U9).
 */

/**
 * The sieve, in the order it is drawn.
 *
 * प्रमाण first: "उनका अपना कौन सा है?" is the question this collection exists
 * to answer, and it outranks which year a thing is from. प्रकार last: "सिर्फ़
 * audio दिखाओ, चलते-फिरते सुनना है" is a real need but never the first one, and
 * a format filter at the top turns a library back into a file browser.
 *
 * विषय is deliberately **not** here. It is a *door* onto the whole library
 * rather than a sieve over the scope in hand — tapping one leaves the folder
 * you are in (§13.4) — so it is drawn above these and navigates.
 */
export const FIND_AXES = [
  "provenance",
  "year",
  "place",
  "person",
  "language",
  "kind",
] as const;

export type FindAxis = (typeof FIND_AXES)[number];

/**
 * The chips currently on, one list per axis.
 *
 * A list rather than a single value, because the endpoint ORs within an axis
 * and ANDs across them: `year=2019&year=2020` is "either season", while
 * `year=2019&kind=audio` is "audio from 2019". A reader comparing two shivir
 * years should not have to pick one and start over.
 */
export type FindSelection = Partial<Record<FindAxis, string[]>>;

export interface FindState {
  /** what was typed; `""` when the box is empty */
  q: string;
  selection: FindSelection;
  /** search exactly as typed, skipping the Devanagari rewrite (§13.8) */
  raw: boolean;
}

/** The BE's floor, mirrored so the FE never sends a query it knows is ignored. */
export const MIN_QUERY_CHARS = 2;

/** one page of results — the endpoint's own default, and its step size */
export const FIND_PAGE = 25;

export const EMPTY_FIND: FindState = { q: "", selection: {}, raw: false };

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  if (value === undefined) return "";
  return (Array.isArray(value) ? (value[0] ?? "") : value).trim();
}

function all(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : [value]).map((v) => v.trim()).filter(Boolean);
}

/** Read a page's `searchParams` into the find it describes. */
export function readFind(params: RawParams): FindState {
  const selection: FindSelection = {};
  for (const axis of FIND_AXES) {
    const values = all(params[axis]);
    if (values.length > 0) selection[axis] = values;
  }
  return { q: first(params.q), selection, raw: first(params.raw) === "1" };
}

/** how many chips are on — what "Clear 3" counts */
export function chipCount(state: FindState): number {
  return FIND_AXES.reduce((n, axis) => n + (state.selection[axis]?.length ?? 0), 0);
}

/**
 * The one switch. A query too short to search is not a question, so a reader
 * typing the first letter still sees the shelf rather than an empty screen.
 */
export function isAsked(state: FindState): boolean {
  return state.q.length >= MIN_QUERY_CHARS || chipCount(state) > 0;
}

/**
 * One chip on or off, leaving the rest of the find alone.
 *
 * Tapping a lit chip clears it, which is the only way back out of one on a
 * phone without a second control beside every row.
 */
export function toggleChip(state: FindState, axis: FindAxis, value: string): FindState {
  const current = state.selection[axis] ?? [];
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
  const selection = { ...state.selection };
  if (next.length > 0) selection[axis] = next;
  else delete selection[axis];
  return { ...state, selection };
}

export function isChipOn(state: FindState, axis: FindAxis, value: string): boolean {
  return (state.selection[axis] ?? []).includes(value);
}

/**
 * The find as query parameters — the same shape in the page's URL and in the
 * request, so what a reader can see in the address bar is what was asked.
 */
export function findQuery(state: FindState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  for (const axis of FIND_AXES) {
    for (const value of state.selection[axis] ?? []) params.append(axis, value);
  }
  if (state.raw) params.set("raw", "1");
  return params;
}

/** this page, narrowed by this find — the href every chip and the box write */
export function findHref(basePath: string, state: FindState): string {
  const query = findQuery(state).toString();
  return query ? `${basePath}?${query}` : basePath;
}

/**
 * Roughly how many rows the scope holds, read off the facets it came back with.
 *
 * There is no count of a subtree in the contract — `child_count` is deliberately
 * shallow (§13.1) and an unasked find returns no results — but every row is
 * counted on every axis it has a value for, so the widest axis is the scope's
 * size. `language` is normally that axis, because the column has a default and
 * every row therefore answers it; taking the maximum rather than trusting one
 * axis means a blank column can only ever make this cautious, never wrong.
 */
export function scopeSize(facets: Partial<Record<string, { count: number }[]>>): number {
  return Object.values(facets).reduce(
    (widest, values) =>
      Math.max(widest, (values ?? []).reduce((sum, chip) => sum + chip.count, 0)),
    0
  );
}

/**
 * Below this many rows beneath a folder, the folder *is* the answer.
 *
 * Six files listed on screen are read faster than a search box is understood,
 * and a box above them is chrome charging rent on the one screen where the
 * reader has already arrived. A shelf always gets one regardless — a shelf is
 * the top of a workspace and "search this shelf" is the question it exists to
 * be asked.
 */
export const FIND_MIN_ROWS = 8;
