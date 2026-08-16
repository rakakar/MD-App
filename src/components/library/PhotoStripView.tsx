"use client";

import { useEffect, useRef, useState } from "react";
import { CountedHeading } from "@/components/library/CollectionShell";
import { Lightbox } from "@/components/library/Lightbox";
import { findLibrary } from "@/lib/api";
import { EMPTY_FIND, type FindState } from "@/lib/find";
import type { LibraryFile, LibrarySearchRow } from "@/lib/types";

/**
 * The shelf's photo strip, and the viewer it opens.
 *
 * The strip used to be links to a filtered shelf: tapping a photograph took you
 * to a *list* with that photograph somewhere in it, which is one navigation and
 * a scroll away from the thing you pointed at. It opens the picture now, and
 * closing puts you back on the shelf exactly where you were — the viewer is an
 * overlay over this page rather than a page of its own, so there is nothing to
 * navigate back from.
 *
 * `shown` is how many tiles the strip draws; `first` is the page the server
 * half already fetched, and the rest arrive as the reader approaches them —
 * every photograph on the shelf is reachable by swiping, without the page
 * paying for 171 thumbnails nobody may look at.
 */
/** how many more to ask for each time */
const PAGE = 60;
/** how close to the end of what is loaded before the next page is asked for */
const PREFETCH_AT = 12;

export function PhotoStripView({
  photos: first,
  shown,
  total,
  scope,
}: {
  photos: LibraryFile[];
  shown: number;
  total: number;
  /** the same shelf the server half searched, for asking it for more */
  scope: { workspace?: string; under?: number };
}) {
  const [openAt, setOpenAt] = useState<number | null>(null);
  /**
   * Which page is in flight, as `key:offset`, so the same one is never asked
   * for twice — and so a new first page invalidates it by not matching, rather
   * than by being cleared during render, which a ref must not be.
   */
  const fetching = useRef<string | null>(null);

  /**
   * The pages fetched since, tagged with the first page they were fetched
   * against.
   *
   * Adjusted during render rather than in an effect, which is React's own
   * answer for "reset state when a prop changes": when the server re-renders
   * this shelf under a different search, the pages we had paged in are about a
   * list that is no longer on screen, and an effect would show them for one
   * frame before clearing them.
   */
  const firstKey = `${first.length}:${first[0]?.id ?? ""}:${first.at(-1)?.id ?? ""}`;
  const [extra, setExtra] = useState<{ key: string; items: LibraryFile[] }>({
    key: firstKey,
    items: [],
  });
  if (extra.key !== firstKey) setExtra({ key: firstKey, items: [] });
  const photos = extra.items.length ? [...first, ...extra.items] : first;

  /**
   * Page more in as the reader nears the end of what has arrived.
   *
   * Twelve ahead rather than at the last one: a swipe takes a moment and a
   * request takes longer, so asking on arrival would show the reader the end
   * of the reel and then move it. Requesting from the index rather than from a
   * scroll position is what makes this work for all four ways of moving —
   * swipe, keys, buttons and a tap on the reel, which can jump twenty at once.
   */
  useEffect(() => {
    if (openAt === null) return;
    if (photos.length >= total) return;
    if (openAt < photos.length - PREFETCH_AT) return;
    const offset = photos.length;
    const ticket = `${firstKey}:${offset}`;
    if (fetching.current === ticket) return;
    fetching.current = ticket;

    const control = new AbortController();
    const onlyImages: FindState = { ...EMPTY_FIND, selection: { kind: ["image"] } };
    findLibrary({ ...scope, state: onlyImages, limit: PAGE, offset, signal: control.signal })
      .then((found) => {
        const more = (found.results ?? []).filter(isImage);
        // Appending by id rather than blindly: two pages of a live shelf can
        // overlap if something was published between them, and a duplicate in
        // the reel is a photograph that appears to be two photographs.
        setExtra((current) => {
          if (current.key !== firstKey) return current;
          const seen = new Set([...first, ...current.items].map((p) => p.id));
          return {
            key: current.key,
            items: [...current.items, ...more.filter((p) => !seen.has(p.id))],
          };
        });
      })
      .catch(() => {
        // A failed page leaves the reader with what they have and lets the
        // next move try again — the alternative is an error over a photograph.
        if (fetching.current === ticket) fetching.current = null;
      });
    return () => control.abort();
  }, [openAt, photos.length, total, scope, first, firstKey]);

  const strip = first.slice(0, shown);
  // The last tile is a photograph *and* the counter, so what is left over is
  // everything but the ones fully on show.
  const rest = total - (strip.length - 1);

  return (
    <>
      {/* The collections' own heading, one section down: PHOTOS on its line and
          the count under it, with the way in opposite. It used to be "Photos ·
          171" at the weight of a card title, which made this section look like
          a different kind of thing from the one directly above it. */}
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <CountedHeading label="Photos">
          <span className="tabular-nums">{total}</span>{" "}
          {total === 1 ? "photograph" : "photographs"}
        </CountedHeading>
        <button
          type="button"
          onClick={() => setOpenAt(0)}
          className="shrink-0 text-xs font-semibold"
          style={{ color: "var(--ws-ink)" }}
        >
          Open gallery →
        </button>
      </div>

      {/*
        **A mosaic, not a row of stamps.**

        Five 67px squares said "there are photographs in here" and showed
        nobody a photograph: at that size a shivir snapshot, a chart and a
        scanned letter are three grey rectangles. Three tiles instead — one
        large, two stacked beside it — which is enough for the big one to be
        worth looking at, and the whole point of this section is that a picture
        is cheaper to understand than any label written about it.

        The counter rides the bottom-right *photograph* rather than taking a
        tile of its own: a solid accent square in a mosaic of pictures reads as
        a picture that failed to load, and the count means more over the thing
        it is counting. Which is also why it says `total - 2`: two photographs
        are fully on show, and this one is the third with the rest behind it.
      */}
      <div className="grid grid-cols-3 grid-rows-2 gap-1.5 sm:gap-2">
        {strip.map((photo, i) => {
          const big = i === 0;
          const last = i === strip.length - 1;
          const hidden = last && rest > 0;
          return (
            <button
              key={photo.id}
              type="button"
              onClick={() => setOpenAt(i)}
              aria-label={hidden ? `${rest} more photographs` : photo.title}
              className={`relative block overflow-hidden rounded-xl border border-rule bg-canvas ${
                big ? "col-span-2 row-span-2" : ""
              }`}
            >
              {/* Plain <img>: these are library media on a host the image
                  optimiser is not configured for, and a broken optimiser here
                  costs the whole strip. Lazy, because this sits below a grid
                  most readers never scroll past. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.thumbnail_url ?? photo.url}
                alt={hidden ? "" : photo.title}
                loading="lazy"
                decoding="async"
                className={`w-full object-cover ${big ? "h-full" : "aspect-square"}`}
              />
              {hidden && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-bold text-white tabular-nums">
                  +{rest}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {openAt !== null && (
        <Lightbox
          items={photos}
          index={Math.min(openAt, photos.length - 1)}
          onIndex={setOpenAt}
          onClose={() => setOpenAt(null)}
          total={total}
        />
      )}
    </>
  );
}

/** a row that is a picture with somewhere to point — never a folder */
function isImage(
  row: LibrarySearchRow
): row is Extract<LibrarySearchRow, { type: "file" }> {
  return row.type === "file" && row.kind === "image";
}
