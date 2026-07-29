import type {
  AudioSeries,
  AudioTrack,
  BookDetail,
  BookGenre,
  BookSummary,
  CenterItem,
  ChapterPayload,
  DocumentKind,
  EventItem,
  Folder,
  PageResolution,
  ParaResolution,
  Playlist,
  ResourceDocument,
  SearchResponse,
  SearchResult,
  Section,
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
  opts: { section?: string; genre?: string; language?: string } = {}
): Promise<BookSummary[]> {
  return unwrapList(
    await apiFetch<BookSummary[] | { results: BookSummary[] }>(
      `books/${qs({
        section__code: opts.section,
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

export async function getSections(): Promise<Section[]> {
  return unwrapList(await apiFetch<Section[] | { results: Section[] }>("sections/"));
}

// ---- Resources library (§§12–13) ----

/**
 * One level of the Resources tree. No `parent` is the root level.
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

/** Published documents, normally the ones sitting directly in one folder. */
export async function getDocuments(
  opts: { folder?: number; kind?: DocumentKind; language?: string; section?: string } = {}
): Promise<ResourceDocument[]> {
  return unwrapList(
    await apiFetch<ResourceDocument[] | { results: ResourceDocument[] }>(
      `documents/${qs({
        folder: opts.folder,
        kind: opts.kind,
        language: opts.language,
        section__code: opts.section,
      })}`
    )
  );
}

export async function getAudioSeries(sectionCode?: string): Promise<AudioSeries[]> {
  return unwrapList(
    await apiFetch<AudioSeries[] | { results: AudioSeries[] }>(
      `audio/series/${qs({ section__code: sectionCode })}`
    )
  );
}

export async function getAudioTracks(opts: {
  series?: number | string;
  sectionCode?: string;
} = {}): Promise<AudioTrack[]> {
  return unwrapList(
    await apiFetch<AudioTrack[] | { results: AudioTrack[] }>(
      `audio/${qs({ series: opts.series, section__code: opts.sectionCode })}`
    )
  );
}

export async function getVideos(sectionCode?: string): Promise<VideoItem[]> {
  return unwrapList(
    await apiFetch<VideoItem[] | { results: VideoItem[] }>(
      `videos/${qs({ section__code: sectionCode })}`
    )
  );
}

export async function getPlaylists(): Promise<Playlist[]> {
  return unwrapList(await apiFetch<Playlist[] | { results: Playlist[] }>("playlists/"));
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
 * `section` can only ever narrow originals — never offer it as a way to reach
 * the other two shelves, because there is nothing there to reach.
 *
 * Never paginated: the BE returns the whole (small, ranked) result set in one
 * call, so "show more" is a client-side reveal and costs no round-trip.
 */
export async function search(
  q: string,
  opts: {
    section?: string;
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
      section: opts.section,
      book: opts.book,
      limit: opts.limit,
      raw: opts.raw ? 1 : undefined,
    })}`,
    { signal: opts.signal }
  );
  const results: SearchResult[] = [];
  for (const [index, bucket] of Object.entries(envelope.results ?? {})) {
    for (const hit of bucket.hits ?? []) {
      results.push({ ...hit, type: SEARCH_TYPE[index] ?? "text" } as SearchResult);
    }
  }
  return {
    results,
    total: results.length,
    searchedAs: envelope.searched_as ?? "",
    mode: envelope.mode ?? "hybrid",
    terms: envelope.terms ?? [],
  };
}
