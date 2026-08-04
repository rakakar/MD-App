/**
 * Offline listening — saving a chapter's audio onto the device.
 *
 * Why this is not part of "Download for offline" (which fetches a whole book's
 * text into IndexedDB): audio is heavy in a way text never is. The renditions
 * generated before the BE had ffmpeg are **WAV**, 48 kB per second — one
 * 24-minute chapter is 70 MB, and a whole book most of a
 * gigabyte. mp3 renditions are 6× lighter, but a whole book is still
 * a hundred-plus megabytes, so the shape stands either way: audio is saved
 * one chapter at a time, always deliberately, always with the size shown
 * first (`bytesPerSecond` reads which kind each URL is).
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

/** Bytes per second of speech, by what the URL says the file is. WAV is the
 *  BE's no-ffmpeg fallback (24 kHz 16-bit mono = 48 kB/s, measured); anything
 *  compressed the BE makes is 64 kbps mono (mp3 today, opus in an older
 *  TechSpec) = 8 kB/s. Constant-bitrate both, so these are real numbers. */
function bytesPerSecond(url: string): number {
  return /\.wav($|\?)/i.test(url) ? 48_000 : 8_000;
}

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

/** Estimated bytes for a rendition — duration × the URL's constant bitrate. */
export function renditionBytes(rendition: AudioRendition): number {
  return Math.round((rendition.duration_ms / 1000) * bytesPerSecond(rendition.audio_url));
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

/**
 * Save one chapter's audio. Resolves false when the device or the network said
 * no — the caller shows that, and playback carries on streaming.
 *
 * `onProgress` is called with 0…1 while the bytes arrive, or with `null` once
 * if this download cannot be counted. Two routes, and which one runs is not
 * ours to choose — it depends on whether the media host sends CORS headers:
 *
 *   readable  — the bytes stream through us, so progress is real and the
 *               stored size is the true one.
 *   opaque    — `no-cors`, the browser's escape hatch for a host that does not
 *               permit reading. Cache Storage still takes the response; we
 *               simply cannot see inside it, hence `null` and the estimate.
 *
 * The fallback is not legacy code to delete once the header ships: any CDN or
 * bucket this media later moves to can drop it again, and a reader whose
 * download stops working is a worse outcome than one without a percentage.
 */
export async function saveAudio(
  entry: Omit<SavedAudio, "saved_at">,
  onProgress?: (fraction: number | null) => void
): Promise<boolean> {
  if (!audioSupported()) return false;
  try {
    const cache = await caches.open(AUDIO_CACHE);
    const saved = await readable(entry, cache, onProgress);
    if (saved === null) {
      onProgress?.(null);
      // An opaque response reports status 0, and a redirect would report a
      // status we cannot see either — the only failure this can catch is real.
      const res = await fetch(entry.url, { mode: "no-cors", cache: "no-store" });
      if (res.type !== "opaque" && !res.ok) return false;
      await cache.put(entry.url, res);
    }
    const rows = readLedger().filter((r) => r.url !== entry.url);
    rows.push({ ...entry, bytes: saved ?? entry.bytes, saved_at: Date.now() });
    writeLedger(rows);
    return true;
  } catch {
    // quota exceeded, offline, or the fetch was refused
    return false;
  }
}

/**
 * The counted route: fetch normally, report progress, store the assembled
 * body. Returns the true byte count, or null when the host would not let us
 * read it — which the caller answers by falling back to `no-cors`.
 */
async function readable(
  entry: Omit<SavedAudio, "saved_at">,
  cache: Cache,
  onProgress?: (fraction: number | null) => void
): Promise<number | null> {
  let res: Response;
  try {
    res = await fetch(entry.url, { cache: "no-store" });
  } catch {
    return null; // CORS refusal lands here, indistinguishable from offline
  }
  if (!res.ok || !res.body) return null;
  // Content-Length needs to be in the response's expose list to be visible
  // here; when it isn't, the duration estimate is the honest denominator.
  const total = Number(res.headers.get("content-length")) || entry.bytes;
  const chunks: Uint8Array[] = [];
  let received = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress?.(Math.min(received / total, 0.999));
  }
  const body = new Blob(chunks as BlobPart[], {
    type: res.headers.get("content-type") ?? "audio/mpeg",
  });
  // Re-wrapped rather than cached directly: the response's body is already
  // spent by the read above. Content-Type is carried across because the
  // worker hands this to a media element, which believes it.
  await cache.put(entry.url, new Response(body, { headers: { "Content-Type": body.type } }));
  onProgress?.(1);
  return received;
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
