"use client";

// Personal data — bookmarks, notes, resume positions — for every reader,
// signed in or not.
//
// The rule this file exists to enforce: **reading feels the same either way.**
// A reader who is signed out gets instant saves and an instant resume because
// everything is local. A reader who is signed in used to get neither — writes
// went straight to the network, so a bookmark cost a round-trip, failed
// offline, and their place in a book could not be restored without one. That
// is backwards: the account should add reach, not take away immediacy.
//
// So: **every write lands in localStorage first, synchronously, for everyone.**
// Signing in attaches a second home for the same rows. Sync runs in the
// background — on sign-in, on reconnect, and after each write — and the reader
// never waits on it. What an account buys is the one thing local storage
// genuinely cannot do: the same place in the same book on another device.
//
// Reads follow the same shape: local answers immediately, the server's rows
// fold in when they arrive.

import {
  createBookmark,
  createNote,
  deleteBookmark,
  deleteNote,
  getBookmarks,
  getNotes,
  getProgress,
  updateNote,
  upsertProgress,
} from "./me";
import {
  addLocalBookmark,
  addLocalNote,
  getLocalStore,
  removeLocalBookmark,
  removeLocalNote,
  setLocalProgress,
  setLocalStore,
  type LocalBookmark,
  type LocalNote,
  type LocalProgress,
} from "./storage";

// ---- writes (identical in both states; the sync is what differs) ----

export interface SaveTarget {
  canonical_ref: string;
  book_code: string;
  book_title?: string;
  text_hi?: string;
}

export function saveBookmark(t: SaveTarget, signedIn: boolean): void {
  addLocalBookmark(t.canonical_ref, t.book_code, t.text_hi);
  if (signedIn) void syncPersonal();
}

export function unsaveBookmark(canonicalRef: string, signedIn: boolean): void {
  removeLocalBookmark(canonicalRef);
  if (signedIn) void syncPersonal();
}

export function saveNote(t: SaveTarget, text: string, signedIn: boolean): void {
  addLocalNote(t.canonical_ref, t.book_code, text, t.text_hi);
  if (signedIn) void syncPersonal();
}

export function unsaveNote(canonicalRef: string, signedIn: boolean): void {
  removeLocalNote(canonicalRef);
  if (signedIn) void syncPersonal();
}

/**
 * Where the reader stopped. Written locally on every call — this is what makes
 * resume instant and offline-proof — and pushed to the server at most once per
 * `PROGRESS_PUSH_MS`, because a scrolling reader produces one of these every
 * couple of seconds and none but the last one matters.
 */
const PROGRESS_PUSH_MS = 20_000;
let lastProgressPush = 0;

export function saveProgress(t: SaveTarget & { chapter_number: number }, signedIn: boolean): void {
  setLocalProgress({
    book_code: t.book_code,
    book_title: t.book_title,
    canonical_ref: t.canonical_ref,
    chapter_number: t.chapter_number,
  });
  if (!signedIn) return;
  const now = Date.now();
  if (now - lastProgressPush < PROGRESS_PUSH_MS) return;
  lastProgressPush = now;
  void syncPersonal();
}

/** Push whatever is still pending before the tab goes away. */
export function flushProgress(signedIn: boolean): void {
  if (signedIn) void syncPersonal();
}

// ---- reads ----

export function localBookmarks(): LocalBookmark[] {
  return getLocalStore().bookmarks;
}

export function localNotes(): LocalNote[] {
  return getLocalStore().notes;
}

export function localProgress(): LocalProgress[] {
  return Object.values(getLocalStore().progress).sort((a, b) =>
    b.updated_at.localeCompare(a.updated_at)
  );
}

export function localProgressFor(bookCode: string): LocalProgress | null {
  return getLocalStore().progress[bookCode] ?? null;
}

// ---- sync ----
//
// Stateless sweep: push rows the server has not seen, pull rows this device
// has not seen, honour tombstones. Safe to run twice or to be cut off halfway,
// which matters because it runs on every reconnect.

let inflight: Promise<void> | null = null;

export function syncPersonal(): Promise<void> {
  if (inflight) return inflight;
  inflight = run().finally(() => {
    inflight = null;
  });
  return inflight;
}

async function run(): Promise<void> {
  try {
    await push();
    await pull();
  } catch {
    // offline, or the session lapsed — local stays authoritative and the next
    // reconnect tries again. Never surfaced: the reader's data is not at risk.
  }
}

async function push(): Promise<void> {
  // Work from a snapshot and record outcomes, then apply them to a freshly
  // read store at the end. The reader keeps saving things while these requests
  // are in flight; writing a stale snapshot back would swallow them.
  const snapshot = getLocalStore();
  const bookmarkIds = new Map<string, number>();
  const noteIds = new Map<string, number>();
  const notesPushed = new Map<string, string>(); // ref → the text the server took
  const progressPushed = new Map<string, string>(); // book_code → the ref it took
  const tombstonesSettled = new Set<string>();

  for (const b of snapshot.bookmarks) {
    if (b.server_id !== undefined) continue;
    try {
      const created = await createBookmark(b.canonical_ref);
      if (created?.id !== undefined) bookmarkIds.set(b.canonical_ref, created.id);
    } catch (e) {
      // 400 = not a published paragraph; retrying will never help
      if (!isPermanent(e)) throw e;
    }
  }

  for (const n of snapshot.notes) {
    try {
      if (n.server_id === undefined) {
        const created = await createNote(n.canonical_ref, n.text);
        if (created?.id !== undefined) noteIds.set(n.canonical_ref, created.id);
        notesPushed.set(n.canonical_ref, n.text);
      } else if (n.dirty) {
        await updateNote(n.server_id, n.text);
        notesPushed.set(n.canonical_ref, n.text);
      }
    } catch (e) {
      if (!isPermanent(e)) throw e;
    }
  }

  for (const p of Object.values(snapshot.progress)) {
    if (p.synced) continue;
    try {
      await upsertProgress(p.canonical_ref);
      progressPushed.set(p.book_code, p.canonical_ref);
    } catch (e) {
      if (!isPermanent(e)) throw e;
      // unresolvable ref — stop retrying it on every reconnect
      progressPushed.set(p.book_code, p.canonical_ref);
    }
  }

  for (const t of snapshot.tombstones) {
    if (t.server_id === undefined) {
      tombstonesSettled.add(tombstoneKey(t));
      continue; // never reached the server
    }
    try {
      if (t.kind === "bookmark") await deleteBookmark(t.server_id);
      else await deleteNote(t.server_id);
      tombstonesSettled.add(tombstoneKey(t));
    } catch (e) {
      // 404 = already gone, which is the outcome we wanted
      if (isPermanent(e)) tombstonesSettled.add(tombstoneKey(t));
    }
  }

  const store = getLocalStore();
  for (const b of store.bookmarks) {
    const id = bookmarkIds.get(b.canonical_ref);
    if (id !== undefined) b.server_id ??= id;
  }
  for (const n of store.notes) {
    const id = noteIds.get(n.canonical_ref);
    if (id !== undefined) n.server_id ??= id;
    // only clear `dirty` if the text the server took is still the current one
    if (n.dirty && notesPushed.get(n.canonical_ref) === n.text) n.dirty = false;
  }
  for (const p of Object.values(store.progress)) {
    if (progressPushed.get(p.book_code) === p.canonical_ref) p.synced = true;
  }
  store.tombstones = store.tombstones.filter((t) => !tombstonesSettled.has(tombstoneKey(t)));

  setLocalStore(store);
}

const tombstoneKey = (t: { kind: string; canonical_ref: string }) =>
  `${t.kind}:${t.canonical_ref}`;

async function pull(): Promise<void> {
  const [bookmarks, notes, progress] = await Promise.all([
    getBookmarks(),
    getNotes(),
    getProgress(),
  ]);

  const store = getLocalStore();
  const deleted = new Set(store.tombstones.map((t) => `${t.kind}:${t.canonical_ref}`));

  // bookmarks: union by ref, adopting server ids for rows we already hold
  const byRef = new Map(store.bookmarks.map((b) => [b.canonical_ref, b]));
  for (const s of bookmarks) {
    if (deleted.has(`bookmark:${s.canonical_ref}`)) continue;
    const mine = byRef.get(s.canonical_ref);
    if (mine) {
      mine.server_id = s.id;
      mine.text_hi ??= s.text_hi;
    } else {
      store.bookmarks.push({
        canonical_ref: s.canonical_ref,
        book_code: s.canonical_ref.split(" ")[0] ?? "",
        text_hi: s.text_hi,
        created_at: s.created_at ?? new Date().toISOString(),
        server_id: s.id,
      });
    }
  }

  // notes: same union, but a locally edited note is not overwritten — it is
  // still queued to go the other way
  const notesByRef = new Map(store.notes.map((n) => [n.canonical_ref, n]));
  for (const s of notes) {
    if (deleted.has(`note:${s.canonical_ref}`)) continue;
    const mine = notesByRef.get(s.canonical_ref);
    if (mine) {
      mine.server_id = s.id;
      mine.text_hi ??= s.text_hi;
      if (!mine.dirty) mine.text = s.text;
    } else {
      store.notes.push({
        canonical_ref: s.canonical_ref,
        book_code: s.canonical_ref.split(" ")[0] ?? "",
        text_hi: s.text_hi,
        text: s.text,
        created_at: s.created_at ?? new Date().toISOString(),
        updated_at: s.updated_at ?? s.created_at ?? new Date().toISOString(),
        server_id: s.id,
      });
    }
  }

  // progress: newest wins. This is the cross-device promise — the position
  // from the phone you were reading on ten minutes ago should beat the one
  // this laptop remembers from last week.
  for (const s of progress) {
    if (!s.book_code) continue;
    const mine = store.progress[s.book_code];
    const theirs = s.updated_at ?? "";
    if (mine && !mine.synced) continue; // ours is newer and not yet pushed
    if (mine && theirs <= mine.updated_at) continue;
    store.progress[s.book_code] = {
      book_code: s.book_code,
      book_title: s.book_title ?? mine?.book_title,
      canonical_ref: s.canonical_ref,
      chapter_number: Number(s.canonical_ref.match(/\s([^.]+)\./)?.[1]) || 0,
      updated_at: theirs || new Date().toISOString(),
      synced: true,
    };
  }

  setLocalStore(store);
}

/** A failure that retrying cannot fix (bad ref, gone, not ours). */
function isPermanent(e: unknown): boolean {
  const status = (e as { status?: number })?.status;
  return status !== undefined && status >= 400 && status < 500 && status !== 429;
}

// ---- lifecycle ----

/** Retry pending writes when the network comes back. */
export function watchConnectivity(signedIn: () => boolean): () => void {
  const onOnline = () => {
    if (signedIn()) void syncPersonal();
  };
  window.addEventListener("online", onOnline);
  return () => window.removeEventListener("online", onOnline);
}
