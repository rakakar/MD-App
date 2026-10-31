"use client";

import Link from "next/link";
import { useOnline } from "@/lib/offline";
import { CloudOffIcon } from "./icons";
import { useRoutePath } from "./useRoutePath";

/**
 * The screens that cannot work without a connection, and what to call them.
 * First match wins. Downloaded books, saved audio, notes, bookmarks and
 * Settings are not here: they work offline.
 */
const NEEDS_INTERNET: { match: (p: string) => boolean; what: string; verb: "needs" | "need" }[] = [
  { match: (p) => p === "/assistant" || p.startsWith("/assistant/") || p.startsWith("/a/"), what: "The Assistant", verb: "needs" },
  { match: (p) => p.endsWith("/find"), what: "Search", verb: "needs" },
  { match: (p) => p.startsWith("/shorts"), what: "Videos", verb: "need" },
  { match: (p) => p === "/av" || p.startsWith("/av/"), what: "Recordings and videos", verb: "need" },
  { match: (p) => p.startsWith("/connect"), what: "Events and centres", verb: "need" },
  {
    match: (p) => p === "/originals" || p === "/resources" || p.startsWith("/library/"),
    what: "Library files",
    verb: "need",
  },
];

/**
 * One bar under the app bar while there is no connection, on every screen
 * with app chrome. On a screen that needs the internet it says which feature
 * and why nothing loads, rather than leaving a spinner or a generic error;
 * everywhere else it says what still works. Either way it links to Downloads,
 * the next thing an offline reader wants.
 *
 * A bar rather than a label in the app bar: the bar's one row is already full
 * at larger text sizes, and a label there squeezed the workspace name to an
 * ellipsis. Nothing at all while online.
 *
 * It stays in view by living inside something that already does, not by
 * being sticky itself. On a phone that is the app bar (`placement="header"`):
 * the bar measures its own height into `--app-header-h`, and every sticky row
 * in the app — filter chips, tabs — pins at that, so they all move down with
 * it. A notice sticky on its own would have had those rows slide under it. On
 * a desktop there is no app bar, so it sits in the fixed sidebar instead
 * (`"sidebar"`). `"page"` is for a screen that draws its own app bar — the
 * Assistant — where it heads the page and scrolls with it.
 */
export function OfflineNotice({ placement }: { placement: "header" | "sidebar" | "page" }) {
  const online = useOnline();
  const path = useRoutePath();
  if (online) return null;
  const hit = NEEDS_INTERNET.find((r) => r.match(path));
  return (
    <p
      role="status"
      className={`flex items-start gap-2.5 bg-inset text-sm text-ink ${
        placement === "header"
          ? "border-t border-rule px-4 py-2.5"
          : placement === "sidebar"
            ? "mx-3 mt-3 rounded-2xl border border-rule px-3 py-2.5"
            : "border-b border-rule px-4 py-2.5 lg:hidden"
      }`}
    >
      <CloudOffIcon className="mt-0.5 h-4.5 w-4.5 shrink-0 text-ink-soft" />
      <span>
        {hit
          ? `You're offline. ${hit.what} ${hit.verb} internet.`
          : "You're offline. Downloaded books, saved audio and your notes still work."}{" "}
        <Link
          href="/downloads"
          className="inline-flex font-semibold underline underline-offset-2"
        >
          Your downloads
        </Link>
      </span>
    </p>
  );
}
