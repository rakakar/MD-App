import { COVER_HOSTS } from "@/lib/coverImage";

/** where library files live — the one bucket, the same host covers come from */
export const MEDIA_HOSTS = COVER_HOSTS;

/**
 * The address that saves a library file rather than opening it.
 *
 * A bucket file goes through `/api/download` (see the route for why); anything
 * else — an outside link, a host this app does not proxy — is returned as it
 * is, and opens the way it always did.
 */
export function downloadHref(url: string, title?: string): string {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || !MEDIA_HOSTS.includes(u.hostname)) return url;
  } catch {
    return url;
  }
  const q = new URLSearchParams({ url });
  if (title) q.set("name", title);
  return `/api/download?${q.toString()}`;
}

/**
 * The attributes for a download link, from {@link downloadHref}.
 *
 * Proxied, it is same-origin and an attachment, so `download` is honoured and
 * no tab opens. Not proxied, it keeps `target` as before — where the browser
 * ignores `download` the file opens in a tab of its own instead of navigating
 * the app away.
 */
export function downloadProps(url: string, title?: string) {
  const href = downloadHref(url, title);
  return href === url
    ? { href, download: "", target: "_blank", rel: "noopener noreferrer" }
    : { href, download: "" };
}
