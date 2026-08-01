import type { MetadataRoute } from "next";
import {
  getBook,
  getBooks,
  getCollections,
  getEvents,
  getParibhashaIndex,
  getResourceDoors,
} from "@/lib/api";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://welfareinfo.net";

// All books, chapters, library folders, events, workspace homes (PRD §4).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = [
    "",
    "/books",
    "/translations",
    "/resources",
    "/vani",
    "/paribhasha",
    "/connect",
    "/connect/centers",
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
  // searching a मध्यस्थ दर्शन term in Hindi is actually looking for.
  const glossary = await getParibhashaIndex().catch(() => null);
  for (const w of glossary?.words ?? []) {
    urls.push({ url: `${SITE_URL}/paribhasha/${w.id}`, changeFrequency: "monthly" });
  }

  // The resources shelf as a reader browses it — doors and collection albums.
  // The folder tree is deliberately absent: it is a second address for the
  // same files, and it is marked noindex for that reason.
  const [doors, collections] = await Promise.all([
    getResourceDoors().catch(() => []),
    getCollections().then((r) => r.results).catch(() => []),
  ]);
  for (const d of doors) {
    urls.push({
      url: `${SITE_URL}/resources/doors/${encodeURIComponent(d.code)}`,
      changeFrequency: "weekly",
    });
  }
  for (const c of collections) {
    urls.push({ url: `${SITE_URL}/resources/collections/${c.id}`, changeFrequency: "monthly" });
  }

  for (const e of events) urls.push({ url: `${SITE_URL}/connect/events/${e.id}` });

  return urls;
}
