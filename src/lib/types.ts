// Shapes from API_Contract_v1.md — frozen §§0–8, live-but-evolving §9.
// When in doubt the contract wins for data shapes (PRD closing note).

export type BookType = "print" | "digital";

export type BlockType =
  | "para"
  | "heading"
  | "subheading"
  | "list"
  | "verse"
  | "quote"
  | "figure"
  | "table";

export type Align = "left" | "center" | "right";

/** sections/ — code doubles as the FE workspace id (contract §10) */
export interface Section {
  code: string;
  name_hi?: string;
  name_en?: string;
  ordering?: number;
  description?: string;
  [key: string]: unknown;
}

/**
 * book-genres/ — the Originals shelf's filter chips (contract §10.3).
 *
 * A manager-editable table, never a constant in here: it exists so a new kind
 * of writing (Notes, Letters, a compilation) reaches the shelf without a
 * frontend deploy. Hardcoding it would silently drop those books off it.
 */
export interface BookGenre {
  code: string;
  name_hi: string;
  name_en: string;
  description: string;
  ordering: number;
  /** published books filed under this genre, translations included */
  book_count: number;
}

/** a published translation as listed on the original's page (contract §11) */
export interface TranslationRef {
  code: string;
  title_hi: string;
  language: string;
  language_label: string;
  translator: string;
}

export interface BookSummary {
  code: string;
  title_hi: string;
  subtitle_hi: string;
  author: string;
  section: Section | string | null;
  book_type: BookType;
  /**
   * What kind of writing this is — the Originals chips. Distinct from
   * `book_type` (print/digital), which only decides how loudly to show page
   * numbers: a handwritten diary is genre "diary" AND book_type "digital".
   * Already resolved by the BE, including on a translation, which inherits
   * the original's genre. Null until a manager files the book.
   */
  genre: string | null;
  /** ISO 639-1; originals are always "hi" */
  language: string;
  /** ready to display, e.g. "English", "मराठी (Marathi)" */
  language_label: string;
  /**
   * Who translated *this* edition. `author` stays ए. नागराज on a translation,
   * so a card showing only `author` misattributes a student's work to him.
   */
  translator: string;
  /** the original's code, e.g. "MVD"; null on an original */
  translation_of: string | null;
  edition: string;
  publication_year: number | null;
  description: string;
  cover_image: string | null;
  page_count: number | null;
  tags: string[];
}

export interface ChapterTocEntry {
  number: number;
  title_hi: string;
  sequence: number;
  verification_status: string;
  start_page: number;
  end_page: number;
  is_front_matter: boolean;
}

export interface BookDetail extends BookSummary {
  chapters: ChapterTocEntry[];
  /**
   * Published translations of this book, `[]` when there are none — and always
   * `[]` on a translation itself, because chains don't exist. The same book
   * rendered by three students is three separate rows here.
   */
  translations: TranslationRef[];
}

export interface FigureExtra {
  image_b64: string;
  image_mime: string;
}

export interface TableExtra {
  rows: string[][];
  header: boolean;
}

export interface Paragraph {
  canonical_ref: string;
  sequence: number;
  page_number: number;
  page_label: string;
  para_number: number;
  block_type: BlockType;
  marker: string;
  align: Align;
  indent_level: number;
  text_hi: string;
  footnote_text: string;
  extra: Partial<FigureExtra & TableExtra> | null;
}

/** para sequence → [start_ms, end_ms]; spoken paras only */
export type ParaTimings = Record<string, [number, number]>;

export interface AudioRendition {
  voice_key: string;
  voice_label: string;
  provider: string;
  audio_url: string;
  duration_ms: number;
  is_stale: boolean;
  para_timings: ParaTimings;
}

export interface ChapterNeighbor {
  number: number;
  title_hi: string;
}

export interface ChapterPayload {
  number: number;
  title_hi: string;
  sequence: number;
  audio_renditions: AudioRendition[];
  prev: ChapterNeighbor | null;
  next: ChapterNeighbor | null;
  paragraphs: Paragraph[];
  is_front_matter?: boolean;
}

export interface PageResolution {
  code: string;
  page: number;
  chapter_number: number;
}

/** paras/{canonical_ref}/ — paragraph plus reader-opening context */
export interface ParaResolution extends Paragraph {
  book_code: string;
  book_title: string;
  chapter_number: number;
  chapter_title: string;
}

/**
 * sutra/today/ (contract §2.6) — the curated Sutra of the day. Same shape as a
 * deep-link resolution, so SutraCard renders it unchanged; `text_hi` may be the
 * curator's trimmed line while `canonical_ref` still cites the whole paragraph.
 */
export interface SutraOfTheDay extends ParaResolution {
  sutra_date: string; // the local (IST) date this pick belongs to
  offset: number; // steps from today's pick; 0 is always today
  has_prev: boolean;
  has_next: boolean;
}

// ---- Resources library (contract §§12–13) ----
//
// A file library, not books. Documents have no chapters, no paragraphs and no
// canonical refs, so nothing here ever routes into the reader.

/** folders/ — one node of the Resources tree */
export interface Folder {
  id: number;
  name: string;
  parent: number | null;
  section: string;
  description: string;
  ordering: number;
  /** the ancestor chain, root first; [] at the root level */
  breadcrumb: { id: number; name: string }[];
  /** what sits *directly* inside — documents counted published-only */
  folder_count: number;
  document_count: number;
}

export type DocumentKind = "pdf" | "audio" | "image" | "other";

export interface ResourceDocument {
  id: number;
  title: string;
  folder: number;
  folder_name: string;
  section: string;
  kind: DocumentKind;
  kind_label: string;
  /**
   * Always present and absolute on a published document — publish is blocked
   * without a file or a link behind it, so no row is ever dead. It may point
   * at our media host or at wherever the file still lives during the
   * migration; both are opened the same way, with no host special-casing.
   */
  url: string;
  description: string;
  author: string;
  language: string;
  language_label: string;
  /** bytes; null for a catalogued file whose bytes haven't moved yet */
  file_size: number | null;
  /** PDFs only */
  page_count: number | null;
  /** audio only */
  duration_seconds: number | null;
  tags: string[];
  updated_at: string;
}

// ---- §9 live endpoints (shapes may still evolve; keep fields optional) ----

// Shapes below verified against the live drf-spectacular schema
// (GET /api/v1/schema/, 27 Jul 2026); §9 may still evolve, so keep them loose.

export interface AudioSeries {
  id: number;
  title_hi: string;
  section?: string;
  description?: string;
  ordering?: number;
  [key: string]: unknown;
}

export interface AudioTrack {
  id: number;
  title_hi: string;
  section?: string;
  series?: string | null; // series title (list filter uses ?series=<id>)
  sequence_in_series?: number;
  speaker?: string;
  recording_context?: string;
  recording_date?: string;
  duration_seconds?: number | null;
  description?: string;
  file_url?: string | null;
  archive_org_url?: string;
  categories?: string[];
  tags?: string[];
  [key: string]: unknown;
}

export interface VideoItem {
  id: number;
  title_hi: string;
  youtube_id: string;
  section?: string;
  speaker?: string;
  duration_seconds?: number | null;
  thumbnail_url?: string;
  description?: string;
  categories?: string[];
  tags?: string[];
  [key: string]: unknown;
}

export interface Playlist {
  id: number;
  title_hi: string;
  section?: string;
  description?: string;
  videos?: VideoItem[];
  [key: string]: unknown;
}

export type EventType = "shivir" | "workshop" | "satsang" | "other";

export interface CenterItem {
  id: number;
  name_hi: string;
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  map_url?: string;
  activities?: string;
  [key: string]: unknown;
}

export interface EventItem {
  id: number;
  title_hi: string;
  event_type?: EventType;
  start_date?: string;
  end_date?: string;
  center?: CenterItem | null;
  location_text?: string;
  description?: string;
  registration_open?: boolean;
  [key: string]: unknown;
}

// ---- परिभाषा — the glossary (§14) ----

/**
 * One glossary entry. A **standalone dictionary row**, not book content: no
 * canonical_ref, no chapter, no page. The same word carries the same meaning
 * in every book, which is why nothing here ties it to one.
 *
 * `definitions` read as **one explanation in order**, not as alternatives —
 * a manager arranged them that way. Render them stacked, never as a numbered
 * list of competing senses.
 */
export interface ParibhashaWord {
  id: number;
  hindi: string;
  hinglish: string;
  definitions: string[];
}

/** a `results.paribhasha` row — a word plus how the query reached it (§9.1) */
export interface ParibhashaHit extends ParibhashaWord {
  /** "exact" headword, "keyword" spelling/definition text, or "vector" meaning */
  matched?: "exact" | "keyword" | "vector";
}

/**
 * `paribhasha/index/` — every headword and nothing else, unpaginated by
 * design (§14.3). ~25 KB gzipped, which is what makes tap-to-define possible
 * without a request per rendered paragraph.
 *
 * `version` is the newest `updated_at` in the glossary: unchanged means the
 * cached copy is still current.
 */
export interface ParibhashaIndex {
  count: number;
  version: string;
  words: { id: number; hindi: string }[];
}

/**
 * `paribhasha/index/?full=1` — the same set with the definitions attached,
 * ~143 KB gzipped. The whole dictionary in one request, which is what lets a
 * tap be answered offline.
 *
 * Same `version` as the lean form, so one string governs both.
 */
export interface ParibhashaFullIndex {
  count: number;
  version: string;
  words: ParibhashaWord[];
}

/**
 * Forward-compatible search result (PRD §7): v1 returns text only, but the
 * component must already render audio/video with optional timestamp.
 */
export interface SearchResult {
  type: "text" | "audio" | "video";
  canonical_ref?: string;
  book_code?: string;
  book_title?: string;
  chapter_number?: number;
  chapter_title?: string;
  page_number?: number;
  /** cropped around the match — what the collapsed card shows */
  snippet?: string;
  /** the passage in full — what expanding reveals */
  text?: string;
  /** the paragraphs either side, trimmed; "" at a chapter edge */
  context_before?: string;
  context_after?: string;
  title?: string;
  timestamp?: number;
  section?: Section | string | null;
  /** which leg found this: "vector" (meaning), "keyword" (words), or "both" */
  matched?: "vector" | "keyword" | "both";
  [key: string]: unknown;
}

/**
 * A whole search response, not just the rows. `searchedAs` and `mode` are the
 * two things a reader is owed an explanation for: that we rewrote "anubhav"
 * into Devanagari before searching, and that a degraded run found matches by
 * word alone. Both are invisible without being told.
 */
export interface SearchResponse {
  results: SearchResult[];
  total: number;
  /**
   * The परिभाषा card, shown **above** the passage hits (§9.1). Kept out of
   * `results` on purpose: it is a different shape answering a different
   * question ("what does this word mean", not "where is it discussed"), and
   * flattening it in produced blank passage cards with no text and no ref.
   * `[]` whenever the glossary knows nothing about the query.
   */
  paribhasha: ParibhashaHit[];
  /** Devanagari the BE actually searched; "" when the query was used as typed */
  searchedAs: string;
  /** "hybrid" = meaning + words; "keyword" = words only (provider unavailable) */
  mode: "hybrid" | "keyword";
  /** query words worth highlighting (3+ chars, longest first) */
  terms: string[];
}

// ---- /api/v1/me/ (§6) ----

export interface MeUser {
  id?: number;
  email?: string;
  name?: string;
  first_name?: string;
  [key: string]: unknown;
}

// /me/ rows (contract §6). All three are anchored to canonical_ref and carry
// the Hindi text or book title alongside, so a saved list can be rendered
// without a second round of lookups.
export interface Bookmark {
  id: number;
  canonical_ref: string;
  /** the bookmarked line */
  text_hi?: string;
  title?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface Note {
  id: number;
  canonical_ref: string;
  /** the passage the note is about */
  text_hi?: string;
  text: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface Progress {
  id?: number;
  book_code: string;
  book_title?: string;
  canonical_ref: string;
  completed?: boolean;
  updated_at?: string;
  [key: string]: unknown;
}

/** Section code carried on any §9 object — objects may embed section as code string or object. */
export function sectionCode(section: Section | string | null | undefined): string | null {
  if (!section) return null;
  if (typeof section === "string") return section;
  return section.code ?? null;
}
