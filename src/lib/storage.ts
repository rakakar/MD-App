// Device-local state: preferences (always localStorage, PRD §9) and the
// guest personal store that feeds guest My Journey and merges on login.

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
  /** line-height multiplier for Devanagari body text */
  lineHeight: number;
  /** 0 = narrow gutters, 1 = normal, 2 = wide */
  margin: number;
  theme: ReaderTheme;
  /** user override of the print→page / digital→scroll default; null = automatic */
  readingMode: ReadingMode | null;
  /** tapping the left/right edge turns the page (Pages mode only) */
  tapZones: boolean;
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
  lineHeight: 1.85,
  margin: 1,
  // a reader that opens bright at night is the single most common complaint
  // about reading apps — follow the OS unless the user says otherwise
  theme: "system",
  readingMode: null,
  tapZones: true,
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

// ---- Guest personal data (canonical_ref anchored, never indices) ----

export interface LocalBookmark {
  canonical_ref: string;
  book_code: string;
  created_at: string;
}

export interface LocalNote {
  canonical_ref: string;
  book_code: string;
  text: string;
  created_at: string;
  updated_at: string;
}

export interface LocalProgress {
  book_code: string;
  book_title?: string;
  canonical_ref: string;
  chapter_number: number;
  updated_at: string;
}

interface GuestStore {
  bookmarks: LocalBookmark[];
  notes: LocalNote[];
  /** keyed by book_code — one resume position per book */
  progress: Record<string, LocalProgress>;
}

const GUEST_KEY = "md.guest.v1";

export function getGuestStore(): GuestStore {
  return read<GuestStore>(GUEST_KEY, { bookmarks: [], notes: [], progress: {} });
}

function setGuestStore(store: GuestStore): void {
  write(GUEST_KEY, store);
}

export function addLocalBookmark(canonicalRef: string, bookCode: string): void {
  const store = getGuestStore();
  if (store.bookmarks.some((b) => b.canonical_ref === canonicalRef)) return;
  store.bookmarks.unshift({
    canonical_ref: canonicalRef,
    book_code: bookCode,
    created_at: new Date().toISOString(),
  });
  setGuestStore(store);
}

export function removeLocalBookmark(canonicalRef: string): void {
  const store = getGuestStore();
  store.bookmarks = store.bookmarks.filter((b) => b.canonical_ref !== canonicalRef);
  setGuestStore(store);
}

export function addLocalNote(canonicalRef: string, bookCode: string, text: string): void {
  const store = getGuestStore();
  const now = new Date().toISOString();
  const existing = store.notes.find((n) => n.canonical_ref === canonicalRef);
  if (existing) {
    existing.text = text;
    existing.updated_at = now;
  } else {
    store.notes.unshift({
      canonical_ref: canonicalRef,
      book_code: bookCode,
      text,
      created_at: now,
      updated_at: now,
    });
  }
  setGuestStore(store);
}

export function removeLocalNote(canonicalRef: string): void {
  const store = getGuestStore();
  store.notes = store.notes.filter((n) => n.canonical_ref !== canonicalRef);
  setGuestStore(store);
}

export function setLocalProgress(p: Omit<LocalProgress, "updated_at">): void {
  const store = getGuestStore();
  store.progress[p.book_code] = { ...p, updated_at: new Date().toISOString() };
  setGuestStore(store);
}

export function getLocalProgress(bookCode: string): LocalProgress | null {
  return getGuestStore().progress[bookCode] ?? null;
}

/** recently-read list for guest My Journey, newest first */
export function getRecentlyRead(): LocalProgress[] {
  return Object.values(getGuestStore().progress).sort((a, b) =>
    b.updated_at.localeCompare(a.updated_at)
  );
}

/** after a successful merge-on-login, local copies are cleared (PRD §9) */
export function clearGuestStore(): void {
  if (!isBrowser) return;
  window.localStorage.removeItem(GUEST_KEY);
}
