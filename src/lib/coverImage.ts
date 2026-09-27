/**
 * **Which cover addresses go through the image optimiser.**
 *
 * Book covers are PNGs on the R2 bucket's development address, and some are
 * far larger than they are ever drawn: three are 1.6–2 MB at ~1075×1463 for a
 * tile 124px wide on a phone. Through `next/image` they are resized to the
 * width actually drawn, re-encoded as AVIF/WebP and served from Vercel's edge
 * rather than from `r2.dev`, which answers slowly on a first visit.
 *
 * The same list is `images.remotePatterns` in next.config.ts — the optimiser
 * refuses (400) any host it does not list, and a broken cover is worse than a
 * slow one. So a cover on any other host is drawn as a plain `<img>`, as all of
 * them were before. When the media host moves (a custom domain on the bucket),
 * add it here and there together.
 */
export const COVER_HOSTS = ["pub-aff003d28f014aa2ae4c6908c9bea57a.r2.dev"];

export function optimizableCover(src: string): boolean {
  try {
    const u = new URL(src);
    return u.protocol === "https:" && COVER_HOSTS.includes(u.hostname) && !u.search;
  } catch {
    return false;
  }
}
