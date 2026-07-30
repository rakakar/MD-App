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
  /**
   * The book arrived before the pipeline did (contract §13.9): a PDF, a cover
   * and metadata, with no chapters or paragraphs behind it yet. Its whole
   * reading experience is the PDF viewer — no reflowable reader, no citations,
   * no read-aloud — and the flag flips off by itself once it is pipelined, so
   * nothing about the URL or anyone's links changes when it does.
   */
  is_pdf_only: boolean;
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

// ---- Resources — collections behind purpose doors (contract §13) ----
//
// The unit of this shelf is the **collection** — one shivir bundle, one संकलन,
// one chart set — never the file. An item inside one is filed, not processed:
// no chapters, no paragraphs, no canonical refs, so nothing here ever routes
// into the reader.

/**
 * Whose word is it (contract §13, D14). The badge this drives is an epistemic
 * requirement rather than decoration — the reader has to see at a glance
 * whether a page is प्रमाण or someone's understanding.
 *
 * `""` is a legacy row nobody has judged yet; the badge is hidden then, never
 * guessed at.
 */
export type Provenance = "moola" | "sankalan" | "adhyayan" | "";

/**
 * A purpose door on the Resources landing page, or a विषय chip inside one —
 * one shape, two manager-editable tables.
 *
 * Never hardcoded, for the same reason as the genre chips: both exist so a new
 * door or topic reaches the shelf without a frontend deploy, and a constant
 * here would silently hide whatever a manager added.
 */
export interface ResourceFacet {
  code: string;
  name_hi: string;
  description: string;
  ordering: number;
  /** servable collections behind it — published, with ≥1 openable item */
  collection_count: number;
}

export type ResourceKind = "pdf" | "audio" | "image" | "other";

/** one card on the shelf (contract §13.3) */
export interface ResourceCollection {
  id: number;
  title_hi: string;
  section: string;
  door: string;
  door_name_hi: string;
  description: string;
  cover_url: string | null;
  provenance: Provenance;
  provenance_hi: string;
  /** विषय codes, matching resources/topics/ */
  topics: string[];
  tags: string[];
  /** approximate allowed, e.g. "2005" or "2005-03"; "" when unknown */
  year: string;
  place: string;
  /** speakers/authors involved, comma-separated */
  people: string;
  language: string;
  language_label: string;
  /** published items only — safe to print */
  item_count: number;
  /** the kinds its published items are, so a card can say "14 ऑडियो · 1 PDF" */
  kinds: ResourceKind[];
  updated_at: string;
}

/** one file inside a collection (contract §13.4) */
export interface ResourceItem {
  id: number;
  collection: number;
  collection_title: string;
  title: string;
  kind: ResourceKind;
  kind_label: string;
  /**
   * Always present and absolute on a published item — publish is blocked
   * without a file or a link behind it, so no row is ever dead. It may point
   * at our media host or at wherever the file still lives during the
   * migration; both are opened the same way, with no host special-casing.
   */
  url: string;
  sequence: number;
  description: string;
  /** already the *effective* one — the item's override, else its collection's */
  provenance: Provenance;
  provenance_hi: string;
  /** bytes; null for a catalogued file whose bytes haven't moved yet */
  file_size: number | null;
  /** PDFs only */
  page_count: number | null;
  /** audio only */
  duration_seconds: number | null;
  updated_at: string;
}

/** the album view — the card plus its published items in `sequence` order */
export interface ResourceCollectionDetail extends ResourceCollection {
  items: ResourceItem[];
}

/**
 * `resources/search/` and `vani/` answer in the same three labelled lists
 * (contract §13.5–13.6). The FE renders them as ONE संसाधन lane — they are
 * three shapes of the same answer, not three results tabs.
 */
export interface ResourceLane {
  collections: ResourceCollection[];
  audio: AudioTrack[];
  video: VideoItem[];
}

/** folders/ — one node of the archivist's fallback tree (contract §13.7) */
export interface Folder {
  id: number;
  name: string;
  parent: number | null;
  section: string;
  description: string;
  ordering: number;
  /** the ancestor chain, root first; [] at the root level */
  breadcrumb: { id: number; name: string }[];
  /** what sits *directly* inside — items counted published-only */
  folder_count: number;
  item_count: number;
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
  /** whose word it is (§13) — `""` on a legacy row, where the badge is hidden */
  provenance?: Provenance;
  provenance_hi?: string;
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
  /** whose word it is (§13) — `""` on a legacy row, where the badge is hidden */
  provenance?: Provenance;
  provenance_hi?: string;
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

// ---- /api/v1/chat/ — MD Chat, the assistant's answer mode ----

export interface ChatQuota {
  /** null for managers, who are uncapped */
  limit: number | null;
  remaining: number | null;
  capped: boolean;
}

/**
 * A citation the BE verified against a passage actually retrieved. Invented
 * refs never reach here — they are flagged inside `answer` instead — so every
 * one of these is safe to render as a link into the reader.
 */
export interface ChatCitation {
  canonical_ref: string;
  book: string | null;
  chapter: string | null;
}

export interface ChatFeedback {
  is_positive: boolean;
  category?: string;
  note?: string;
}

export interface ChatAnswer {
  id: number;
  asked_at: string;
  query: string;
  /**
   * Non-empty only when a follow-up was rewritten into a standalone question.
   * Worth showing: an answer that looks like it missed the point usually
   * means the rewrite did, and hiding it makes that undiagnosable.
   */
  rewritten_query: string;
  /** "not_found" is an honest answer, not a failure — the books do not say. */
  status: "ok" | "not_found" | "error";
  answer: string;
  citations: ChatCitation[];
  feedback: ChatFeedback | null;
}

export interface ChatSession {
  quota: ChatQuota;
  modes: ("quick" | "deep")[];
  feedback_categories: { value: string; label: string }[];
  recent: ChatAnswer[];
}

/** Section code carried on any §9 object — objects may embed section as code string or object. */
export function sectionCode(section: Section | string | null | undefined): string | null {
  if (!section) return null;
  if (typeof section === "string") return section;
  return section.code ?? null;
}
