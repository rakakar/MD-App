"use client";

import { useState } from "react";
import { Lightbox } from "@/components/library/Lightbox";
import { ProvenanceBadge } from "@/components/library/ProvenanceBadge";
import type { LibraryFile } from "@/lib/types";

/**
 * A collection's images — thumbnails, then the full-screen viewer.
 *
 * The viewer itself is `Lightbox`, shared with the shelf's photo strip. It used
 * to live in here as a private component, which was fine while this was the
 * only way into it.
 *
 * The grid draws `thumbnail_url` and the lightbox draws `url`, which is the
 * whole point of there being two. The library's photographs are camera
 * originals: `/library/71` is 127 of them at 106MB, against 3.3MB of
 * thumbnails — thirty-two times lighter to open as a grid of postage stamps.
 * Every `?? item.url` below is the fallback for a picture that has no
 * thumbnail yet, which draws heavy rather than blank.
 */
export function ImageGallery({ items }: { items: LibraryFile[] }) {
  const [openAt, setOpenAt] = useState<number | null>(null);

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item, i) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => setOpenAt(i)}
              className="group block w-full text-left"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.thumbnail_url ?? item.url}
                alt={item.title}
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full rounded-xl border border-rule bg-card object-contain transition-shadow group-hover:shadow-md"
              />
              <span lang="hi" className="hi mt-1.5 block truncate text-xs font-medium">
                {item.title}
              </span>
              <ProvenanceBadge provenance={item.provenance} />
            </button>
          </li>
        ))}
      </ul>

      {openAt !== null && (
        <Lightbox
          items={items}
          index={openAt}
          onIndex={setOpenAt}
          onClose={() => setOpenAt(null)}
        />
      )}
    </>
  );
}
