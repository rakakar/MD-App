"use client";

import { useState } from "react";
import { Lightbox } from "@/components/library/Lightbox";
import { ImageIcon } from "@/components/shell/icons";
import type { LibraryFile } from "@/lib/types";

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
 * `shown` is how many tiles the strip draws; `photos` is everything the viewer
 * can page through, which is a larger fetch made once by the server half.
 * "+N" counts the whole shelf, so it can be larger than the viewer's set — see
 * `PhotoStrip`, which decides both numbers.
 */
export function PhotoStripView({
  photos,
  shown,
  total,
}: {
  photos: LibraryFile[];
  shown: number;
  total: number;
}) {
  const [openAt, setOpenAt] = useState<number | null>(null);
  const strip = photos.slice(0, shown);
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
        />
      )}
    </>
  );
}
