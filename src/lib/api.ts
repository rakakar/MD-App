import type {
  ApiWorkspace,
  AudioSeries,
  AudioTrack,
  BookDetail,
  BookGenre,
  BookSummary,
  CenterItem,
  ChapterPayload,
  EventItem,
  Folder,
  PageResolution,
  ParaResolution,
  ParibhashaFullIndex,
  ParibhashaHit,
  ParibhashaIndex,
  ParibhashaWord,
  Playlist,
  ResourceCollection,
  ResourceCollectionDetail,
  ResourceFacet,
  ResourceItem,
  ResourceKind,
  ResourceLane,
  SearchResponse,
  SearchResult,
  SutraOfTheDay,
  VideoItem,
} from "./types";

// Content is immutable until republished, Cache-Control: public, max-age=900
// (contract §5) — mirror that TTL in ISR revalidation.
export const CONTENT_REVALIDATE_SECONDS = 900;

export function apiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is not set (e.g. https://mdbe.welfareinfo.net/api/v1/)"
    );
  }
  return base.endsWith("/") ? base : `${base}/`;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public url: string,
    message?: string
  ) {
    super(message ?? `API ${status} for ${url}`);
    this.name = "ApiError";
  }
}

interface FetchOpts {
  /** ISR revalidate window; defaults to the contract's 900s for GETs */
  revalidate?: number | false;
  /** include session cookie — required for /me/ and mutations */
  credentials?: boolean;
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
}

async function apiFetch<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const url = new URL(path.replace(/^\//, ""), apiBase()).toString();
  const init: RequestInit & { next?: { revalidate: number | false } } = {
    method: opts.method ?? "GET",
    headers: { Accept: "application/json" },
    signal: opts.signal,
  };
  if (opts.body !== undefined) {
    init.body = JSON.stringify(opts.body);
    (init.headers as Record<string, string>)["Content-Type"] = "application/json";
  }
  if (opts.credentials) {
    init.credentials = "include";
    // Django CSRF for session-authenticated mutations (same parent domain, §1).
    if (init.method !== "GET" && typeof document !== "undefined") {
      const csrf = document.cookie
        .split("; ")
        .find((c) => c.startsWith("csrftoken="))
        ?.split("=")[1];
      if (csrf) (init.headers as Record<string, string>)["X-CSRFToken"] = csrf;
    }
  } else if (init.method === "GET") {
    init.next = { revalidate: opts.revalidate ?? CONTENT_REVALIDATE_SECONDS };
  }
  const res = await fetch(url, init);
  if (!res.ok) throw new ApiError(res.status, url);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function qs(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

// DRF endpoints may paginate; accept either a bare array or {results: []}.
function unwrapList<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : (data?.results ?? []);
}

// ---- Reader contract (§§2–5, frozen) ----

/**
 * Published books, narrowed by whichever axis the shelf is organized on
 * (contract §10.3). Originals filter by `genre`, Translations by `language`;
 * they are deliberately different axes, not one shared control.
 *
 * `genre` matches a translation through its original, so ?genre=darshan
 * returns the English MVD too. That is intended.
 */
export async function getBooks(
  opts: { workspace?: string; genre?: string; language?: string } = {}
): Promise<BookSummary[]> {
  return unwrapList(
    await apiFetch<BookSummary[] | { results: BookSummary[] }>(
      `books/${qs({
        workspace: opts.workspace,
        genre: opts.genre,
        language: opts.language,
      })}`
    )
  );
}

/**
 * The Originals shelf's chips. Manager-editable, so it is always fetched —
 * see the note on BookGenre for why a constant here would lose books.
 */
export async function getBookGenres(): Promise<BookGenre[]> {
  return unwrapList(await apiFetch<BookGenre[] | { results: BookGenre[] }>("book-genres/"));
}

export async function getBook(code: string): Promise<BookDetail> {
  return apiFetch<BookDetail>(`books/${encodeURIComponent(code)}/`);
}

export async function getChapter(code: string, number: number): Promise<ChapterPayload> {
  return apiFetch<ChapterPayload>(
    `books/${encodeURIComponent(code)}/chapters/${number}/`
  );
}

export async function resolvePage(code: string, page: number): Promise<PageResolution> {
  return apiFetch<PageResolution>(`books/${encodeURIComponent(code)}/pages/${page}/`);
}

export async function resolvePara(canonicalRef: string): Promise<ParaResolution> {
  return apiFetch<ParaResolution>(`paras/${encodeURIComponent(canonicalRef)}/`);
}

/**
 * Sutra of the day (contract §2.6). `offset` steps along the curated sequence
 * for the card's ← → arrows; 0 is always today's pick.
 *
 * A 404 is the documented "nothing there" answer, not a failure — it becomes
 * null so the home page simply renders no card (and a walked-off-the-end arrow
 * renders nothing new). Every other error still throws.
 */
export async function getSutraOfTheDay(offset = 0): Promise<SutraOfTheDay | null> {
  try {
    return await apiFetch<SutraOfTheDay>(`sutra/today/${qs({ offset: offset || undefined })}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

// ---- §9 live endpoints ----

/**
 * The five workspaces (contract §10.1), in `ordering` order.
 *
 * Never a constant in here — same rule as the genre chips. `root_node_id` is
 * the folder each shelf opens into, and it is `null` for `journey` and for any
 * workspace whose root is unpublished, so callers branch on it rather than
 * assuming an id is there.
 */
export async function getWorkspaces(): Promise<ApiWorkspace[]> {
  return unwrapList(await apiFetch<ApiWorkspace[] | { results: ApiWorkspace[] }>("workspaces/"));
}

// ---- Resources — collections behind purpose doors (§13) ----
//
// The old `documents/` endpoint is gone. The shelf's unit is now the
// collection, and browsing is doors → facet chips → cards → album page; the
// folder tree below survives only as the archivist's "सभी फ़ाइलें" fallback.

/**
 * The Resources landing page's doors, in `ordering` order.
 *
 * Manager-editable, so it is always fetched and never a constant here — same
 * rule as the genre chips. A door with nothing servable behind it is already
 * left out by the BE, so every row that arrives is worth rendering as-is.
 */
export async function getResourceDoors(): Promise<ResourceFacet[]> {
  return unwrapList(await apiFetch<ResourceFacet[] | { results: ResourceFacet[] }>(
    "resources/doors/"
  ));
}

/**
 * The विषय chips. Unlike doors, *all* topics are returned — the FE hides the
 * zero-count ones, because a chip that filters to nothing is a dead control.
 */
export async function getResourceTopics(): Promise<ResourceFacet[]> {
  return unwrapList(await apiFetch<ResourceFacet[] | { results: ResourceFacet[] }>(
    "resources/topics/"
  ));
}

export interface CollectionFilters {
  door?: string;
  topic?: string;
  /** prefix match, so "2005" also matches "2005-03" */
  year?: string;
  place?: string;
  person?: string;
  language?: string;
  kind?: ResourceKind;
  provenance?: string;
  section?: string;
}

/** one page of cards, plus the cursor for the next one */
interface CollectionPage {
  results: ResourceCollection[];
  next: string | null;
}

async function collectionPage(
  filters: CollectionFilters,
  cursor?: string
): Promise<CollectionPage> {
  // A cursor arrives as an absolute URL. Only its query is reused, re-anchored
  // to our own base, so a BE misconfigured with the wrong public host can never
  // send us off to fetch someone else's origin (same rule as paribhasha/).
  const query = cursor
    ? new URL(cursor).search
    : qs({
        door: filters.door,
        topic: filters.topic,
        year: filters.year,
        place: filters.place,
        person: filters.person,
        language: filters.language,
        kind: filters.kind,
        provenance: filters.provenance,
        section__code: filters.section,
      });
  const data = await apiFetch<{ results?: ResourceCollection[]; next?: string | null }>(
    `resources/collections/${query}`
  );
  return { results: data.results ?? [], next: data.next ?? null };
}

/**
 * The cards behind a door or a facet.
 *
 * The endpoint is cursor-paginated at 50, and a door page needs the whole set
 * anyway: the वर्ष/स्थान/व्यक्ति/भाषा chips are *derived* from the collections
 * themselves (there is no facet-values endpoint), so a half-read list would
 * quietly offer half the chips. Pages are therefore followed to the end,
 * bounded — a door that has grown past the cap renders what arrived and says
 * so rather than walking a shelf of unknown size on every request.
 */
export const COLLECTION_PAGE_CAP = 4;

export async function getCollections(
  filters: CollectionFilters = {},
  maxPages = COLLECTION_PAGE_CAP
): Promise<{ results: ResourceCollection[]; truncated: boolean }> {
  const results: ResourceCollection[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < maxPages; page += 1) {
    const { results: rows, next } = await collectionPage(filters, cursor);
    results.push(...rows);
    if (!next) return { results, truncated: false };
    cursor = next;
  }
  return { results, truncated: true };
}

/**
 * The album view (§13.4) — the card plus its published items in `sequence`
 * order. A 404 means the collection is unpublished or has nothing openable
 * behind it, which is an ordinary answer here, so it becomes null.
 */
export async function getCollection(id: number): Promise<ResourceCollectionDetail | null> {
  try {
    return await apiFetch<ResourceCollectionDetail>(`resources/collections/${id}/`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

/**
 * One level of the archivist's fallback tree. No `parent` is the root level.
 *
 * A folder with nothing published anywhere beneath it is not returned at all
 * — the library is still being migrated — so navigation never lands in an
 * empty branch and no empty-folder state is needed.
 */
export async function getFolders(parent?: number): Promise<Folder[]> {
  return unwrapList(
    await apiFetch<Folder[] | { results: Folder[] }>(`folders/${qs({ parent })}`)
  );
}

/** The published items sitting in one folder — the "सभी फ़ाइलें" view only. */
export async function getResourceItems(
  opts: { folder?: number; kind?: ResourceKind } = {}
): Promise<ResourceItem[]> {
  return unwrapList(
    await apiFetch<ResourceItem[] | { results: ResourceItem[] }>(
      `resources/items/${qs({ folder: opts.folder, kind: opts.kind })}`
    )
  );
}

/**
 * The संसाधन lane (§13.5). **Metadata only** — titles, descriptions, topics,
 * tags, people, place, year, source path. File contents are never indexed and
 * never will be, which is exactly why these hits are rendered in their own
 * lane: a citation is quotable back to A. Nagraj ji, a metadata match is not.
 */
export async function searchResources(
  q: string,
  signal?: AbortSignal
): Promise<ResourceLane> {
  const data = await apiFetch<Partial<ResourceLane>>(
    `resources/search/${qs({ q })}`,
    { signal }
  );
  return {
    collections: data.collections ?? [],
    audio: data.audio ?? [],
    video: data.video ?? [],
  };
}

/**
 * "नागराज जी की वाणी" (§13.6) — everything published with provenance = मूल,
 * across *all* sections. The reader never needs to know that resources holds
 * most of it underneath.
 */
export async function getVani(): Promise<ResourceLane> {
  const data = await apiFetch<Partial<ResourceLane>>("vani/");
  return {
    collections: data.collections ?? [],
    audio: data.audio ?? [],
    video: data.video ?? [],
  };
}

/**
 * A book's original PDF (§13.9) — the whole reading experience for a PDF-only
 * book, and the fidelity download for a pipelined one.
 *
 * Handed to the browser as a URL rather than fetched: the endpoint answers 302
 * to a short-lived signed URL, so following it here would bake an expiring
 * link into an ISR-cached page. Letting the viewer or the download follow the
 * redirect itself means the signature is always minted fresh.
 */
export function bookPdfUrl(code: string): string {
  return new URL(`books/${encodeURIComponent(code)}/pdf/`, apiBase()).toString();
}

export async function getEvents(): Promise<EventItem[]> {
  return unwrapList(
    await apiFetch<EventItem[] | { results: EventItem[] }>("events/", {
      revalidate: 300, // Connect home wants a short revalidate (PRD §4)
    })
  );
}

export async function getCenters(): Promise<CenterItem[]> {
  return unwrapList(await apiFetch<CenterItem[] | { results: CenterItem[] }>("centers/"));
}

export async function registerForEvent(
  eventId: number,
  payload: Record<string, string>
): Promise<unknown> {
  return apiFetch(`events/${eventId}/register/`, {
    method: "POST",
    body: payload,
    credentials: true,
  });
}

// ---- परिभाषा — the glossary (§14) ----

/** one screenful of glossary rows, plus the cursor for the next one */
export interface ParibhashaPage {
  results: ParibhashaWord[];
  /**
   * Cursor for the next page, or null at the end. Only `letter` browsing
   * paginates — a `q` search answers with one screenful and stops, because a
   * dictionary search that paginates has already failed to find the word.
   */
  next: string | null;
}

/**
 * The glossary page (§14.1): `q` ranked search, `letter` for the अ आ इ index.
 *
 * Roman spelling is a first-class key on the BE — `anubhav`, `anubhaav` and
 * `anubhava` all reach अनुभव — so pass whatever was typed and do no folding
 * here. There is no Latin-keyboard special case to write.
 */
export async function getParibhasha(
  opts: { q?: string; letter?: string; cursor?: string } = {}
): Promise<ParibhashaPage> {
  // A cursor arrives as an absolute URL. Only its query is reused, re-anchored
  // to our own base, so a BE misconfigured with the wrong public host can
  // never send the browser off to fetch someone else's origin.
  const query = opts.cursor
    ? new URL(opts.cursor).search
    : qs({ q: opts.q, letter: opts.letter });
  const data = await apiFetch<{ results?: ParibhashaWord[]; next?: string | null }>(
    `paribhasha/${query}`
  );
  return { results: data.results ?? [], next: data.next ?? null };
}

/** One word by id (§14.2). 404 — a hidden word — becomes null. */
export async function getParibhashaWord(id: number): Promise<ParibhashaWord | null> {
  try {
    return await apiFetch<ParibhashaWord>(`paribhasha/${id}/`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

/**
 * The underlining index (§14.3) — every headword, ~25 KB gzipped, cached for
 * a day by the BE. Downloaded once and kept in IndexedDB so marking known
 * words costs no request per paragraph, ever.
 */
export async function getParibhashaIndex(signal?: AbortSignal): Promise<ParibhashaIndex> {
  return apiFetch<ParibhashaIndex>("paribhasha/index/", {
    revalidate: 86_400,
    signal,
  });
}

/**
 * The whole dictionary in one request (§14.3, `?full=1`) — every word with
 * its definitions, ~143 KB gzipped.
 *
 * This is what makes a tap answerable offline. It is deliberately **not**
 * fetched with the index: underlining needs headwords alone and is off by
 * default, so a reader who never opens a definition should not pay for one.
 * Call it when the glossary is actually used.
 */
export async function getParibhashaFull(signal?: AbortSignal): Promise<ParibhashaFullIndex> {
  return apiFetch<ParibhashaFullIndex>("paribhasha/index/?full=1", {
    revalidate: 86_400,
    signal,
  });
}

/**
 * The tap (§14.4). Answers with **one word or 404**, never a list: the reader
 * tapped a specific word and the popover has room for its meaning, not for a
 * menu of guesses. A 404 is an ordinary answer here, so it becomes null.
 */
export async function lookupParibhasha(
  word: string,
  signal?: AbortSignal
): Promise<ParibhashaWord | null> {
  try {
    return await apiFetch<ParibhashaWord>(`paribhasha/lookup/${qs({ word })}`, { signal });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

interface SearchEnvelope {
  query: string;
  searched_as?: string;
  mode?: "hybrid" | "keyword";
  terms?: string[];
  results?: Record<string, { estimated_total?: number; hits?: Record<string, unknown>[] }>;
}

// live index key → forward-compatible result type (PRD §7). v1 returns only
// `paragraphs`; audio/videos come back when AV transcripts get an index.
const SEARCH_TYPE: Record<string, SearchResult["type"]> = {
  paragraphs: "text",
  audio: "audio",
  videos: "video",
};

/**
 * Search across published books (contract §9). Hindi, Hinglish and English
 * queries all work — the BE rewrites Latin script to Devanagari before
 * searching and reports what it searched in `searchedAs`.
 *
 * **Originals only.** Translations and resource documents are not indexed and
 * never will be: retrieval is tuned for Devanagari, and a citation has to be
 * quotable back to A. Nagraj ji rather than to a student's rendering. So
 * `workspace` can only ever narrow originals — never offer it as a way to
 * reach the other two shelves, because there is nothing there to reach.
 *
 * Never paginated: the BE returns the whole (small, ranked) result set in one
 * call, so "show more" is a client-side reveal and costs no round-trip.
 */
export async function search(
  q: string,
  opts: {
    workspace?: string;
    book?: string;
    limit?: number;
    /** search the query exactly as typed, skipping the Devanagari rewrite */
    raw?: boolean;
    signal?: AbortSignal;
  } = {}
): Promise<SearchResponse> {
  const envelope = await apiFetch<SearchEnvelope>(
    `search${qs({
      q,
      workspace: opts.workspace,
      book: opts.book,
      limit: opts.limit,
      raw: opts.raw ? 1 : undefined,
    })}`,
    { signal: opts.signal }
  );
  // The glossary block is lifted out before the passage indexes are flattened.
  // It is not a passage and must never be treated as one: its rows have no
  // canonical_ref, no snippet and no book, so the flatten below turned each of
  // them into a blank result card pointing at /books — and inflated the count.
  const { paribhasha, ...passageIndexes } = envelope.results ?? {};

  const results: SearchResult[] = [];
  for (const [index, bucket] of Object.entries(passageIndexes)) {
    for (const hit of bucket.hits ?? []) {
      // Each hit carries its own `type`; the index map is the fallback for a
      // bucket that predates it (contract §9.1).
      const type = (hit.type as SearchResult["type"]) ?? SEARCH_TYPE[index] ?? "text";
      results.push({ ...hit, type } as SearchResult);
    }
  }
  return {
    results,
    total: results.length,
    paribhasha: (paribhasha?.hits ?? []) as unknown as ParibhashaHit[],
    searchedAs: envelope.searched_as ?? "",
    mode: envelope.mode ?? "hybrid",
    terms: envelope.terms ?? [],
  };
}
