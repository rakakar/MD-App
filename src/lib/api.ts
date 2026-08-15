import { recordApiFailure } from "./clientErrors";
import { EMPTY_FIND, effectiveOrdering, findQuery, type FindState } from "./find";
import type {
  ApiWorkspace,
  BookDetail,
  BookGenre,
  BookSummary,
  CenterItem,
  ChapterPayload,
  EventItem,
  LibraryFindResponse,
  LibraryNode,
  LibrarySearchRow,
  LocatedNodeCard,
  NodeCard,
  PageResolution,
  ParaResolution,
  ParibhashaFullIndex,
  ParibhashaHit,
  ParibhashaIndex,
  ParibhashaWord,
  SearchResponse,
  SearchResult,
  ShortClip,
  SutraOfTheDay,
  Topic,
} from "./types";

/**
 * How long a fetched payload may be reused, mirroring the API's own
 * `Cache-Control: max-age` (contract §5).
 *
 * A page is only as fresh as the *later* of two windows — this one and the
 * route's `revalidate` (see `app/layout.tsx`) — so both have to come down
 * together for content to appear sooner.
 *
 * Unlike the route's, this one is an ordinary runtime value and reads an env
 * var, so it can be changed in Vercel's settings rather than in code. Default
 * 900; the alpha runs it lower to match the layout.
 */
export const CONTENT_REVALIDATE_SECONDS = (() => {
  // Trimmed and length-checked before Number(), because `Number("")` is 0 —
  // and a var that is present but empty, which is what a blank line in a
  // dashboard gives you, would otherwise mean "never cache" and send every
  // single render to the origin. Nothing here may turn caching off by
  // accident; setting it to 0 has to be deliberate.
  const raw = (process.env.CONTENT_REVALIDATE_SECONDS ?? "").trim();
  const seconds = Number(raw);
  return raw !== "" && Number.isFinite(seconds) && seconds >= 0 ? seconds : 900;
})();

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
  if (!res.ok) {
    // Remembered so the next bug report carries it. Status and path only —
    // see lib/feedback.ts.
    recordApiFailure(url, res.status);
    throw new ApiError(res.status, url);
  }
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

/**
 * The home rail's shorts (contract §2.7), newest first, pinned ones ahead of
 * them. `limit` is clamped by the BE (max 60), never rejected.
 *
 * Cached like everything else here, and the window matters more than usual: the
 * BE refreshes the mirror hourly and caches for 900s, so this is at worst about
 * an hour behind the channel — which is the whole promise of the feature and not
 * something to shorten by fetching more often.
 */
export async function getShortClips(limit?: number): Promise<ShortClip[]> {
  return unwrapList(
    await apiFetch<ShortClip[] | { results: ShortClip[] }>(`shorts/${qs({ limit })}`)
  );
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

// ---- The library — one tree for everything that is not a book (§13) ----
//
// One shape at every depth, so one component renders the whole tree. What used
// to be four endpoint families — doors, collections, folders, audio series —
// is `nodes/` and nothing else.

/**
 * One folder in full (§13.1): its own facts, its breadcrumb, its child
 * folders, its files, and anything cross-posted in.
 *
 * A 404 is an ordinary answer here, not a failure — a folder is visible only
 * while it *and every one of its ancestors* is published, so un-publishing one
 * folder hides its whole branch and links into it start 404ing by design
 * (§13.3). Callers turn that into `notFound()`.
 */
export async function getNode(id: number): Promise<LibraryNode> {
  return apiFetch<LibraryNode>(`nodes/${id}/`);
}

/**
 * A level of the tree as cards.
 *
 * `parent` is one level down; without it the call answers with the *root*
 * folders. Prefer `root_node_id` from `workspaces/` over `{ workspace }`
 * here: it reaches the same folder without the round trip spent discovering
 * an id (§10.1).
 *
 * Browsing only. A topic is `openTopic` below — same endpoint, different
 * question, and the two return different cards (§13.2).
 */
export async function getNodes(
  opts: { workspace?: string; parent?: number } = {}
): Promise<NodeCard[]> {
  return unwrapList(
    await apiFetch<NodeCard[] | { results: NodeCard[] }>(
      `nodes/${qs({ workspace: opts.workspace, parent: opts.parent })}`
    )
  );
}

/**
 * A door onto the whole library: every folder on a topic, at any depth (§13.2).
 *
 * Separate from `getNodes` because it is not a level and the rows are not the
 * same card. Browsing asks "what is inside this folder?", where every answer
 * shares the page's own path; a door gathers from every depth and workspace,
 * so each row carries a `breadcrumb` and needs it — "दिन 1" names one folder
 * in a shivir and nothing at all in a list of twelve.
 */
export async function openTopic(
  opts: { topic?: string; provenance?: string; workspace?: string }
): Promise<LocatedNodeCard[]> {
  return unwrapList(
    await apiFetch<LocatedNodeCard[] | { results: LocatedNodeCard[] }>(
      `nodes/${qs({
        topic: opts.topic,
        provenance: opts.provenance,
        workspace: opts.workspace,
      })}`
    )
  );
}

/**
 * The child folders of one node, as cards.
 *
 * The single place `children` is read, on purpose. Nothing in the library is
 * paginated today — a folder holds a handful and paging would be complexity
 * bought for nobody — but the pCloud import will produce folders with hundreds
 * of children, and at that point `children` in the detail payload gets capped
 * and `?parent=` grows pagination (§13.2). Every caller going through here is
 * what makes that day an afternoon rather than a rewrite.
 */
export function nodeChildren(node: LibraryNode): NodeCard[] {
  return node.children;
}

/**
 * The topic chips (§13.4) — a door onto the whole library, counted library-wide.
 *
 * All topics are returned and the FE hides the zero-count ones: a chip that
 * filters to nothing is a dead control. Never a constant here — managers add
 * topics without a deploy.
 */
export async function getTopics(): Promise<Topic[]> {
  return unwrapList(await apiFetch<Topic[] | { results: Topic[] }>("topics/"));
}

/**
 * The library's one **find** (§13.8) — scoped, filtered, ranked, faceted and
 * paginated.
 *
 * **Metadata only** — names, descriptions, facets, tags, a file's filename and
 * its original pCloud path. File contents are never indexed and never will be,
 * which is exactly why these hits are rendered in their own lane on `/search`:
 * a citation is quotable back to A. Nagraj ji, a metadata match is a title that
 * happened to contain the word.
 *
 * `under` wins over `workspace`, which it already implies — a folder is in
 * exactly one workspace — and it means that folder's **descendants**, not the
 * folder itself, which is the page the reader is standing on.
 *
 * Called on every shelf and folder page, including when nothing has been asked:
 * the sieve chips are drawn from `facets`, which describes the whole scope and
 * is the one thing `nodes/` cannot answer (§13.4).
 */
export async function findLibrary(opts: {
  /** the shelf to search — ignored when `under` is given */
  workspace?: string;
  /** a folder id; scopes to everything beneath it */
  under?: number;
  state: FindState;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}): Promise<LibraryFindResponse> {
  const params = findQuery(opts.state);
  // The sort in force rather than the one in the URL: a chipped shelf with an
  // empty box is newest-first by default, and that default belongs in the
  // request without being written into every chip's href (see `find.ts`).
  const ordering = effectiveOrdering(opts.state);
  if (ordering) params.set("ordering", ordering);
  if (opts.under !== undefined) params.set("under", String(opts.under));
  else if (opts.workspace) params.set("workspace", opts.workspace);
  if (opts.limit !== undefined) params.set("limit", String(opts.limit));
  if (opts.offset) params.set("offset", String(opts.offset));
  const query = params.toString();
  const data = await apiFetch<LibraryFindResponse>(
    `library/search/${query ? `?${query}` : ""}`,
    { signal: opts.signal }
  );
  return {
    ...data,
    count: data.count ?? 0,
    results: data.results ?? [],
    facets: data.facets ?? {},
    // A BE that predates the shelf tiles answers without it, and a tile that
    // cannot say what is inside falls back to its shallow counts rather than
    // to a crash.
    rollup: data.rollup ?? {},
  };
}

/**
 * The library lane on `/search` — the same find, asked of the whole library.
 *
 * Neither scoped nor chipped, because that page's question is "is this word
 * anywhere in the library?" rather than "where is it on this shelf?". One list
 * with each row saying what it is, and a breadcrumb on every one: a hit is by
 * definition somewhere the reader was not.
 */
export async function searchLibrary(
  q: string,
  signal?: AbortSignal
): Promise<LibrarySearchRow[]> {
  const { results } = await findLibrary({
    state: { ...EMPTY_FIND, q },
    // The lane shows six and filters the rest by source in the browser, so it
    // asks for a set worth filtering rather than for one screenful.
    limit: 50,
    signal,
  });
  return results;
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

// ---- Paribhasha — the glossary (§14) ----

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
 * The glossary page (§14.1): `q` ranked search, `letter` for the letter index.
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
