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

/**
 * workspaces/ — code doubles as the FE workspace id (contract §10.1).
 *
 * `name` is English and stays English, which is also what the app shows: the
 * interface is English throughout, and only content is rendered in the language
 * it was authored in. The BE's old `name_hi` twin was a second place to fix a
 * typo and it drifted.
 */
export interface ApiWorkspace {
  code: string;
  name: string;
  ordering: number;
  description: string;
  /**
   * The folder this shelf opens into — the library tree's root for this
   * workspace. `null` for `journey`, which never holds content, and for any
   * workspace whose root is unpublished, so branch on it rather than assuming
   * an id is there.
   */
  root_node_id: number | null;
}

/**
 * book-genres/ — the Originals shelf's filter chips (contract §10.3).
 *
 * A manager-editable table, never a constant in here: it exists so a new kind
 * of writing (Notes, Letters, a compilation) reaches the shelf without a
 * frontend deploy. Hardcoding it would silently drop those books off it.
 *
 * `name` is English (§11.1). The Hindi a reader sees comes from lib/labels.ts,
 * which translates the codes we know and falls back to this for the ones a
 * manager added after we shipped — so the list is still never hardcoded.
 */
export interface BookGenre {
  code: string;
  name: string;
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
  /** which shelf this book sits on — the workspace code (contract §10) */
  workspace: string;
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
   * Who translated *this* edition. `author` stays A. Nagraj on a translation,
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

// ---- The library — one tree for everything that is not a book (§13) ----
//
// A **folder** (`node`) holds child folders, **files** (`item`), or both, to
// six levels. A "collection" is just a folder that happens to hold files; an
// audio series is a folder; a lone PDF needs no wrapper at all. That one shape
// replaced four container models, so there is one set of types here where
// there used to be collections, folders, audio series and playlists.
//
// A file is served as the file it is: no chapters, no paragraphs, no canonical
// refs, no read-aloud. Nothing here ever routes into the reader.

/**
 * Whose word is it (contract §13, D14). The badge this drives is an epistemic
 * requirement rather than decoration — the reader has to see at a glance
 * whether a page is a source or someone's understanding.
 *
 * Already **resolved through inheritance** when it arrives: a folder without
 * one of its own reports its nearest ancestor's, so nothing here ever walks
 * the tree. `""` is a row nobody has judged yet; the badge is hidden then,
 * never guessed at.
 */
export type Provenance = "moola" | "sankalan" | "adhyayan" | "";

/**
 * What a file is, auto-detected by the BE from the file or the URL (§13.5).
 * A YouTube/Vimeo link is `video`, a `.pdf` link is still `pdf`, any other
 * bare URL is `link`.
 */
export type FileKind = "pdf" | "audio" | "video" | "image" | "link" | "other";

/** one step of an ancestry chain, root first */
export interface BreadcrumbStep {
  id: number;
  name: string;
}

/**
 * A folder as a card — everything needed to render it in a list, and
 * deliberately not enough to recurse without another request (§13.1).
 *
 * `child_count` / `item_count` / `kinds` are what make the card worth showing:
 * without them every folder is an identical blank row. They count only what
 * this reader can reach, so a card never promises more than the folder
 * delivers, and they are **shallow** — direct children, not descendants.
 */
export interface NodeCard {
  id: number;
  name: string;
  /** which shelf holds it; the tree spans four of the five workspaces */
  workspace: string;
  description: string;
  cover_url: string | null;
  /**
   * Where this whole set also lives — a YouTube playlist for a folder of
   * recordings, `""` for the ordinary folder. The videos are still items in
   * here with their own watch links; this opens the set as one thing.
   */
  external_url: string;
  provenance: Provenance;
  /** topic codes, matching topics/ */
  topics: string[];
  /** free text, a search axis and never a chip (§13.4) */
  tags: string[];
  /** approximate allowed, e.g. "2005" or "2005-03"; "" when unknown */
  year: string;
  place: string;
  /** speakers/authors involved, comma-separated */
  people: string;
  language: string;
  language_label: string;
  /** published child folders, direct only */
  child_count: number;
  /** servable files, direct only */
  item_count: number;
  /** which sorts of file are inside, deduplicated and sorted; `[]`, never null */
  kinds: FileKind[];
  sequence: number;
  updated_at: string;
}

/**
 * A folder card that says where it really lives.
 *
 * Three lists carry this rather than a bare card, and all three for the same
 * reason: they gather folders from elsewhere. `linked_children` borrows one
 * into another folder (§13.6), provenance gathers across workspaces
 * (§13.7), and search is by definition somewhere the reader was not (§13.8).
 * "दिन 1" is the same two words in every shivir the library holds, so a row
 * without its path is close to useless — and on a cross-post, showing the path
 * is exactly what stops it reading as a duplicate.
 */
export interface LocatedNodeCard extends NodeCard {
  /** the ancestor chain, root first — stops at this folder's parent */
  breadcrumb: BreadcrumbStep[];
}

/** one file (§13.1) */
export interface LibraryFile {
  id: number;
  /** the folder it lives in */
  node: number;
  title: string;
  kind: FileKind;
  /**
   * Always present and absolute on a served file — a folder cannot publish
   * without a file or a link behind it, so no row is ever dead. It may point
   * at our media host or at wherever the file still lives during the
   * migration; both are opened the same way, with no host special-casing.
   */
  url: string;
  /**
   * A small copy to draw in a grid — **never the address of the picture**,
   * which is always `url`.
   *
   * Null is the ordinary case, not a failure: every non-image has none, and so
   * does any photograph the BE could not open. Treat it as an optimisation
   * that may or may not be given and fall back to `url`, so a folder whose
   * thumbnails have not been generated yet draws heavy rather than blank.
   *
   * The library's photographs are camera originals — one folder of 127 is
   * 106MB against 3.3MB of thumbnails — which is the whole reason this field
   * exists (see `backfill_thumbnails` in the BE).
   */
  thumbnail_url: string | null;
  sequence: number;
  description: string;
  /** already the effective one — its own, else inherited from its branch */
  provenance: Provenance;
  // No `tags` — a file has none. Its folder carries topics, year, place,
  // people and tags, and search reaches the file through them.
  /** bytes; null for a catalogued file whose bytes haven't moved yet */
  file_size: number | null;
  /** PDFs only */
  page_count: number | null;
  /** audio and video only */
  duration_seconds: number | null;
  updated_at: string;
}

/**
 * A file that says where it lives. Unlike a folder's, this breadcrumb
 * **includes its own folder**: a file is a row, its folder is the last and
 * most useful step of its address, and the breadcrumb doubles as the jump
 * target (§13.6).
 */
export interface LocatedFile extends LibraryFile {
  breadcrumb: BreadcrumbStep[];
}

/**
 * The one node shape (§13.1) — **identical at every depth**, which is what
 * lets one component render depth 1 and depth 6 alike.
 */
export interface LibraryNode extends NodeCard {
  /** ancestors, root first; `[]` at a workspace root */
  breadcrumb: BreadcrumbStep[];
  children: NodeCard[];
  items: LibraryFile[];
  /** cross-posted folders — cards that jump to their real home, never nested */
  linked_children: LocatedNodeCard[];
  /** cross-posted files — they open and play in place, like a native file */
  linked_items: LocatedFile[];
}

/**
 * A topic chip (§13.4) — a **door onto the whole library**, not a sieve over
 * one folder: tapping it leaves the folder you are in.
 *
 * `name` is the one taxonomy label that arrives in Hindi and is rendered as a
 * manager typed it. Managers add topics without a deploy, so the FE cannot
 * hold a label it has never seen — which is exactly why this one is not in
 * lib/labels.ts with the others.
 */
export interface Topic {
  code: string;
  name: string;
  description: string;
  ordering: number;
  /** visible folders on this topic, library-wide; hide a zero-count chip */
  node_count: number;
}

/**
 * One row of `library/search/` (§13.8) — the only response that mixes folders
 * and files, and therefore the only one that carries `type`. Everywhere else
 * each arrives under its own key and the caller already knows which it holds.
 */
export type LibrarySearchRow =
  | ({ type: "folder" } & LocatedNodeCard)
  | ({ type: "file" } & LocatedFile);

/**
 * One chip on one sieve axis, as the endpoint counts it.
 *
 * Always the same three keys, including when `label` equals `value` — one
 * shape to render beats a special case per axis. `label` is a courtesy rather
 * than an instruction: the FE holds its own English for Source and Type and
 * keeps using it (§13.8), because the BE's are long admin strings and bare
 * codes. Everything else — a place, a person, a year, a topic — is content and
 * is rendered as it arrives.
 */
export interface FacetValue {
  value: string;
  label: string;
  /** rows this chip would yield — zero-count values are never returned */
  count: number;
}

/** the sieve, counted over the whole scope; keyed by axis (§13.8) */
export type LibraryFacets = Partial<Record<string, FacetValue[]>>;

/**
 * What is really inside one shelf card, counted all the way down.
 *
 * The counterpart to `NodeCard`'s counts, which are **shallow** by contract
 * (§13.1) and therefore say almost nothing on a shelf root: a card holding
 * folders reports folders, so the collection worth twenty-seven hours and the
 * one holding two PDFs both read "N folders". These are the same numbers a
 * reader would arrive at by opening everything.
 */
export interface NodeRollup {
  /** every folder below the card, at any depth — the card itself excluded */
  folders: number;
  /** every servable file below it */
  items: number;
  kinds: FileKind[];
  /** seconds, audio and video only; `0` for documents and photographs */
  duration: number;
}

/** rollups keyed by card id, as a string — JSON has no integer keys */
export type LibraryRollup = Record<string, NodeRollup | undefined>;

/**
 * `library/search/` — the library's one **find** (§13.8).
 *
 * An envelope rather than a list, and every part of it is load-bearing:
 * `facets` is what the sieve chips are drawn from and it describes the whole
 * scope rather than what is on screen, `count` is the total before paging so
 * "Show more" knows whether there is more, and `searched_as` is the rewrite
 * the reader is owed an explanation for.
 *
 * **Facets arrive even when nothing was asked, and results do not.** A shelf a
 * reader has just landed on browses through `nodes/` (§13.2) — but the sieve
 * above that browse still has to be drawn, and only this endpoint can count it
 * over the whole shelf rather than over one level.
 */
export interface LibraryFindResponse {
  q: string;
  /** the Devanagari actually searched; `""` when the query needed no rewrite */
  searched_as: string;
  scope: { workspace: string | null; under: number | null };
  /** total in scope, before limit/offset */
  count: number;
  results: LibrarySearchRow[];
  facets: LibraryFacets;
  /**
   * Deep counts per card on the shelf this scope draws — the one thing
   * `nodes/` cannot answer. Like `facets`, it arrives even when nothing was
   * asked, because that is exactly when the shelf is on screen.
   */
  rollup: LibraryRollup;
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

// ---- Paribhasha — the glossary (§14) ----

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
  workspace?: string;
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
   * The Paribhasha card, shown **above** the passage hits (§9.1). Kept out of
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
