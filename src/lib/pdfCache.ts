/**
 * Library PDFs saved inside the app, to read with no connection.
 *
 * Not the library's Download button, which hands the file to the phone's Files
 * app where this app cannot read it. A PDF saved here opens in our own reader,
 * offline, at the reader's saved page.
 *
 * Mechanics, the same shape as saved audio (audioCache.ts): the file is fetched
 * with CORS (the media host allows it — pdf.js already depends on that) and put
 * in a Cache Storage bucket that public/sw.js reads on the way past, answering
 * the reader's range requests from it. So the reader is unchanged: it asks for
 * `file.url` as always and gets the device's copy when there is one.
 *
 * The reader page itself (`/library/:node/read/:file`) and `/downloads` are
 * saved into the same bucket, so a tap on a saved PDF opens offline too.
 */

import { formatBytes } from "./audioCache";
import { keepDownloads } from "./offline";
import { saveOfflinePages } from "./offlinePages";

/** Outside the worker's `md-sw-v*` namespace so a deploy cannot sweep it. */
export const PDF_CACHE = "md-pdfs-v1";

const LEDGER_KEY = "md.pdf.saved";

export interface SavedPdf {
  id: number;
  node: number;
  title: string;
  url: string;
  thumbnail_url: string | null;
  page_count: number | null;
  /** the folder it was saved from, for the line under its title */
  folder: string;
  bytes: number;
  saved_at: number;
}

export function pdfSupported(): boolean {
  return typeof window !== "undefined" && "caches" in window;
}

export function readerPath(node: number, id: number): string {
  return `/library/${node}/read/${id}`;
}

// ---- the ledger, and who is listening to it ----

const listeners = new Set<() => void>();

function readLedger(): SavedPdf[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    const rows = raw ? (JSON.parse(raw) as SavedPdf[]) : [];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function writeLedger(rows: SavedPdf[]): void {
  try {
    localStorage.setItem(LEDGER_KEY, JSON.stringify(rows));
  } catch {
    // the file is saved either way; only the listing suffers
  }
  listeners.forEach((l) => l());
}

/** Told whenever a PDF is saved or removed, on any screen. */
export function onSavedPdfsChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/**
 * What is actually on the device — reconciled against Cache Storage on every
 * read, because the browser can evict a cache without telling anyone.
 */
export async function listSavedPdfs(): Promise<SavedPdf[]> {
  const rows = readLedger();
  if (!pdfSupported() || rows.length === 0) return [];
  try {
    const cache = await caches.open(PDF_CACHE);
    const present = new Set((await cache.keys()).map((r) => r.url));
    const live = rows.filter((r) => present.has(r.url));
    if (live.length !== rows.length) writeLedger(live);
    return live.sort((a, b) => b.saved_at - a.saved_at);
  } catch {
    return rows;
  }
}

export function isPdfSavedSync(id: number): boolean {
  return readLedger().some((r) => r.id === id);
}

/**
 * Save one PDF. `onProgress` gets 0…1 as the bytes arrive. Resolves false when
 * the device or the network said no (offline, out of space, refused).
 */
export async function savePdf(
  entry: Omit<SavedPdf, "saved_at" | "bytes"> & { bytes?: number | null },
  onProgress?: (fraction: number) => void
): Promise<boolean> {
  if (!pdfSupported()) return false;
  void keepDownloads();
  try {
    const res = await fetch(entry.url, { cache: "no-store" });
    if (!res.ok || !res.body) return false;
    const total = Number(res.headers.get("content-length")) || entry.bytes || 0;
    const chunks: Uint8Array[] = [];
    let received = 0;
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (total) onProgress?.(Math.min(received / total, 0.97));
    }
    const body = new Blob(chunks as BlobPart[], { type: "application/pdf" });
    const cache = await caches.open(PDF_CACHE);
    // Length and ranges declared, so pdf.js treats the saved copy as it would
    // the host: it reads the pages it needs rather than the whole file at once.
    await cache.put(
      entry.url,
      new Response(body, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Length": String(body.size),
          "Accept-Ranges": "bytes",
        },
      })
    );
    // The page that opens it, and the list that leads to it. Best effort: the
    // file is what matters, and online the page loads from the network anyway.
    await saveOfflinePages([readerPath(entry.node, entry.id), "/downloads"], {
      cacheName: PDF_CACHE,
    }).catch(() => undefined);
    onProgress?.(1);
    const rows = readLedger().filter((r) => r.id !== entry.id);
    rows.push({ ...entry, bytes: body.size, saved_at: Date.now() });
    writeLedger(rows);
    return true;
  } catch {
    return false;
  }
}

export async function removePdf(id: number): Promise<void> {
  const rows = readLedger();
  const gone = rows.find((r) => r.id === id);
  const left = rows.filter((r) => r.id !== id);
  if (pdfSupported()) {
    try {
      if (left.length === 0) {
        // the last one: the build files its page needed go with it
        await caches.delete(PDF_CACHE);
      } else if (gone) {
        const cache = await caches.open(PDF_CACHE);
        await cache.delete(gone.url);
        await cache.delete(readerPath(gone.node, gone.id));
      }
    } catch {
      // the ledger is corrected regardless
    }
  }
  writeLedger(left);
}

export { formatBytes };
