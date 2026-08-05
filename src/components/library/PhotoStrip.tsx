import Link from "next/link";
import { ImageIcon } from "@/components/shell/icons";
import { findLibrary } from "@/lib/api";
import { EMPTY_FIND, findHref, type FindState } from "@/lib/find";
import type { LibraryFacets, LibrarySearchRow } from "@/lib/types";

/** how many photographs the strip shows before the counter tile */
const SHOWN = 4;

/**
 * A shelf's photographs, as photographs (designer, "Desktop UI").
 *
 * The one place on this shelf where the grid above it cannot do the job. A tile
 * reading "Images · 320 photos" is an accurate sentence about a folder and tells
 * a reader nothing about whether it holds shivir snapshots, charts or scanned
 * letters — and photographs are the one kind of material where a thumbnail is
 * cheaper to understand than any label written about it.
 *
 * **Costs one request and no backend work.** `kind=image` is an ordinary
 * selection on the find endpoint, and a selection alone counts as *asked*, so
 * four rows come back with the facet count that fills the "+316" tile. The
 * thumbnails are `thumbnail_url`, already served on every item and already what
 * `ImageGallery` draws — the shelf's photographs are camera originals, and a
 * strip of four of those would be some 3MB to render 4 postage stamps.
 *
 * Deliberately **not** filtered by whatever else the reader has chosen. This is
 * a door into the shelf's pictures, drawn under a browse; once a find is on,
 * the results are the answer and this strip is not shown at all.
 */
export async function PhotoStrip({
  scope,
  facets,
  basePath,
  state,
}: {
  scope: { workspace?: string; under?: number };
  facets: LibraryFacets | undefined;
  basePath: string;
  state: FindState;
}) {
  const total = (facets?.kind ?? []).find((f) => f.value === "image")?.count ?? 0;
  // Under a handful, the images tile in the grid above has already said
  // everything a strip could — and four pictures laid out as a feature is a
  // promise of a gallery that is not there.
  if (total < SHOWN * 2) return null;

  const onlyImages: FindState = { ...EMPTY_FIND, selection: { kind: ["image"] } };
  const found = await findLibrary({
    ...scope,
    state: onlyImages,
    limit: SHOWN,
  }).catch(() => null);
  const photos = (found?.results ?? []).filter(isImage);
  if (photos.length < SHOWN) return null;

  const gallery = findHref(basePath, { ...state, selection: { kind: ["image"] } });
  const rest = total - photos.length;

  return (
    <section className="mt-8">
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold tracking-[-0.01em]">
          Photos
          <span className="ms-1.5 text-xs font-medium text-ink-soft">
            · <span className="tabular-nums">{total}</span>
          </span>
        </h2>
        <Link
          href={gallery}
          className="text-xs font-semibold"
          style={{ color: "var(--ws-ink)" }}
        >
          Open gallery →
        </Link>
      </div>
      {/* Five across on every screen, counter included — the strip is one row
          or it is a gallery, and at four columns the counter wrapped onto a
          line of its own under four photographs, reading as a sixth picture
          that failed to load. Five 67px squares on the narrowest phone is
          small, which is the right size for a thing whose whole job is to say
          "there are photographs in here, come and look". */}
      <ul className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {photos.map((photo) => (
          <li key={photo.id}>
            <Link
              href={gallery}
              className="block overflow-hidden rounded-xl border border-rule bg-canvas"
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
            </Link>
          </li>
        ))}
        {rest > 0 && (
          <li>
            <Link
              href={gallery}
              className="flex aspect-square items-center justify-center gap-1 rounded-xl border border-rule text-xs font-semibold text-white"
              style={{ background: "var(--ws-color)" }}
              aria-label={`${rest} more photographs`}
            >
              <ImageIcon className="hidden h-3.5 w-3.5 sm:block" />
              <span className="tabular-nums">+{rest}</span>
            </Link>
          </li>
        )}
      </ul>
    </section>
  );
}

/** a row that is a picture with somewhere to point — never a folder */
function isImage(
  row: LibrarySearchRow
): row is Extract<LibrarySearchRow, { type: "file" }> {
  return row.type === "file" && row.kind === "image";
}
