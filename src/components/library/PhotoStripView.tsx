"use client";

import { useEffect, useRef, useState } from "react";
import { Lightbox } from "@/components/library/Lightbox";
import { ImageIcon } from "@/components/shell/icons";
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
  const rest = total - strip.length;

  return (
    <>
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold tracking-[-0.01em]">
          Photos
          <span className="ms-1.5 text-xs font-medium text-ink-soft">
            · <span className="tabular-nums">{total}</span>
          </span>
        </h2>
        <button
          type="button"
          onClick={() => setOpenAt(0)}
          className="text-xs font-semibold"
          style={{ color: "var(--ws-ink)" }}
        >
          Open gallery →
        </button>
      </div>

      {/* Five across on every screen, counter included — the strip is one row
          or it is a gallery, and at four columns the counter wrapped onto a
          line of its own under four photographs, reading as a sixth picture
          that failed to load. Five 67px squares on the narrowest phone is
          small, which is the right size for a thing whose whole job is to say
          "there are photographs in here, come and look". */}
      <ul className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {strip.map((photo, i) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => setOpenAt(i)}
              aria-label={photo.title}
              className="block w-full overflow-hidden rounded-xl border border-rule bg-canvas"
            >
              {/* Plain <img>: these are library media on a host the image
                  optimiser is not configured for, and a broken optimiser here
                  costs the whole strip. Lazy, because the strip is below a grid
                  most readers never scroll past. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.thumbnail_url ?? photo.url}
                alt={photo.title}
                loading="lazy"
                decoding="async"
                className="aspect-square w-full object-cover"
              />
            </button>
          </li>
        ))}
        {rest > 0 && (
          <li>
            <button
              type="button"
              onClick={() => setOpenAt(strip.length)}
              className="flex aspect-square w-full items-center justify-center gap-1 rounded-xl border border-rule text-xs font-semibold text-white"
              style={{ background: "var(--ws-color)" }}
              aria-label={`${rest} more photographs`}
            >
              <ImageIcon className="hidden h-3.5 w-3.5 sm:block" />
              <span className="tabular-nums">+{rest}</span>
            </button>
          </li>
        )}
      </ul>

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
