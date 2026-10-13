/**
 * **The notifications inbox — on this device.**
 *
 * Every push the device receives is kept here, so a reader can see what they
 * were sent after the banner has gone: the bell, the dot on the avatar, and
 * the Notifications screen all read this one store.
 *
 * It is local because there is no inbox on the server yet (see
 * `docs/notifications.md`, which also specs the endpoint that would make it
 * follow a reader between devices). Two writers:
 *
 * - **the push service worker** (`public/firebase-messaging-sw.js`) for the
 *   web, app open or closed — it writes before deciding how to show it, so
 *   nothing that arrives is missed;
 * - **the page**, for the Android and iOS shells, where a push arrives through
 *   the native plugin and no service worker sees it (`PushProvider`).
 *
 * Its own IndexedDB database rather than a store in `md-reader`: the worker
 * opens it too, and two codebases bumping one database's version is how one
 * of them ends up blocked on the other's upgrade.
 *
 * Every write is announced on a BroadcastChannel, so a badge in one tab — or
 * the page under a worker that just wrote — updates without polling.
 */

export const INBOX_DB = "md-inbox";
const INBOX_VERSION = 1;
const STORE = "items";
const CHANNEL = "md-inbox";
/** kept, newest first; older ones fall off */
const KEEP = 100;

/**
 * What a notification is about — only for its icon. A push says it in
 * `data.kind` when the sender sets one; otherwise it is read off the link.
 */
export type InboxKind = "stage" | "feedback" | "event" | "highlight" | "general";

export interface InboxItem {
  id: string;
  title: string;
  body: string;
  clickUrl: string;
  imageUrl?: string;
  kind: InboxKind;
  /** ms since epoch */
  receivedAt: number;
  read: boolean;
}

/** The kind a link implies. Kept in step with `kindOf` in the push worker. */
export function kindOf(clickUrl: string, declared?: string): InboxKind {
  const k = (declared || "").toLowerCase();
  if (k === "stage" || k === "feedback" || k === "event" || k === "highlight") return k;
  let path = clickUrl || "/";
  try {
    path = new URL(path, "https://x").pathname;
  } catch {
    /* not a URL; read it as a path */
  }
  if (/^\/(feedback)/.test(path)) return "feedback";
  if (/^\/(events|connect|shivir)/.test(path)) return "event";
  if (/^\/(journey|stage|me\/journey)/.test(path)) return "stage";
  if (/^\/(me\/bookmarks|me\/highlights|books\/)/.test(path)) return "highlight";
  return "general";
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(INBOX_DB, INBOX_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return open().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        t.oncomplete = () => {
          db.close();
          resolve(req ? req.result : undefined);
        };
        t.onerror = () => {
          db.close();
          reject(t.error);
        };
      })
  );
}

function announce() {
  try {
    const ch = new BroadcastChannel(CHANNEL);
    ch.postMessage({ type: "changed" });
    ch.close();
  } catch {
    /* no BroadcastChannel (very old Safari): the screens refresh on focus */
  }
}

/** Newest first. Empty where IndexedDB is unavailable — never throws. */
export async function listInbox(): Promise<InboxItem[]> {
  if (typeof indexedDB === "undefined") return [];
  try {
    const all = (await tx<InboxItem[]>("readonly", (s) => s.getAll() as IDBRequest<InboxItem[]>)) ?? [];
    return all.sort((a, b) => b.receivedAt - a.receivedAt);
  } catch {
    return [];
  }
}

/**
 * Keep a push the page received itself (the native shells).
 *
 * A repeat of the same message within ten minutes is the same message — a
 * shell can report one push twice, once on arrival and once on the tap.
 */
export async function addToInbox(
  m: { title: string; body: string; clickUrl?: string; imageUrl?: string; kind?: string },
  opts: { read?: boolean } = {}
): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const now = Date.now();
  const clickUrl = m.clickUrl || "/";
  const items = await listInbox();
  const twin = items.find(
    (i) => i.title === m.title && i.body === m.body && i.clickUrl === clickUrl && now - i.receivedAt < 10 * 60_000
  );
  if (twin) {
    if (opts.read && !twin.read) await markRead(twin.id);
    return;
  }
  const item: InboxItem = {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    title: m.title || "MD Study",
    body: m.body || "",
    clickUrl,
    imageUrl: m.imageUrl || undefined,
    kind: kindOf(clickUrl, m.kind),
    receivedAt: now,
    read: !!opts.read,
  };
  try {
    await tx("readwrite", (s) => {
      s.put(item);
      // the oldest past KEEP fall off
      for (const old of items.slice(KEEP - 1)) s.delete(old.id);
    });
    announce();
  } catch {
    /* storage refused (private mode, quota): the banner was still shown */
  }
}

export async function markRead(id: string): Promise<void> {
  try {
    await tx("readwrite", (s) => {
      const get = s.get(id);
      get.onsuccess = () => {
        const item = get.result as InboxItem | undefined;
        if (item && !item.read) s.put({ ...item, read: true });
      };
    });
    announce();
  } catch {
    /* nothing to do */
  }
}

export async function markAllRead(): Promise<void> {
  const items = await listInbox();
  try {
    await tx("readwrite", (s) => {
      for (const i of items) if (!i.read) s.put({ ...i, read: true });
    });
    announce();
  } catch {
    /* nothing to do */
  }
}

/** Call `fn` whenever the inbox changes, here or in a worker or another tab. */
export function onInboxChange(fn: () => void): () => void {
  let ch: BroadcastChannel | null = null;
  try {
    ch = new BroadcastChannel(CHANNEL);
    ch.onmessage = () => fn();
  } catch {
    /* refreshed on focus instead */
  }
  const onVisible = () => {
    if (document.visibilityState === "visible") fn();
  };
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    ch?.close();
    document.removeEventListener("visibilitychange", onVisible);
  };
}
