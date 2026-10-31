// Being offline, as the app's chrome sees it: whether there is a connection,
// which books are downloaded, and asking the browser to keep what was saved.

import { useSyncExternalStore } from "react";
import { listDownloads } from "./idb";

// ---- connection ----

function subscribeOnline(cb: () => void): () => void {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

/**
 * Whether the browser says there is a connection. Online on the server and in
 * the first paint, so a prerendered page never flashes an offline notice.
 *
 * `navigator.onLine` false is reliable (airplane mode, no network at all);
 * true only means a network exists. That is the right way round for a label
 * that says "offline": it never claims it wrongly.
 */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true
  );
}

// ---- which books are downloaded ----
//
// One shared copy for every cover on a screen — a shelf draws dozens — read
// from IndexedDB once and told when a download is added or removed.

let downloaded: ReadonlySet<string> = new Set();
let loaded = false;
const listeners = new Set<() => void>();

export async function refreshDownloaded(): Promise<void> {
  downloaded = new Set((await listDownloads()).map((d) => d.code));
  loaded = true;
  listeners.forEach((l) => l());
}

function subscribeDownloaded(cb: () => void): () => void {
  listeners.add(cb);
  if (!loaded) void refreshDownloaded();
  return () => listeners.delete(cb);
}

const EMPTY: ReadonlySet<string> = new Set();

export function useDownloadedBooks(): ReadonlySet<string> {
  return useSyncExternalStore(
    subscribeDownloaded,
    () => downloaded,
    () => EMPTY
  );
}

// ---- keeping it ----

/**
 * Ask the browser not to clear this site's storage on its own.
 *
 * Without it, saved books and audio are "best effort": iOS clears a site's
 * storage whole when the phone is short of space, and Safari clears it after
 * seven days without a visit when the app is not on the home screen. Asked at
 * the moment a reader saves something, which is when the answer matters and
 * when Chrome is most likely to grant it. No prompt is shown; the browser
 * decides. Safe to call repeatedly.
 */
export async function keepDownloads(): Promise<void> {
  try {
    if (!navigator.storage?.persist) return;
    if (await navigator.storage.persisted()) return;
    await navigator.storage.persist();
  } catch {
    // not offered here — downloads still work, just without the guarantee
  }
}
