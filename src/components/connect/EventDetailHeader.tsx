"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BackIcon } from "@/components/shell/icons";
import { contentLang } from "@/lib/script";
import { EventShare } from "./EventShare";

/**
 * **The detail screen's own header row: back · where you are · share.**
 *
 * Pinned under the app bar, and the middle of it changes as you scroll. At the
 * top it says "Events", naming the list the back button returns to — which is
 * the only useful thing it could say while the event's own title is right
 * there on screen under the poster. Once that title has scrolled away the row
 * takes it up, so a reader four screens into an invitation note still knows
 * which shivir they are reading. The comps draw both states.
 *
 * **Watched with an IntersectionObserver rather than a scroll handler.** The
 * question is "is the title still on screen", which is the one question that
 * API answers directly and off the main thread; a scroll listener would ask it
 * sixty times a second by measuring, and this row would be the reason the page
 * stuttered.
 *
 * The bookmark the comps draw beside share is still not here. `me/bookmarks/`
 * covers book paragraphs and nothing else today, so an event cannot be saved,
 * and a control that does nothing is worse on this screen than a gap — it is
 * the one thing a reader would press to keep a date. It comes back when the
 * endpoint does.
 */
export function EventDetailHeader({
  title,
  path,
  /** the id of the `h1` this row takes over from */
  watch,
}: {
  title: string;
  path: string;
  watch: string;
}) {
  const [passed, setPassed] = useState(false);
  const seen = useRef(false);

  useEffect(() => {
    const el = document.getElementById(watch);
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        seen.current = true;
        setPassed(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      // The row's own height plus the app bar's, so the swap happens as the
      // title slides under this row rather than a moment after it has gone.
      //
      // Pixels, not rem: `rootMargin` is parsed by the browser as a CSS margin
      // shorthand that accepts only px and %, and a rem there throws
      // `SyntaxError` at construction — the observer never attaches and the
      // whole screen goes to the error boundary.
      { rootMargin: "-112px 0px 0px 0px", threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [watch]);

  const t = contentLang(title);

  return (
    <div className="sticky top-(--app-header-h) z-30 -mx-4 mb-4 flex items-center gap-2.5 bg-surface px-4 py-2 sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-8 lg:px-8">
      <Link
        href="/connect"
        aria-label="Back to events"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-rule bg-card text-ink transition-colors active:bg-ink/[.04]"
      >
        <BackIcon className="h-4.5 w-4.5" />
      </Link>
      {/* One line, always. A Devanagari title at `.hi`'s 1.85 leading would
          otherwise make this row taller than the back button beside it and
          push the whole page down as it swapped. */}
      <p
        {...(passed ? t : {})}
        className={`min-w-0 flex-1 truncate text-title font-semibold ${
          passed ? `${t.className} hi-tight` : ""
        }`}
      >
        {passed ? title : "Events"}
      </p>
      <EventShare title={title} path={path} variant="icon" />
    </div>
  );
}
