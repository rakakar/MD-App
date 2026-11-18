import { APP_NAME } from "./brand";

/**
 * Share the app itself — the account menu's "Share MD Study" and the About
 * page's button (designer, 18 Nov 2026).
 *
 * The address is this site's own origin rather than a written-in domain, so
 * the link a reader passes on is the one they are using and never one that is
 * not live yet. The share sheet where there is one (every phone), else the
 * clipboard, and the caller says "Link copied". Where the browser refuses
 * both, the caller shows the address instead, so the tap never does nothing.
 */
export async function shareApp(): Promise<"shared" | "copied" | "cancelled" | "failed"> {
  const url = `${window.location.origin}/`;
  const title = APP_NAME;
  const text = `${APP_NAME} — read, listen to and study the works of Shri A. Nagraj. Free to use.`;
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return "shared";
    } catch (e) {
      // A cancelled sheet is not an error and says nothing; any other refusal
      // falls through to the clipboard.
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}

/** The address `shareApp` passes on, for saying it aloud when copying failed. */
export function appAddress(): string {
  return window.location.host;
}
