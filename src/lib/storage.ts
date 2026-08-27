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

import type { ReadingSide } from "./bookLanguage";
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

/**
 * "system" follows prefers-color-scheme; the rest are explicit choices.
 *
 * This was `ReaderTheme` while only the reader could be themed. It now paints
 * the whole app, which is what it always claimed to do on the settings screen.
 */
export type Theme = "system" | "light" | "dark" | "sepia";
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

/**
 * The paper the *book* is printed on — a second, narrower axis than {@link Theme}.
 *
 * The designer's Theme & Settings sheet offers six of these. They are not app
 * themes: the shell keeps Auto / Light / Sepia / Dark, because Auto is what
 * lets a phone that goes dark at sunset take the app with it, and a book you
 * chose to read on cream should not turn grey because the sun went down.
 *
 * `original` is the one that declares nothing — it defers to whatever the app
 * theme is, which is exactly what the reader did before this setting existed.
 * That is also why it is the default: nobody's book changes until they ask.
 *
 * `bold` is a weight rather than a surface; see globals.css for why it cannot
 * simply be `font-weight: bold`.
 */
export type ReaderSurface =
  | "original"
  | "quiet"
  | "paper"
  | "bold"
  | "calm"
  | "focus";

/** In the order the sheet draws them (two rows of three). */
export const READER_SURFACES: ReaderSurface[] = [
  "original",
  "quiet",
  "paper",
  "bold",
  "calm",
  "focus",
];

/** Typography steps. Exported so the reader UI, the settings page and the
 *  pre-hydration inline script all agree on the same ladder. */
export const FONT_SCALES = [0.85, 0.95, 1, 1.1, 1.2, 1.35, 1.5, 1.7];
/**
 * PRD §5 sets a floor of 1.8 for Devanagari — its matras sit above and below
 * the line, so anything tighter collides. The ladder therefore only opens the
 * text up, never compresses it; density is controlled with size and margins.
 */
export const LINE_HEIGHTS = [1.85, 2.05, 2.3];

/**
 * App-wide text size — **the ladder only goes up.**
 *
 * There is no step below 1. The app's own baseline was set as a floor for
 * readers over forty (13px minimum, 15px body), and a "Smaller" option is a
 * one-tap way back to the illegibility that floor exists to prevent — tapped
 * by accident more often than on purpose, by exactly the people it hurts. A
 * reader who wants a denser screen still has the whole ladder's bottom rung;
 * it is just the same rung everyone starts on.
 *
 * These multiply the browser's base rather than replace it, so a device that
 * is already set to large text starts large and goes larger.
 */
export const APP_TEXT_SCALES = [1, 1.12, 1.25, 1.4];
export const APP_TEXT_LABELS = ["Default", "Large", "Larger", "Largest"];
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
  theme: Theme;
  /** the book's own paper — one of {@link READER_SURFACES}; app chrome ignores it */
  readerTheme: ReaderSurface;
  /** app-wide text size multiplier — one of {@link APP_TEXT_SCALES} */
  appTextScale: number;
  /**
   * Heavier UI text app-wide. Not `font-weight: bold`: Tiro ships one weight,
   * so the Devanagari moves to Mukta instead of being smeared by a
   * synthesized bold. Book text is deliberately left alone — see globals.css.
   */
  boldText: boolean;
  /** user override of the print→page / digital→scroll default; null = automatic */
  readingMode: ReadingMode | null;
  /** tapping the left/right edge turns the page (Pages mode only) */
  tapZones: boolean;
  /**
   * Which side of a facing-page bilingual edition to read — see
   * `lib/bookLanguage.ts`. Stored as the role rather than a language code so
   * one choice carries across books: a reader who wants the English of
   * JVE-ENG wants the Kannada of JVEP-KND-GS, and neither of those is "en".
   *
   * Ignored entirely by every book that is not bilingual, which is all but two
   * of them — there the toggle never appears and nothing is ever hidden.
   */
  readingSide: ReadingSide;
  /**
   * Underline the words Paribhasha can define. Off by default and sticky once
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
  /**
   * Which stage of the study path the reader says they are in — 1–9, or null
   * before they have been asked.
   *
   * **Declared, never inferred.** Nothing the app observes moves it; only the
   * onboarding answer and the reader's own "move me on" do. That is the whole
   * premise of the 19A screens — a stage is somewhere you say you are, not a
   * score — and it is why this sits in prefs beside the reading settings
   * rather than anywhere that syncs progress.
   *
   * Local for the same reason the onboarding says "no account needed": a
   * reader who never signs in still gets a journey. Moving it to `/me/` later
   * would make it follow them between devices, which is the only thing local
   * costs.
   */
  journeyStage: number | null;
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
  // Defers to the app theme, so a reader who never opens the sheet reads on
  // exactly the paper they always did.
  readerTheme: "original",
  // 1 is not "small". The baseline was already raised for this audience, so
  // the default step is the one most readers should never need to leave.
  appTextScale: 1,
  boldText: false,
  readingMode: null,
  tapZones: true,
  // The edition the reader deliberately opened. Someone who taps the English
  // JVEP on the Translations shelf came for the English; giving them the Hindi
  // page first and the English second is the print book's constraint, not
  // theirs. The Hindi is one tap away and the toggle says so.
  readingSide: "translated",
  glossaryUnderline: false,
  lastWorkspace: "originals",
  consent: null,
  playbackRate: 1,
  syncNudgeShown: false,
  immersiveHintShown: false,
  journeyStage: null,
};

/** Resolve `system` against the OS setting. SSR-safe (assumes light). */
export function resolveTheme(theme: Theme): ResolvedTheme {
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

/**
 * The three colours the reader's selection bar offers. See globals.css for the
 * fills and the contrast they were measured at.
 */
export type HighlightColour = "amber" | "sage" | "sky";
export const HIGHLIGHT_COLOURS: HighlightColour[] = ["amber", "sage", "sky"];

/**
 * One painted span inside a paragraph (contract §6.0).
 *
 * `text` matters more than the offsets do: offsets are measured against a
 * paragraph that gets re-extracted and republished, and the words are how the
 * span finds itself again afterwards (`lib/highlights.ts`).
 */
export interface HighlightRange {
  start: number;
  end: number;
  text: string;
  colour: HighlightColour;
}

export interface LocalBookmark {
  canonical_ref: string;
  book_code: string;
  /** the saved line, so a list can show the words rather than the ref */
  text_hi?: string;
  /**
   * **A highlight is a bookmark with a colour.**
   *
   * The designer's Highlights & Notes screen wanted a new thing; the store did
   * not need one. A bookmark already is a passage, a book and the words that
   * were saved — the only fact a highlight adds is which of three colours it
   * was painted in, and a note attached to it is the note that already exists
   * on the same canonical ref.
   *
   * Making it a fourth array would have bought a second sync path, a second
   * tombstone kind and a second thing for the reader's selection bar to decide
   * between, in exchange for a field. Undefined means what it has always
   * meant: saved, but not painted.
   *
   * The BE carries it as of contract §6.0, so it now reaches the account and
   * the reader's other devices. A bookmark that predates the field arrives
   * without one and stays unpainted, which is the same thing it has always
   * meant rather than a colour that failed to load.
   */
  colour?: HighlightColour;
  /**
   * The words actually painted, when the reader chose words rather than a
   * paragraph. Empty or absent means the older, coarser thing: `colour` alone
   * paints the whole paragraph, which is what every highlight made before
   * spans existed is, and they keep working untouched.
   */
  ranges?: HighlightRange[];
  created_at: string;
  server_id?: number;
  /**
   * A colour changed here that the server has not been told about.
   *
   * Only repaints need this. A brand-new bookmark is recognised by having no
   * `server_id` and is pushed for that reason; a repaint happens on a row that
   * already has one, so without a flag it would look settled and the new colour
   * would never leave the device. Cleared once the server confirms the colour
   * that is still the current one — the same test `dirty` does for a note.
   */
  dirty?: boolean;
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

/** the library file a compilation's text came out of — its address (§9) */
export interface ReadingHome {
  node: number;
  item: number;
}

export interface LocalStore {
  bookmarks: LocalBookmark[];
  notes: LocalNote[];
  /** keyed by book_code — one resume position per book */
  progress: Record<string, LocalProgress>;
  /** deleted here, possibly still on the server */
  tombstones: Tombstone[];
  /**
   * Where a **compilation** is read, keyed by book code.
   *
   * Everything else in this store is a position; this is an address, and it is
   * here because without it three of those positions link nowhere. A
   * compilation's bookmark, note and resume row are all book-shaped — they are
   * canonical refs into a real book — but `/books/{code}` is a URL that does
   * not exist for it (Compilations.md D5), so the ref alone cannot be turned
   * into a link. One entry per compilation answers all three, which is why it
   * is a map here rather than a field repeated on every row.
   *
   * Written from both directions, because either can come first: the reader
   * records it on opening the text, and `pull()` fills it in from the server's
   * progress rows so a second device gets working links before it has opened
   * anything.
   */
  reading_homes: Record<string, ReadingHome>;
}

const STORE_KEY = "md.local.v1";
/** v1 of the store, written when this data was guest-only */
const LEGACY_KEY = "md.guest.v1";

const EMPTY: LocalStore = {
  bookmarks: [], notes: [], progress: {}, tombstones: [], reading_homes: {},
};

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
    // `?? {}` and not a migration: a store written before compilations existed
    // simply has no compilations in it.
    reading_homes: source.reading_homes ?? {},
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

/**
 * Remember that this book code is read at this library file.
 *
 * Idempotent and cheap — called on every open of a compilation, because the
 * cost of writing what is already there is nothing next to the cost of a
 * reader whose bookmarks link into a 404.
 */
export function rememberReadingHome(bookCode: string, home: ReadingHome): void {
  if (!bookCode) return;
  const existing = getLocalStore().reading_homes[bookCode];
  if (existing?.node === home.node && existing?.item === home.item) return;
  mutate((store) => {
    store.reading_homes[bookCode] = home;
  });
}

/** Where this book code is read, if it is a compilation this device knows. */
export function readingHomeFor(bookCode: string): ReadingHome | null {
  return getLocalStore().reading_homes[bookCode] ?? null;
}

/**
 * One more span on a paragraph, overlaps collapsed — the same rule the server
 * applies (§6.0), applied here first so the page repaints before the request.
 *
 * Re-selecting a phrase and taking in more of the sentence extends the
 * highlight; re-selecting the same words in another colour repaints them.
 * Reading order, because the renderer walks the paragraph once.
 */
function addSpan(spans: HighlightRange[], added: HighlightRange): HighlightRange[] {
  return [...spans.filter((s) => s.end <= added.start || s.start >= added.end), added].sort(
    (a, b) => a.start - b.start || a.end - b.end
  );
}

/**
 * Take one highlight off a paragraph.
 *
 * The bookmark itself survives as long as anything is left on it — another
 * span, or a whole-paragraph colour. When nothing is, the row goes the usual
 * way, tombstone and all, because a bookmark nobody made deliberately is not
 * something to leave lying in the reader's saved list.
 */
export function removeLocalSpan(canonicalRef: string, start: number, end: number): void {
  mutate((store) => {
    const row = store.bookmarks.find((b) => b.canonical_ref === canonicalRef);
    if (!row) return;
    row.ranges = (row.ranges ?? []).filter((s) => !(s.start === start && s.end === end));
    row.dirty = true;
  });
}

/**
 * Save a passage, painted or plain.
 *
 * `span` is the words the reader actually chose. With it, the paragraph gains
 * one more highlight and keeps the ones it had — several to a paragraph, which
 * is the point of the list (contract §6.0). Without it, the older whole-
 * paragraph colour is set instead, which is still what an audio track or a
 * plain save gets.
 */
export function addLocalBookmark(
  canonicalRef: string,
  bookCode: string,
  textHi?: string,
  colour?: HighlightColour,
  span?: HighlightRange
): void {
  mutate((store) => {
    const existing = store.bookmarks.find((b) => b.canonical_ref === canonicalRef);
    if (existing) {
      if (span) {
        existing.ranges = addSpan(existing.ranges ?? [], span);
        // The server already knows this row; the flag is the only thing that
        // will carry the new span off the device.
        existing.dirty = true;
        return;
      }
      // Re-saving a passage in a different colour repaints it rather than
      // doing nothing. Tapping green on a line already highlighted amber is
      // unambiguous, and "nothing happened" is the one response to it that
      // cannot be right.
      if (colour && existing.colour !== colour) {
        existing.colour = colour;
        existing.dirty = true;
      }
      return;
    }
    store.bookmarks.unshift({
      canonical_ref: canonicalRef,
      book_code: bookCode,
      text_hi: textHi,
      colour: span ? undefined : colour,
      ranges: span ? [span] : undefined,
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

// ---- Track playheads ----
//
// The same idea as a listening position, for content that is not a chapter of
// a book: a Resources collection's audio, played in album mode. Kept in its own
// store because it is keyed by the thing played rather than by a book code,
// and carries no paragraph — there is nothing to re-resolve against, so the
// milliseconds are the whole of it.

const PLAYHEAD_KEY = "md.playhead.v1";

export interface Playhead {
  position_ms: number;
  updated_at: string;
}

type PlayheadStore = Record<string, Playhead>;

/**
 * `key` is stable per playable item, e.g. `library-file:88`.
 *
 * `at` is for a playhead that came *back* from the account rather than from
 * this device's player: the merge that folds another device's listening in has
 * to keep that device's timestamp, or every sync would look newer than the
 * seconds actually being played here and overwrite them.
 */
export function setPlayhead(
  key: string,
  positionMs: number,
  { at }: { at?: string } = {}
): void {
  if (!isBrowser) return;
  const store = read<PlayheadStore>(PLAYHEAD_KEY, {});
  store[key] = {
    position_ms: Math.round(positionMs),
    updated_at: at || new Date().toISOString(),
  };
  write(PLAYHEAD_KEY, store);
}

export function getPlayhead(key: string): number | null;
export function getPlayhead(key: string, opts: { withMeta: true }): Playhead | null;
export function getPlayhead(
  key: string,
  opts?: { withMeta: true }
): number | Playhead | null {
  const row = read<PlayheadStore>(PLAYHEAD_KEY, {})[key];
  if (!row) return null;
  return opts?.withMeta ? row : row.position_ms;
}

/** every saved playhead, newest first — what "continue listening" is drawn from */
export function getPlayheads(): (Playhead & { key: string })[] {
  return Object.entries(read<PlayheadStore>(PLAYHEAD_KEY, {}))
    .map(([key, row]) => ({ key, ...row }))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function clearPlayhead(key: string): void {
  if (!isBrowser) return;
  const store = read<PlayheadStore>(PLAYHEAD_KEY, {});
  delete store[key];
  write(PLAYHEAD_KEY, store);
}

// ---- PDF places ----
//
// Where a reader stopped in a PDF, kept apart from the playheads above for the
// same reason those are kept apart from `progress`: **the unit differs and
// nothing may guess.** A playhead is milliseconds into a rendition; this is a
// page number. Written into the same store they would be indistinguishable,
// and `getPlayheads()` — which every resume card reads as `position_ms` —
// would render page 12 of a document as twelve seconds of a recording.
//
// Keyed identically (`library-file:<id>`), because it is the same file in the
// same library and that key is what carries the place to the account.

const PDF_PAGE_KEY = "md.pdfpage.v1";

export interface PdfPlace {
  /** 1-based, as printed and as a reader would say it */
  page: number;
  /**
   * How long the document is, so a resume card can draw a bar without opening
   * the file. Zero when the place came back from the account, whose progress
   * rows carry a position and no length — the card fills it from the library
   * listing it already fetches, exactly as it does for a recording's duration.
   */
  page_count: number;
  updated_at: string;
}

type PdfPlaceStore = Record<string, PdfPlace>;

/**
 * `at` carries the *other* device's timestamp for a place that arrived from
 * the account, so a sync can never look newer than the page actually being
 * read here and overwrite it. Same rule as {@link setPlayhead}.
 */
export function setPdfPlace(
  key: string,
  page: number,
  { pageCount = 0, at }: { pageCount?: number; at?: string } = {}
): void {
  if (!isBrowser) return;
  const store = read<PdfPlaceStore>(PDF_PAGE_KEY, {});
  store[key] = {
    page: Math.max(1, Math.round(page)),
    // A pull knows the page and not the length; keep whatever this device
    // already learned from opening the file rather than zeroing it.
    page_count: pageCount || store[key]?.page_count || 0,
    updated_at: at || new Date().toISOString(),
  };
  write(PDF_PAGE_KEY, store);
}

export function getPdfPlace(key: string): PdfPlace | null {
  return read<PdfPlaceStore>(PDF_PAGE_KEY, {})[key] ?? null;
}

/** every saved place, newest first — what "continue reading" is drawn from */
export function getPdfPlaces(): (PdfPlace & { key: string })[] {
  return Object.entries(read<PdfPlaceStore>(PDF_PAGE_KEY, {}))
    .map(([key, row]) => ({ key, ...row }))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function clearPdfPlace(key: string): void {
  if (!isBrowser) return;
  const store = read<PdfPlaceStore>(PDF_PAGE_KEY, {});
  delete store[key];
  write(PDF_PAGE_KEY, store);
}

// ---------------------------------------------------------------------------
// How a document is being *looked at* — separate from where the reader is in it
// ---------------------------------------------------------------------------
//
// A place is worth carrying to the account and to another device; a zoom level
// is not, and the account has nowhere to put it. It is also worth keeping apart
// for a plainer reason: this store is a cache as much as a preference. The crop
// box is measured by rendering four pages, which is cheap once and pointless
// twice, so it is written here the first time a document is opened and read
// back instantly on every open after that.

const PDF_VIEW_KEY = "md.pdfview.v1";

export interface PdfView {
  /** committed magnification, 1 = the page fitted to the column */
  zoom: number;
  /** whether the scanned margins are trimmed away */
  crop: boolean;
  /** the measured ink box as fractions of the page: `[x, y, w, h]` */
  box?: [number, number, number, number];
}

type PdfViewStore = Record<string, PdfView>;

export function getPdfView(key: string): PdfView | null {
  return read<PdfViewStore>(PDF_VIEW_KEY, {})[key] ?? null;
}

/** Merge, never replace — the crop box and the zoom are written at different moments. */
export function setPdfView(key: string, patch: Partial<PdfView>): void {
  if (!isBrowser) return;
  const store = read<PdfViewStore>(PDF_VIEW_KEY, {});
  const prev = store[key];
  store[key] = {
    zoom: patch.zoom ?? prev?.zoom ?? 1,
    crop: patch.crop ?? prev?.crop ?? true,
    box: patch.box ?? prev?.box,
  };
  write(PDF_VIEW_KEY, store);
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
  window.localStorage.removeItem(PLAYHEAD_KEY);
  window.localStorage.removeItem(PDF_PAGE_KEY);
  window.localStorage.removeItem(PDF_VIEW_KEY);
}
