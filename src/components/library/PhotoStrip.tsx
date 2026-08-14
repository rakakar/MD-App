import { findLibrary } from "@/lib/api";
import { EMPTY_FIND, type FindState } from "@/lib/find";
import type { LibraryFacets, LibrarySearchRow } from "@/lib/types";
import { PhotoStripView } from "./PhotoStripView";

/** how many photographs the strip shows before the counter tile */
const SHOWN = 4;
/**
 * The first page the viewer opens on. The rest are asked for as the reader
 * swipes toward them — see `PhotoStripView` — so this is a head start rather
 * than a limit, and every photograph on the shelf is reachable.
 *
 * Sixty thumbnails is a few hundred kilobytes and loads lazily in the reel;
 * sixty *originals* would be sixty megabytes, which is the whole reason
 * `thumbnail_url` exists.
 */
const VIEWABLE = 60;

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
}: {
  scope: { workspace?: string; under?: number };
  facets: LibraryFacets | undefined;
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
    limit: VIEWABLE,
  }).catch(() => null);
  const photos = (found?.results ?? []).filter(isImage);
  if (photos.length < SHOWN) return null;

  return (
    <section className="mt-8">
      <PhotoStripView photos={photos} shown={SHOWN} total={total} scope={scope} />
    </section>
  );
}

/** a row that is a picture with somewhere to point — never a folder */
function isImage(
  row: LibrarySearchRow
): row is Extract<LibrarySearchRow, { type: "file" }> {
  return row.type === "file" && row.kind === "image";
}
