import type { MetadataRoute } from "next";
import {
  getBook,
  getBooks,
  getEvents,
  getNodes,
  getParibhashaIndex,
  getWorkspaces,
} from "@/lib/api";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://welfareinfo.net";

/**
 * How many folders the crawl will walk before it stops.
 *
 * The library is a tree of unknown width and nothing in it is paginated
 * (contract §13.2), so a full walk is one request per folder and its cost is
 * whatever the pCloud import turns out to be. A cap keeps a sitemap request
 * bounded; the shelf pages themselves stay reachable either way.
 */
const MAX_FOLDERS = 400;

/** every visible folder under a workspace root, breadth first and bounded */
async function walk(rootId: number): Promise<number[]> {
  const found: number[] = [];
  let level = [rootId];
  // Six is the tree's own ceiling, so this terminates on depth as well as
  // on the cap.
  for (let depth = 0; depth < 6 && level.length > 0; depth += 1) {
    const next: number[] = [];
    for (const id of level) {
      if (found.length >= MAX_FOLDERS) return found;
      const children = await getNodes({ parent: id }).catch(() => []);
      for (const c of children) {
        found.push(c.id);
        next.push(c.id);
      }
    }
    level = next;
  }
  return found;
}

// Books, chapters, glossary words, library folders, events, shelf homes (PRD §4).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = [
    "",
    "/books",
    "/av",
    "/translations",
    "/resources",
    "/paribhasha",
    "/connect",
    "/connect/centers",
    "/connect/library",
  ].map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: "daily" as const }));

  const books = await getBooks().catch(() => []);
  for (const b of books) {
    const base = `${SITE_URL}/books/${encodeURIComponent(b.code)}`;
    urls.push({ url: base, changeFrequency: "weekly" });
    const detail = await getBook(b.code).catch(() => null);
    for (const ch of detail?.chapters ?? []) {
      urls.push({ url: `${base}/${ch.number}`, changeFrequency: "monthly" });
    }
  }

  const events = await getEvents().catch(() => []);
  // Every glossary word gets a URL. It costs one request — the underlining
  // index already carries all ~2,800 ids — and these are the pages someone
  // searching a Madhyasth Darshan term in Hindi is actually looking for.
  const glossary = await getParibhashaIndex().catch(() => null);
  for (const w of glossary?.words ?? []) {
    urls.push({ url: `${SITE_URL}/paribhasha/${w.id}`, changeFrequency: "monthly" });
  }

  // The library, from each workspace's root down. Roots themselves are left
  // out: a root is its shelf, and `/resources` and `/connect/library` are
  // already listed above.
  const workspaces = await getWorkspaces().catch(() => []);
  const seen = new Set<number>();
  for (const w of workspaces) {
    if (w.root_node_id === null) continue;
    for (const id of await walk(w.root_node_id)) seen.add(id);
  }
  for (const id of seen) {
    urls.push({ url: `${SITE_URL}/library/${id}`, changeFrequency: "weekly" });
  }

  for (const e of events) urls.push({ url: `${SITE_URL}/connect/events/${e.id}` });

  return urls;
}
