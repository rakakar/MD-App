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
 * Source first: "which of these is his own?" is the question this collection
 * exists to answer, and it outranks which year a thing is from. Type last:
 * "just show me audio" is a real need but never the first one, and
 * a format filter at the top turns a library back into a file browser.
 *
 * Topic is not in this list, and that is a layout fact rather than a semantic
 * one now. It **is** a filter — see `ALL_AXES` — but it is drawn in its own
 * panel above these rather than as a seventh chip row, because it is the axis
 * a reader reaches for first and the only one whose values a manager writes.
 */
export const FIND_AXES = [
  "provenance",
  "year",
  "place",
  "person",
  "language",
  "kind",
] as const;

/**
 * Every axis the URL and the endpoint carry, Topic included.
 *
 * **Topic used to navigate away and now narrows in place.** It was drawn as a
 * *door* onto the whole library (§13.4): tapping a topic on a shelf left
 * the shelf for `/library?topic=`, a flat list from every depth and every
 * workspace, and the collections the reader had been looking at were gone. The
 * designer draws it as a filter instead — the tiles stay put and their counts
 * drop — and the endpoint has always been able to answer that: `topic` is one
 * of the seven axes in `catalogue.AXES`, read by `Selection` and counted by
 * `facets` exactly like the six above. The FE was the only thing treating it
 * as a different kind of control.
 *
 * The door survives as a link inside the panel, because "everything filed under
 * a topic, wherever it lives" is still a real question — just not the one a
 * reader is asking while standing on a shelf looking at its collections.
 *
 * Anything that reads or writes the whole find — the URL, the chip count, the
 * request — iterates this. Anything that *draws the sieve* iterates
 * `FIND_AXES`, which is these six minus the one with its own panel.
 */
export const ALL_AXES = [...FIND_AXES, "topic"] as const;

export type FindAxis = (typeof ALL_AXES)[number];

/** the six axes the sieve draws as chip rows — `FindAxis` minus Topic */
export type SieveAxis = (typeof FIND_AXES)[number];

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
  for (const axis of ALL_AXES) {
    const values = all(params[axis]);
    if (values.length > 0) selection[axis] = values;
  }
  return { q: first(params.q), selection, raw: first(params.raw) === "1" };
}

/** how many chips are on — what "Clear 3" counts */
export function chipCount(state: FindState): number {
  return ALL_AXES.reduce((n, axis) => n + (state.selection[axis]?.length ?? 0), 0);
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
 * Several values on one axis at once — what a **year band** writes.
 *
 * A band is not a new kind of filter, it is a shorthand for the years inside
 * it: the endpoint ORs within an axis, so "2001–2005" is `year=2001&year=2002…`
 * and needs nothing from the BE. On or off as a unit, and off means off for
 * every year it covers — a reader who turned one band on and expects one tap to
 * turn it off should not be left holding four of its five years.
 */
export function toggleGroup(
  state: FindState,
  axis: FindAxis,
  values: string[]
): FindState {
  const current = state.selection[axis] ?? [];
  const on = values.every((v) => current.includes(v));
  const next = on
    ? current.filter((v) => !values.includes(v))
    : [...current, ...values.filter((v) => !current.includes(v))];
  const selection = { ...state.selection };
  if (next.length > 0) selection[axis] = next;
  else delete selection[axis];
  return { ...state, selection };
}

/** Everything on one axis off, leaving the other axes and the query alone. */
export function clearAxis(state: FindState, axis: FindAxis): FindState {
  const selection = { ...state.selection };
  delete selection[axis];
  return { ...state, selection };
}

/**
 * The find as query parameters — the same shape in the page's URL and in the
 * request, so what a reader can see in the address bar is what was asked.
 */
export function findQuery(state: FindState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  for (const axis of ALL_AXES) {
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
 * The find a page gets when it **owns** an axis rather than merely offering it.
 *
 * `/av` is the whole library sieved to audio and video: the reader can narrow
 * to one of the two, and cannot widen past both, because widening past both is
 * a different page. So the axis is read from the URL and then held inside the
 * page's own range — three legitimate addresses (`/av`, `?kind=audio`,
 * `?kind=video`) and nothing else.
 *
 * Clamping rather than trusting matters because the URL is public: a hand-typed
 * or stale `?kind=pdf` would otherwise put documents on a page that says
 * Audio/Video at the top. Out-of-range values fall back to the full lock rather
 * than to nothing, since an empty selection would turn the find back into a
 * browse and quietly show the reader everything.
 */
export function lockAxis(state: FindState, axis: FindAxis, allowed: string[]): FindState {
  const asked = (state.selection[axis] ?? []).filter((v) => allowed.includes(v));
  return {
    ...state,
    selection: { ...state.selection, [axis]: asked.length > 0 ? asked : allowed },
  };
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
