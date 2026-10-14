import { ApiError, getEvent } from "@/lib/api";

/**
 * **A shivir's poster, served from this origin.**
 *
 * The bucket the posters live in sends no CORS headers, so a page can show one
 * in an `<img>` but cannot read its bytes — and reading them is what both
 * Share (the poster goes out as a picture, the note as its caption) and the
 * poster's Download button need. Fetched here, it is same-origin and both work.
 *
 * Keyed by slug, not by image URL: this serves the one poster the event
 * itself names, and is not a proxy anyone can point at anything.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  let poster: string | null;
  try {
    poster = (await getEvent(slug)).poster;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return new Response(null, { status: 404 });
    throw e;
  }
  if (!poster) return new Response(null, { status: 404 });

  const res = await fetch(poster, { next: { revalidate: 300 } });
  if (!res.ok || !res.body) return new Response(null, { status: 502 });

  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "image/jpeg",
      // An organiser can swap the poster, so not immutable — the same five
      // minutes the event itself is revalidated on.
      "Cache-Control": "public, max-age=300",
    },
  });
}
