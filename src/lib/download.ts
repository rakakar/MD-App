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

/**
 * **In the installed app a download link opens the file bare** (Raka, 21 Nov
 * 2026): iOS ignores `download`, loads the PDF into the app's own window, and
 * that window has no toolbar — no Share, no Save to Files, no way back. So
 * there, a download link opens the file itself in the system's browser view
 * instead, whose Share sheet is how iOS saves a file. A browser tab keeps the
 * ordinary download. One listener covers every `downloadProps` link, including
 * the ones Download all clicks from code.
 */
function installedApp(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    document.documentElement.dataset.shell === "native"
  );
}

if (typeof window !== "undefined") {
  document.addEventListener("click", (e) => {
    const a = (e.target as Element | null)?.closest?.("a[download]");
    if (!(a instanceof HTMLAnchorElement) || !installedApp()) return;
    const href = new URL(a.href, window.location.href);
    // The bucket file itself, which opens inline, rather than the attachment.
    const file = href.pathname === "/api/download" ? href.searchParams.get("url") : href.toString();
    if (!file) return;
    e.preventDefault();
    window.open(file, "_blank", "noopener");
  });
}
