// The pages of downloaded books, kept so they open with no connection.
//
// A download puts every chapter's text in IndexedDB (lib/idb), but text alone
// opens nothing: offline, tapping a chapter is a page load, and the service
// worker could only answer it from the pages a reader happened to visit
// online. A chapter never opened showed "You're offline" with its text sitting
// on the phone. So a download also saves the book page, each chapter page, and
// the build files those pages run on, here.
//
// Its own cache, apart from the worker's recently-visited pages: that one keeps
// 120 pages and drops the oldest, and is emptied whenever the worker's VERSION
// changes. A book the reader chose to download stays until they remove it. The
// build files are kept beside the pages that need them, so a deploy that ships
// new ones cannot leave a saved page pointing at files that are gone.
//
// public/sw.js reads this cache by the same name.

import { cachedChapterNumbers, listDownloads } from "./idb";

export const BOOK_PAGES_CACHE = "md-books-v1";

/** Saved with every download, so the app can be opened and found offline:
 *  the home screen icon opens "/", Downloads is the way into a book, and the
 *  book lists and the reader's own notes and highlights work from the device.
 *  Only screens that need nothing from the network once loaded belong here. */
const SHELL_PATHS = ["/", "/settings", "/books", "/translations", "/me", "/me/bookmarks", "/me/notes"];

const ASSET_RE = /\/(?:_next\/static|brand)\/[^"'`\s\\)<>]+/g;
const IS_ASSET = /^\/(?:_next\/static|brand)\//;

function available(): boolean {
  return typeof caches !== "undefined";
}

export function bookPagePaths(code: string, chapters: number[]): string[] {
  const c = encodeURIComponent(code);
  return [`/books/${c}`, ...chapters.map((n) => `/books/${c}/${n}`)];
}

/** Build files an HTML page or stylesheet refers to, as same-origin paths. */
function assetsIn(text: string, base: string, css: boolean): string[] {
  const out = new Set<string>();
  for (const m of text.match(ASSET_RE) ?? []) out.add(m.replace(/&amp;/g, "&"));
  // Next writes font URLs in its CSS relative to the stylesheet.
  if (css) {
    for (const m of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
      if (m[1].startsWith("data:")) continue;
      const u = new URL(m[1], base);
      if (u.origin === location.origin) out.add(u.pathname + u.search);
    }
  }
  return [...out];
}

/**
 * The build files a saved file names: a page or script by path, a script also
 * as "static/chunks/…" — code loaded only when needed (the launch screen,
 * parts of the reader), which fails offline if missed — and a stylesheet its
 * fonts, relative to itself.
 */
function refsIn(text: string, path: string): string[] {
  const bare = path.split("?")[0];
  if (bare.endsWith(".css")) return assetsIn(text, new URL(path, location.origin).toString(), true);
  const out = new Set(assetsIn(text, location.origin, false));
  if (bare.endsWith(".js")) {
    for (const m of text.matchAll(/"(static\/(?:chunks|media)\/[^"]+)"/g)) out.add(`/_next/${m[1]}`);
  }
  return [...out];
}

const hasRefs = (path: string) => /\.(?:js|css)$/.test(path.split("?")[0]);

async function saveAsset(cache: Cache, path: string, seen: Set<string>): Promise<void> {
  if (seen.has(path)) return;
  seen.add(path);
  // Build files are named by their content, so one already here is current.
  let res = await cache.match(path, { ignoreSearch: true });
  if (!res) {
    const fresh = await fetch(path);
    if (!fresh.ok) return;
    await cache.put(path, fresh.clone());
    res = fresh;
  }
  if (hasRefs(path)) {
    for (const a of refsIn(await res.text(), path)) await saveAsset(cache, a, seen).catch(() => undefined);
  }
}

/** Fetch one page, keep it, and keep what it needs to run. */
async function savePage(cache: Cache, path: string, seen: Set<string>): Promise<boolean> {
  const res = await fetch(path, { headers: { Accept: "text/html" } });
  if (!res.ok || !(res.headers.get("content-type") ?? "").includes("text/html")) return false;
  const html = await res.text();
  await cache.put(path, new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } }));
  const assets = assetsIn(html, location.href, false);
  // a few at a time — a chapter page names a few dozen files
  for (let i = 0; i < assets.length; i += 6) {
    await Promise.all(assets.slice(i, i + 6).map((a) => saveAsset(cache, a, seen).catch(() => undefined)));
  }
  return true;
}

/**
 * Save pages for offline use. With `onlyMissing`, pages already saved are
 * left alone, which is how downloads made before this existed catch up.
 * Best effort: a page that fails is skipped and tried again next time.
 */
export async function saveOfflinePages(
  paths: string[],
  { onlyMissing = false, onEach }: { onlyMissing?: boolean; onEach?: (done: number) => void } = {}
): Promise<void> {
  if (!available()) return;
  const cache = await caches.open(BOOK_PAGES_CACHE);
  const seen = new Set<string>();
  let done = 0;
  for (const path of paths) {
    if (!onlyMissing || !(await cache.match(path))) {
      await savePage(cache, path, seen).catch(() => false);
    }
    onEach?.(++done);
  }
}

/** The book's pages and the app's own way in, for a book just downloaded. */
export function saveBookPages(
  code: string,
  chapters: number[],
  opts?: { onlyMissing?: boolean; onEach?: (done: number) => void }
): Promise<void> {
  return saveOfflinePages([...bookPagePaths(code, chapters), ...SHELL_PATHS], opts);
}

/**
 * Drop a removed book's pages, then any build file no remaining page uses.
 * With no book left, the whole cache goes.
 */
export async function removeBookPages(code: string, remainingBooks: number): Promise<void> {
  if (!available()) return;
  if (remainingBooks === 0) {
    await caches.delete(BOOK_PAGES_CACHE);
    return;
  }
  const cache = await caches.open(BOOK_PAGES_CACHE);
  const prefix = `/books/${encodeURIComponent(code)}`;
  const keys = await cache.keys();
  const pages: Request[] = [];
  const assets: Request[] = [];
  for (const k of keys) {
    const p = new URL(k.url).pathname;
    if (p === prefix || p.startsWith(`${prefix}/`)) await cache.delete(k);
    else if (IS_ASSET.test(p)) assets.push(k);
    else pages.push(k);
  }
  // Everything the remaining pages still reach, following scripts and
  // stylesheets the way saving did.
  const used = new Set<string>();
  const queue: string[] = [];
  for (const k of pages) {
    const res = await cache.match(k);
    if (res) queue.push(...refsIn(await res.text(), k.url));
  }
  while (queue.length) {
    const path = queue.pop()!;
    const bare = path.split("?")[0];
    if (used.has(bare)) continue;
    used.add(bare);
    if (!hasRefs(bare)) continue;
    const res = await cache.match(path, { ignoreSearch: true });
    if (res) queue.push(...refsIn(await res.text(), path));
  }
  for (const k of assets) {
    if (!used.has(new URL(k.url).pathname)) await cache.delete(k);
  }
}

/**
 * What the saved pages weigh: each book's own pages by book code, and the
 * build files and app pages they share, which belong to no one book.
 */
export async function offlinePagesBytes(): Promise<{ byBook: Record<string, number>; shared: number }> {
  const out = { byBook: {} as Record<string, number>, shared: 0 };
  if (!available()) return out;
  try {
    const cache = await caches.open(BOOK_PAGES_CACHE);
    for (const k of await cache.keys()) {
      const res = await cache.match(k);
      if (!res) continue;
      const size = (await res.blob()).size;
      const m = /^\/books\/([^/]+)/.exec(new URL(k.url).pathname);
      if (m) {
        const code = decodeURIComponent(m[1]);
        out.byBook[code] = (out.byBook[code] ?? 0) + size;
      } else out.shared += size;
    }
  } catch {
    // sizes are a courtesy
  }
  return out;
}

/**
 * Save whatever downloaded books are missing pages — books downloaded before
 * pages were saved with them, and pages a failed save skipped. Pages already
 * here are not fetched again, so after the first time this costs one cache
 * lookup per page.
 */
export async function catchUpDownloads(): Promise<void> {
  if (!available() || !navigator.onLine) return;
  for (const d of await listDownloads()) {
    const chapters = await cachedChapterNumbers(d.code);
    if (chapters.length) await saveBookPages(d.code, chapters, { onlyMissing: true });
  }
}
