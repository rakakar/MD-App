import type { MetadataRoute } from "next";
import {
  getAudioSeries,
  getBook,
  getBooks,
  getEvents,
  getParibhashaIndex,
  getVideos,
} from "@/lib/api";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://welfareinfo.net";

// All books, chapters, audio series, videos, events, workspace homes (PRD §4).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = [
    "",
    "/books",
    "/translations",
    "/resources",
    "/audio",
    "/videos",
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

  const [series, videos, events] = await Promise.all([
    getAudioSeries().catch(() => []),
    getVideos().catch(() => []),
    getEvents().catch(() => []),
  ]);
  // Every glossary word gets a URL. It costs one request — the underlining
  // index already carries all ~2,800 ids — and these are the pages someone
  // searching a मध्यस्थ दर्शन term in Hindi is actually looking for.
  const glossary = await getParibhashaIndex().catch(() => null);
  for (const w of glossary?.words ?? []) {
    urls.push({ url: `${SITE_URL}/paribhasha/${w.id}`, changeFrequency: "monthly" });
  }

  for (const s of series) urls.push({ url: `${SITE_URL}/audio/${s.id}` });
  if (videos.length > 0) urls.push({ url: `${SITE_URL}/videos` });
  for (const e of events) urls.push({ url: `${SITE_URL}/connect/events/${e.id}` });

  return urls;
}
