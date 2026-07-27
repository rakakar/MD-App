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

export interface BookSummary {
  code: string;
  title_hi: string;
  subtitle_hi: string;
  author: string;
  section: Section | string | null;
  book_type: BookType;
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
  snippet?: string;
  text?: string;
  title?: string;
  timestamp?: number;
  section?: Section | string | null;
  [key: string]: unknown;
}

// ---- /api/v1/me/ (§6) ----

export interface MeUser {
  id?: number;
  email?: string;
  name?: string;
  first_name?: string;
  [key: string]: unknown;
}

// /me/ rows expose the anchor as `target` (live schema); the client
// normalises to canonical_ref — see lib/me.ts.
export interface Bookmark {
  id: number;
  canonical_ref: string;
  title?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface Note {
  id: number;
  canonical_ref: string;
  text: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface Progress {
  id?: number;
  book_code: string;
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
