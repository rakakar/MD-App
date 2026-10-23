import { optimizableCover } from "@/lib/coverImage";
import type { LibraryFile } from "@/lib/types";

/**
 * **Sized copies of a library photograph**, for every place that draws one
 * smaller than it is.
 *
 * The BE makes a `thumbnail_url` for each picture (`backfill_thumbnails`), and
 * when it has, that is what a grid draws. But a picture uploaded since the last
 * backfill has none, and the fallback used to be the camera original: the
 * Nagraj ji photo folders (`/library/288`, Oct 2026) are 172 pictures, 138MB,
 * none with a thumbnail, so `/library/292` drew 106MB of originals into tiles
 * 180px wide.
 *
 * So a picture on the media host goes through Next's image optimiser — the
 * same route the book covers take (`lib/coverImage.ts`), resized to the width
 * actually drawn and re-encoded as AVIF/WebP. A picture anywhere else, which
 * the optimiser would refuse, is drawn as it is, heavy but never broken.
 *
 * The URL is the default loader's own (`/_next/image?url=&w=&q=`) written out,
 * because these go into plain `<img>`s and a preload, not `<Image>`. Every
 * width below must be one of Next's `deviceSizes` or `imageSizes` (the
 * defaults — next.config.ts sets neither) and the quality one of its
 * `qualities`; the optimiser answers 400 to any other.
 */
const QUALITY = 75;

/** what a grid tile, a mosaic tile or the viewer's placeholder is drawn from */
const TILE_WIDTHS = [256, 384, 640, 1080];
/** the viewer's reel: 56px squares */
const REEL_WIDTHS = [128, 256];
/** the viewer at 1×, full screen — the original only once the reader zooms */
const SCREEN_WIDTHS = [1080, 1920, 2048];

/**
 * How wide a tile in `ImageGallery` is drawn: two columns, three from `sm`,
 * inside the shelf's 1088px. The viewer asks for its placeholder with the same
 * `sizes`, so the browser picks the copy the grid already fetched.
 */
export const GRID_SIZES = "(min-width: 1088px) 350px, (min-width: 640px) 33vw, 50vw";

type Picture = Pick<LibraryFile, "url" | "thumbnail_url">;

export interface PictureSource {
  src: string;
  srcSet?: string;
  sizes?: string;
}

function optimised(url: string, width: number): string {
  return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=${QUALITY}`;
}

function sized(url: string, widths: number[], sizes: string): PictureSource {
  if (!optimizableCover(url)) return { src: url };
  return {
    // The middle width, for the rare browser that ignores `srcset`.
    src: optimised(url, widths[Math.floor(widths.length / 2)]),
    srcSet: widths.map((w) => `${optimised(url, w)} ${w}w`).join(", "),
    sizes,
  };
}

/**
 * A grid or mosaic tile: the BE's thumbnail when there is one, else a resized
 * copy. `sizes` is how wide the tile is drawn, as for `<img sizes>`.
 */
export function tileSource(picture: Picture, sizes: string): PictureSource {
  if (picture.thumbnail_url) return { src: picture.thumbnail_url };
  return sized(picture.url, TILE_WIDTHS, sizes);
}

/** a square in the viewer's reel */
export function reelSource(picture: Picture): PictureSource {
  if (picture.thumbnail_url) return { src: picture.thumbnail_url };
  return sized(picture.url, REEL_WIDTHS, "56px");
}

/**
 * The viewer's picture at 1×: a screen-sized copy, a few hundred kilobytes
 * where the original can be 9MB. Equal to `{ src: url }` for a picture the
 * optimiser cannot take, which tells the viewer there is no lighter step.
 */
export function screenSource(picture: Picture): PictureSource {
  return sized(picture.url, SCREEN_WIDTHS, "100vw");
}
