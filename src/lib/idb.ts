// IndexedDB chapter cache (contract §5: immutable content, cache
// aggressively, revalidate on the 900s TTL) + per-book offline downloads.

import type { ChapterPayload } from "./types";

const DB_NAME = "md-reader";
const DB_VERSION = 1;
const CHAPTERS = "chapters"; // key: `${code}/${number}`
const DOWNLOADS = "downloads"; // key: book code → {code, chapters: n, saved_at}

interface CachedChapter {
  key: string;
  code: string;
  number: number;
  fetched_at: number;
  payload: ChapterPayload;
}

export interface DownloadRecord {
  code: string;
  title_hi: string;
  chapter_count: number;
  saved_at: number;
}

const TTL_MS = 900_000;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CHAPTERS)) {
        db.createObjectStore(CHAPTERS, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(DOWNLOADS)) {
        db.createObjectStore(DOWNLOADS, { keyPath: "code" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      })
  );
}

export async function getCachedChapter(
  code: string,
  number: number
): Promise<{ payload: ChapterPayload; fresh: boolean } | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const row = await tx<CachedChapter | undefined>(CHAPTERS, "readonly", (s) =>
      s.get(`${code}/${number}`)
    );
    if (!row) return null;
    return { payload: row.payload, fresh: Date.now() - row.fetched_at < TTL_MS };
  } catch {
    return null;
  }
}

export async function putCachedChapter(
  code: string,
  number: number,
  payload: ChapterPayload
): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    await tx(CHAPTERS, "readwrite", (s) =>
      s.put({
        key: `${code}/${number}`,
        code,
        number,
        fetched_at: Date.now(),
        payload,
      } satisfies CachedChapter)
    );
  } catch {
    // quota exceeded etc. — cache is best-effort
  }
}

export async function markDownloaded(record: Omit<DownloadRecord, "saved_at">): Promise<void> {
  await tx(DOWNLOADS, "readwrite", (s) => s.put({ ...record, saved_at: Date.now() }));
}

export async function getDownload(code: string): Promise<DownloadRecord | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    return (await tx<DownloadRecord | undefined>(DOWNLOADS, "readonly", (s) => s.get(code))) ?? null;
  } catch {
    return null;
  }
}

export async function listDownloads(): Promise<DownloadRecord[]> {
  if (typeof indexedDB === "undefined") return [];
  try {
    return await tx<DownloadRecord[]>(DOWNLOADS, "readonly", (s) => s.getAll());
  } catch {
    return [];
  }
}

export async function removeDownload(code: string): Promise<void> {
  await tx(DOWNLOADS, "readwrite", (s) => s.delete(code));
  // drop that book's cached chapters too
  const all = await tx<CachedChapter[]>(CHAPTERS, "readonly", (s) => s.getAll());
  await Promise.all(
    all
      .filter((c) => c.code === code)
      .map((c) => tx(CHAPTERS, "readwrite", (s) => s.delete(c.key)))
  );
}
