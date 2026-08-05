"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { itemIdFromResumeKey, syncPersonal } from "@/lib/personal";
import { findLibrary } from "@/lib/api";
import { contentLang } from "@/lib/script";
import { getPdfPlaces } from "@/lib/storage";

/**
 * **Continue reading** — the documents half of the same promise the recordings
 * already kept.
 *
 * A shivir transcript runs to 257 pages and a संवाद to 390. Until the reader
 * could report a page there was nothing to put on a card here, which is why
 * this shelf was the one place in the app a reader came back to and started
 * from the top.
 *
 * **Drawn from the device first**, exactly as `ContinueReading` and
 * `ContinueAv` are — the places are already in localStorage, so a card is on
 * screen in the first paint rather than after a round trip, and it survives
 * being offline whether or not there is an account behind it. Signing in adds
 * a sync that folds in what was read elsewhere; it does not change where this
 * reads from.
 *
 * A place knows a page and, if this device is the one that opened the file,
 * how many pages there are. It never knows the document's *name* — so that,
 * the folder it lives in and any missing page count come from one library
 * call, the same `library/search/` the shelf itself is built on and usually
 * already cached.
 */

/** A PDF is not resumed on page one — that is where it opens anyway. */
const MIN_PAGE = 2;

/**
 * Under this many pages, a saved place is noise. "Page 3 of 5" on a letter
 * tells a reader nothing they did not already know, and the library is mostly
 * letters and charts; the documents this row exists for run to hundreds.
 *
 * Deliberately a page count and not a file size. Size decides how a document is
 * *opened* (see `PdfView`); length is what decides whether coming back to it is
 * a thing a person does. The library's single best candidate here is 220 pages
 * and half a megabyte.
 */
const MIN_PAGES = 30;

/** How near the end counts as finished; resuming there is worse than not. */
const DONE_TAIL = 2;

interface ResumeRow {
  itemId: number;
  title: string;
  /** the folder it lives in — "भाग 3" names nothing alone */
  subtitle: string;
  page: number;
  pageCount: number;
  nodeId: number;
}

export function ContinuePdf({ limit = 4 }: { limit?: number }) {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<ResumeRow[]>([]);

  const render = useCallback(async () => {
    const places = getPdfPlaces().filter((p) => p.page >= MIN_PAGE);
    if (places.length === 0) {
      setRows([]);
      return;
    }
    const wanted = new Map(
      places
        .map((p) => [itemIdFromResumeKey(p.key), p] as const)
        .filter((pair): pair is [number, (typeof places)[number]] => pair[0] !== null)
    );
    if (wanted.size === 0) {
      setRows([]);
      return;
    }

    // One call names every place at once. Asked for unconditionally rather than
    // only for the unnamed ones: a place carries no title even on the device
    // that made it, so unlike a playhead there is never a case this can skip.
    const found = await findLibrary({
      workspace: "originals",
      state: { q: "", raw: false, selection: { kind: ["pdf"] } },
      limit: 100,
    }).catch(() => null);

    const built: ResumeRow[] = [];
    for (const row of found?.results ?? []) {
      if (row.type !== "file" || row.kind !== "pdf") continue;
      const place = wanted.get(row.id);
      if (!place) continue;

      // The listing's count is the authority — it is the file's own, while a
      // place only knows what some device saw when it last opened it.
      const pageCount = row.page_count ?? place.page_count;
      if (!pageCount || pageCount < MIN_PAGES) continue;
      if (place.page >= pageCount - DONE_TAIL) continue;

      built.push({
        itemId: row.id,
        title: row.title,
        subtitle: row.breadcrumb.at(-1)?.name ?? "",
        page: place.page,
        pageCount,
        nodeId: row.node,
      });
    }

    // Back into the order the places were in — newest first. The listing is
    // ranked by the library's own rules, which have nothing to do with when
    // this reader last opened something.
    const order = [...wanted.keys()];
    built.sort((a, b) => order.indexOf(a.itemId) - order.indexOf(b.itemId));
    setRows(built.slice(0, limit));
  }, [limit]);

  useEffect(() => {
    if (loading) return;
    void render();
    // The pull is what brings another device's reading down into the local
    // places; re-rendering after it is what puts it on screen.
    if (user) void syncPersonal().then(render);
  }, [user, loading, render]);

  if (rows.length === 0) return null;

  return (
    <section aria-label="Continue reading" className="mt-5">
      <h2 className="mb-2.5 text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
        Pick up where you left off
      </h2>
      {/* A bleeding, snapping rail, as on the Audio/Video tab: the card wanted
          is nearly always the first, and stacking four would push the
          collections a reader came for off the bottom of a phone. */}
      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scroll-pl-4 sm:mx-0 sm:px-0 sm:scroll-pl-0">
        {rows.map((row) => (
          <li key={row.itemId} className="w-[15.5rem] shrink-0 snap-start sm:w-[19rem]">
            <ResumeCard row={row} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ResumeCard({ row }: { row: ResumeRow }) {
  const percent = Math.min(100, (row.page / row.pageCount) * 100);

  return (
    // Straight into the document at the page it was left on — not to the
    // folder holding it. The card's whole promise is that the reader is one
    // tap from where they stopped, and a folder page with the document
    // somewhere down it is two taps and a scroll.
    <Link
      href={`/library/${row.nodeId}/read/${row.itemId}?page=${row.page}`}
      className="flex h-full w-full items-start gap-3 rounded-[20px] border border-rule bg-card p-3.5 text-left transition-shadow hover:shadow-md"
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-bold"
        style={{
          background: "color-mix(in srgb, var(--ws-color) 12%, var(--color-card))",
          color: "var(--ws-ink)",
        }}
        aria-hidden
      >
        PDF
      </span>
      <span className="min-w-0 flex-1">
        {row.subtitle && (
          <span
            {...contentLang(row.subtitle)}
            className={`${contentLang(row.subtitle).className} block truncate text-xs font-semibold text-ink-soft`}
          >
            {row.subtitle}
          </span>
        )}
        <span
          {...contentLang(row.title)}
          className={`${contentLang(row.title).className} block truncate text-sm font-semibold leading-snug`}
        >
          {row.title}
        </span>
        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-canvas">
          <span
            role="progressbar"
            aria-valuenow={Math.round(percent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${Math.round(percent)}% read`}
            className="block h-full rounded-full"
            style={{
              width: `${Math.round(percent)}%`,
              background: "linear-gradient(90deg, var(--color-accent), var(--ws-color))",
            }}
          />
        </span>
        <span className="mt-1.5 block text-xs font-medium tabular-nums text-ink-soft">
          Page {row.page} of {row.pageCount}
        </span>
      </span>
    </Link>
  );
}
