/**
 * Offline listening — saving a chapter's audio onto the device.
 *
 * Why this is not part of "Download for offline" (which fetches a whole book's
 * text into IndexedDB): the BE serves renditions as **WAV**, at 48 kB per
 * second of speech. One 24-minute chapter is 70 MB, and मानव व्यवहार दर्शन
 * entire is most of a gigabyte. A one-tap whole-book audio download would
 * quietly eat a reader's phone and their mobile data, so audio is saved one
 * chapter at a time, always deliberately, always with the size shown first.
 * (When the BE grows an mp3/opus rendition — a tenth of the bytes — this file
 * needs no change beyond `BYTES_PER_SECOND`.)
 *
 * Mechanics: the file is fetched `no-cors` (the media host sends no CORS
 * headers) and put in a Cache Storage bucket the service worker reads on the
 * way past. So playback is unchanged — the same <audio src> as always, served
 * locally when it is there. The response is opaque, which costs us two things
 * worth knowing: no download progress (the body cannot be read) and no byte
 * count (hence the estimate from duration, and the ledger below).
 */

import type { AudioRendition } from "./types";

/** Deliberately outside the `md-sw-v*` namespace: a worker upgrade sweeps its
 *  own caches, and a reader's saved audio must survive a deploy. */
export const AUDIO_CACHE = "md-audio-v1";

/** 24 kHz, 16-bit, mono — measured against the served files, not guessed. */
const BYTES_PER_SECOND = 48_000;

/** The ledger. Opaque responses report no size, so what a reader has saved and
 *  what it cost is remembered here rather than read back from the cache. */
const LEDGER_KEY = "md.audio.saved";

export interface SavedAudio {
  url: string;
  book_code: string;
  book_title: string;
  chapter_number: number;
  chapter_title: string;
  voice_label: string;
  bytes: number;
  saved_at: number;
}

export function audioSupported(): boolean {
  return typeof window !== "undefined" && "caches" in window;
}

/** Estimated bytes for a rendition. WAV is a constant bitrate, so this is the
 *  real number, not a guess; anything else is left to the ledger's honesty. */
export function renditionBytes(rendition: AudioRendition): number {
  return Math.round((rendition.duration_ms / 1000) * BYTES_PER_SECOND);
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 1_000_000) return `${Math.round(bytes / 1_000_000)} MB`;
  return `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

function readLedger(): SavedAudio[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    const rows = raw ? (JSON.parse(raw) as SavedAudio[]) : [];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function writeLedger(rows: SavedAudio[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LEDGER_KEY, JSON.stringify(rows));
  } catch {
    // the audio is saved either way; only the listing suffers
  }
}

/**
 * What is actually on the device.
 *
 * Reconciled against Cache Storage on every read, because the browser can
 * evict a cache under storage pressure without telling anyone, and a list
 * offering to play chapters that are no longer there is worse than no list.
 */
export async function listSavedAudio(): Promise<SavedAudio[]> {
  const rows = readLedger();
  if (!audioSupported() || rows.length === 0) return [];
  const cache = await caches.open(AUDIO_CACHE);
  const present = new Set((await cache.keys()).map((r) => r.url));
  const live = rows.filter((r) => present.has(r.url));
  if (live.length !== rows.length) writeLedger(live);
  return live.sort((a, b) => b.saved_at - a.saved_at);
}

export async function isAudioSaved(url: string): Promise<boolean> {
  if (!audioSupported()) return false;
  try {
    const cache = await caches.open(AUDIO_CACHE);
    return Boolean(await cache.match(url));
  } catch {
    return false;
  }
}

/** Save one chapter's audio. Resolves false when the device or the network
 *  said no — the caller shows that, and playback carries on streaming. */
export async function saveAudio(entry: Omit<SavedAudio, "saved_at">): Promise<boolean> {
  if (!audioSupported()) return false;
  try {
    const cache = await caches.open(AUDIO_CACHE);
    // no-cors: the media host sends no CORS headers, so this is an opaque
    // response. Cache Storage takes it; nothing may read it but the browser.
    const res = await fetch(entry.url, { mode: "no-cors", cache: "no-store" });
    // An opaque response reports status 0 and a redirect would report a status
    // we cannot see either — the only failure this can catch is a real one.
    if (res.type !== "opaque" && !res.ok) return false;
    await cache.put(entry.url, res);
    const rows = readLedger().filter((r) => r.url !== entry.url);
    rows.push({ ...entry, saved_at: Date.now() });
    writeLedger(rows);
    return true;
  } catch {
    // quota exceeded, offline, or the fetch was refused
    return false;
  }
}

export async function removeAudio(url: string): Promise<void> {
  if (!audioSupported()) return;
  try {
    const cache = await caches.open(AUDIO_CACHE);
    await cache.delete(url);
  } catch {
    // fall through — the ledger is corrected regardless
  }
  writeLedger(readLedger().filter((r) => r.url !== url));
}

export async function removeAllAudio(): Promise<void> {
  if (!audioSupported()) return;
  try {
    await caches.delete(AUDIO_CACHE);
  } catch {
    // ignore
  }
  writeLedger([]);
}
