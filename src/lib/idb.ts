// IndexedDB chapter cache (contract §5: immutable content, cache
// aggressively, revalidate on the 900s TTL) + per-book offline downloads.

import type { ChapterPayload, ParibhashaIndex, ParibhashaWord } from "./types";

const DB_NAME = "md-reader";
const DB_VERSION = 2;
const CHAPTERS = "chapters"; // key: `${code}/${number}`
const DOWNLOADS = "downloads"; // key: book code → {code, chapters: n, saved_at}
const GLOSSARY = "glossary"; // key: "index" → the one Paribhasha headword list

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
      // v2. Each store is created only if missing, so an existing reader's
      // cached chapters and downloads survive the version bump untouched.
      if (!db.objectStoreNames.contains(GLOSSARY)) {
        db.createObjectStore(GLOSSARY, { keyPath: "key" });
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

// ---- Paribhasha (§14) ----
//
// Three kinds of row in one store, in the order a reader acquires them:
//
//   "index"    — every headword, 25 KB. Downloaded as soon as the reader opens
//                a chapter, because knowing *which* words have a definition is
//                what makes marking them possible without a request per
//                paragraph.
//   "full"     — the whole dictionary with definitions, 143 KB, fetched the
//                first time the reader actually opens one. From then on every
//                tap is answered from here: instant, and offline.
//   "w:<word>" — one looked-up definition. This is the fallback that covers
//                the gap before "full" lands, and the reader whose full
//                download never succeeded.
//
// All three are governed by one `version` string. When it moves, everything
// but the fresh index is dropped.

interface CachedGlossary {
  key: "index";
  version: string;
  words: ParibhashaIndex["words"];
}

interface CachedFullGlossary {
  key: "full";
  version: string;
  words: ParibhashaWord[];
}

interface CachedDefinition {
  key: string; // `w:${headword}`
  entry: ParibhashaWord;
}

const defKey = (word: string) => `w:${word}`;

export async function getCachedGlossary(): Promise<CachedGlossary | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    return (
      (await tx<CachedGlossary | undefined>(GLOSSARY, "readonly", (s) => s.get("index"))) ?? null
    );
  } catch {
    return null;
  }
}

export async function putCachedGlossary(index: ParibhashaIndex): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    await tx(GLOSSARY, "readwrite", (s) =>
      s.put({ key: "index", version: index.version, words: index.words } satisfies CachedGlossary)
    );
  } catch {
    // quota exceeded etc. — the reader still works, just without underlines
  }
}

export async function getCachedFullGlossary(): Promise<CachedFullGlossary | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    return (
      (await tx<CachedFullGlossary | undefined>(GLOSSARY, "readonly", (s) => s.get("full"))) ?? null
    );
  } catch {
    return null;
  }
}

export async function putCachedFullGlossary(
  version: string,
  words: ParibhashaWord[]
): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    await tx(GLOSSARY, "readwrite", (s) =>
      s.put({ key: "full", version, words } satisfies CachedFullGlossary)
    );
  } catch {
    // ~900 KB uncompressed. If the device says no, taps fall back to the
    // network exactly as they did before — nothing else breaks.
  }
}

export async function getCachedDefinition(word: string): Promise<ParibhashaWord | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const row = await tx<CachedDefinition | undefined>(GLOSSARY, "readonly", (s) =>
      s.get(defKey(word))
    );
    return row?.entry ?? null;
  } catch {
    return null;
  }
}

export async function putCachedDefinition(word: string, entry: ParibhashaWord): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    await tx(GLOSSARY, "readwrite", (s) => s.put({ key: defKey(word), entry } satisfies CachedDefinition));
  } catch {
    // best-effort, exactly like the chapter cache
  }
}

/**
 * Drop every held definition — the full dictionary and the individually
 * looked-up words — keeping only the freshly written index row.
 *
 * Called when the glossary's `version` moves, which is the signal that a
 * manager corrected something. A corrected definition that never reaches the
 * reader is worse than no cache at all, and the BE's version now moves for a
 * definition edit as well as a word edit, so this is the whole invalidation
 * story in one function.
 */
export async function clearCachedDefinitions(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const keys = await tx<IDBValidKey[]>(GLOSSARY, "readonly", (s) => s.getAllKeys());
    await Promise.all(
      keys
        .filter((k) => typeof k === "string" && k !== "index")
        .map((k) => tx(GLOSSARY, "readwrite", (s) => s.delete(k)))
    );
  } catch {
    // nothing to do — a stale definition is not worth failing a read over
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
