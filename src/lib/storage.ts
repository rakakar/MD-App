// Device-local state: preferences (always localStorage, PRD §9) and the
// personal store — bookmarks, notes, resume positions.
//
// The store is not a guest fallback. Every reader writes here first, signed in
// or not, and the reader reads from here alone. That is what makes the two
// states feel the same: a saved place appears instantly and survives going
// offline whether or not there is an account behind it. Signing in adds a
// second, slower home for the same rows (lib/personal.ts syncs them) — it
// never becomes the thing the reader waits on.
//
// Pure and synchronous by design: no network in this file.

import type { WorkspaceId } from "./workspaceConfig";

const isBrowser = typeof window !== "undefined";

function read<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full/blocked — preferences are best-effort
  }
}

// ---- Preferences ----

/** "system" follows prefers-color-scheme; the rest are explicit choices. */
export type ReaderTheme = "system" | "light" | "dark" | "sepia";
/** what actually gets painted — `system` is resolved to one of these */
export type ResolvedTheme = "light" | "dark" | "sepia";
export type ReadingMode = "page" | "scroll";
/**
 * Which Devanagari face the book is set in. The serif is the default and the
 * right one for these texts — it is what they are printed in. The sans is
 * here because on a low-DPI Android screen at small sizes the serif's thin
 * strokes and stacked matras go muddy, and a reader who cannot read the page
 * has no use for the face being authentic.
 */
export type ReaderFace = "serif" | "sans";
export const FONT_FACES: ReaderFace[] = ["serif", "sans"];

/** Typography steps. Exported so the reader UI, the settings page and the
 *  pre-hydration inline script all agree on the same ladder. */
export const FONT_SCALES = [0.85, 0.95, 1, 1.1, 1.2, 1.35, 1.5, 1.7];
/**
 * PRD §5 sets a floor of 1.8 for Devanagari — its matras sit above and below
 * the line, so anything tighter collides. The ladder therefore only opens the
 * text up, never compresses it; density is controlled with size and margins.
 */
export const LINE_HEIGHTS = [1.85, 2.05, 2.3];
/** index into the margin presets defined in globals.css */
export const MARGIN_STEPS = [0, 1, 2];

export interface Prefs {
  fontScale: number; // 1 = base
  /** Devanagari typeface for book text */
  face: ReaderFace;
  /** line-height multiplier for Devanagari body text */
  lineHeight: number;
  /** 0 = narrow gutters, 1 = normal, 2 = wide */
  margin: number;
  theme: ReaderTheme;
  /** user override of the print→page / digital→scroll default; null = automatic */
  readingMode: ReadingMode | null;
  /** tapping the left/right edge turns the page (Pages mode only) */
  tapZones: boolean;
  /**
   * Underline the words परिभाषा can define. Off by default and sticky once
   * turned on, like every other reading preference here.
   *
   * Off is the default because it was measured: the glossary was compiled
   * against these very books, so ~42% of the words in a chapter are
   * headwords. Even filtered down to ~20% it is a marked-up page, which some
   * readers want and most do not. Tapping a word for its meaning works either
   * way — this setting only controls whether the page shows you in advance.
   */
  glossaryUnderline: boolean;
  lastWorkspace: WorkspaceId;
  consent: "granted" | "denied" | null;
  playbackRate: number;
  syncNudgeShown: boolean;
  /** one-time "tap the middle for controls" coach mark */
  immersiveHintShown: boolean;
}

export const PREFS_KEY = "md.prefs.v1";

export const DEFAULT_PREFS: Prefs = {
  fontScale: 1,
  face: "serif",
  // matches --reader-line-height in globals.css; the spec asks for 2.0 and
  // this is the nearest preset (LINE_HEIGHTS[1])
  lineHeight: 2.05,
  margin: 1,
  // a reader that opens bright at night is the single most common complaint
  // about reading apps — follow the OS unless the user says otherwise
  theme: "system",
  readingMode: null,
  tapZones: true,
  glossaryUnderline: false,
  lastWorkspace: "originals",
  consent: null,
  playbackRate: 1,
  syncNudgeShown: false,
  immersiveHintShown: false,
};

/** Resolve `system` against the OS setting. SSR-safe (assumes light). */
export function resolveTheme(theme: ReaderTheme): ResolvedTheme {
  if (theme !== "system") return theme;
  if (!isBrowser) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Nearest valid step, so a stale stored value can never wedge a control. */
export function nearestStep(steps: number[], value: number): number {
  return steps.reduce((best, s) =>
    Math.abs(s - value) < Math.abs(best - value) ? s : best
  );
}

export function getPrefs(): Prefs {
  return { ...DEFAULT_PREFS, ...read<Partial<Prefs>>(PREFS_KEY, {}) };
}

export function setPrefs(patch: Partial<Prefs>): Prefs {
  const next = { ...getPrefs(), ...patch };
  write(PREFS_KEY, next);
  return next;
}

// ---- Personal data (canonical_ref anchored, never indices) ----
//
// Sync bookkeeping lives on the rows themselves rather than in a separate
// operation log: `server_id` absent means "the server has not seen this yet",
// `dirty` means "edited since it last did", and deletions leave a tombstone.
// A sync pass is then a stateless sweep over the rows — it can run twice, or
// be interrupted halfway, without replaying anything out of order.

export interface LocalBookmark {
  canonical_ref: string;
  book_code: string;
  /** the saved line, so a list can show the words rather than the ref */
  text_hi?: string;
  created_at: string;
  server_id?: number;
}

export interface LocalNote {
  canonical_ref: string;
  book_code: string;
  /** the passage the note is about */
  text_hi?: string;
  text: string;
  created_at: string;
  updated_at: string;
  server_id?: number;
  /** edited locally since the server last saw it → needs a PATCH */
  dirty?: boolean;
}

export interface LocalProgress {
  book_code: string;
  book_title?: string;
  canonical_ref: string;
  chapter_number: number;
  updated_at: string;
  synced?: boolean;
}

export interface Tombstone {
  kind: "bookmark" | "note";
  canonical_ref: string;
  server_id?: number;
}

export interface LocalStore {
  bookmarks: LocalBookmark[];
  notes: LocalNote[];
  /** keyed by book_code — one resume position per book */
  progress: Record<string, LocalProgress>;
  /** deleted here, possibly still on the server */
  tombstones: Tombstone[];
}

const STORE_KEY = "md.local.v1";
/** v1 of the store, written when this data was guest-only */
const LEGACY_KEY = "md.guest.v1";

const EMPTY: LocalStore = { bookmarks: [], notes: [], progress: {}, tombstones: [] };

export function getLocalStore(): LocalStore {
  const raw = read<Partial<LocalStore> | null>(STORE_KEY, null);
  // one-time lift of the old guest-only store, so nobody loses the bookmarks
  // they made before signing in was worth anything
  const source = raw ?? read<Partial<LocalStore>>(LEGACY_KEY, EMPTY);
  return {
    bookmarks: source.bookmarks ?? [],
    notes: source.notes ?? [],
    progress: source.progress ?? {},
    tombstones: source.tombstones ?? [],
  };
}

export function setLocalStore(store: LocalStore): void {
  write(STORE_KEY, store);
}

function mutate(fn: (s: LocalStore) => void): LocalStore {
  const store = getLocalStore();
  fn(store);
  setLocalStore(store);
  return store;
}

export function addLocalBookmark(
  canonicalRef: string,
  bookCode: string,
  textHi?: string
): void {
  mutate((store) => {
    if (store.bookmarks.some((b) => b.canonical_ref === canonicalRef)) return;
    store.bookmarks.unshift({
      canonical_ref: canonicalRef,
      book_code: bookCode,
      text_hi: textHi,
      created_at: new Date().toISOString(),
    });
    // re-bookmarking something just deleted cancels the pending delete
    store.tombstones = store.tombstones.filter(
      (t) => !(t.kind === "bookmark" && t.canonical_ref === canonicalRef)
    );
  });
}

export function removeLocalBookmark(canonicalRef: string): void {
  mutate((store) => {
    const row = store.bookmarks.find((b) => b.canonical_ref === canonicalRef);
    store.bookmarks = store.bookmarks.filter((b) => b.canonical_ref !== canonicalRef);
    if (row?.server_id !== undefined) {
      store.tombstones.push({
        kind: "bookmark",
        canonical_ref: canonicalRef,
        server_id: row.server_id,
      });
    }
  });
}

export function addLocalNote(
  canonicalRef: string,
  bookCode: string,
  text: string,
  textHi?: string
): void {
  mutate((store) => {
    const now = new Date().toISOString();
    const existing = store.notes.find((n) => n.canonical_ref === canonicalRef);
    if (existing) {
      existing.text = text;
      existing.updated_at = now;
      existing.dirty = true;
      if (textHi) existing.text_hi = textHi;
    } else {
      store.notes.unshift({
        canonical_ref: canonicalRef,
        book_code: bookCode,
        text_hi: textHi,
        text,
        created_at: now,
        updated_at: now,
      });
    }
    store.tombstones = store.tombstones.filter(
      (t) => !(t.kind === "note" && t.canonical_ref === canonicalRef)
    );
  });
}

export function removeLocalNote(canonicalRef: string): void {
  mutate((store) => {
    const row = store.notes.find((n) => n.canonical_ref === canonicalRef);
    store.notes = store.notes.filter((n) => n.canonical_ref !== canonicalRef);
    if (row?.server_id !== undefined) {
      store.tombstones.push({
        kind: "note",
        canonical_ref: canonicalRef,
        server_id: row.server_id,
      });
    }
  });
}

export function setLocalProgress(p: Omit<LocalProgress, "updated_at" | "synced">): void {
  mutate((store) => {
    store.progress[p.book_code] = {
      ...store.progress[p.book_code],
      ...p,
      updated_at: new Date().toISOString(),
      synced: false,
    };
  });
}

export function getLocalProgress(bookCode: string): LocalProgress | null {
  return getLocalStore().progress[bookCode] ?? null;
}

// ---- Listening positions ----
//
// Where the audio stopped, kept apart from `progress` on purpose. Reading
// progress is one place per book, anchored to a canonical_ref, and syncs to
// the account; this is a playhead — millisecond-precise, per chapter, and only
// meaningful on the rendition it was measured against. Folding a playhead into
// the reading position would either coarsen it to a paragraph or push
// device-local audio state into a synced row that other clients cannot use.
//
// Listening still moves reading progress, but through the reader: the
// read-along scroll advances the paragraph, and that is what gets saved and
// synced. So the account keeps the place; this keeps the seconds.

export interface ListeningPosition {
  book_code: string;
  chapter_number: number;
  /** ms into the rendition. 0 in device-voice mode, which has no timeline. */
  position_ms: number;
  /**
   * The paragraph being spoken. Survives what `position_ms` does not: a
   * regenerated rendition shifts every timestamp, and switching voice changes
   * them outright, but the paragraph is the same paragraph.
   */
  para_seq: number | null;
  /** which rendition the ms were measured against */
  voice_key?: string;
  updated_at: string;
}

const LISTENING_KEY = "md.listening.v1";

/** keyed by book code — one playhead per book, as with the resume position */
type ListeningStore = Record<string, ListeningPosition>;

export function setListeningPosition(
  p: Omit<ListeningPosition, "updated_at">
): void {
  if (!isBrowser) return;
  const store = read<ListeningStore>(LISTENING_KEY, {});
  store[p.book_code] = { ...p, updated_at: new Date().toISOString() };
  write(LISTENING_KEY, store);
}

export function getListeningPosition(bookCode: string): ListeningPosition | null {
  return read<ListeningStore>(LISTENING_KEY, {})[bookCode] ?? null;
}

export function clearListeningPosition(bookCode: string): void {
  if (!isBrowser) return;
  const store = read<ListeningStore>(LISTENING_KEY, {});
  delete store[bookCode];
  write(LISTENING_KEY, store);
}

/** recently-read list, newest first */
export function getRecentlyRead(): LocalProgress[] {
  return Object.values(getLocalStore().progress).sort((a, b) =>
    b.updated_at.localeCompare(a.updated_at)
  );
}

/** Sign-out: drop personal rows, keep preferences. */
export function clearLocalStore(): void {
  if (!isBrowser) return;
  window.localStorage.removeItem(STORE_KEY);
  window.localStorage.removeItem(LEGACY_KEY);
  window.localStorage.removeItem(LISTENING_KEY);
}
