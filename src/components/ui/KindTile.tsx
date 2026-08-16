import {
  DocumentIcon,
  ExternalLinkIcon,
  FolderIcon,
  ImageIcon,
  VideoIcon,
  WaveformIcon,
} from "@/components/shell/icons";
import type { FileKind } from "@/lib/types";

/**
 * The tinted glyph tile that stands in front of every collection, file,
 * recording and folder in the comps.
 *
 * It is one component and not four because the comps are rigidly consistent
 * about it — the same violet document, the same slate-blue video, the same
 * terracotta waveform, on the Library grid, the Audio/Video grid, the file
 * rows, the track rows and the home stat tiles. Nine places drawing their own
 * version is how the app ended up with four different lavenders.
 *
 * The colours live in globals.css as the `kind` token family, so a tile is
 * correct in sepia and dark without this file knowing either exists.
 */

/** What the tile is standing in for. `folder` is not a FileKind — it is what a
 *  node is when it holds other nodes rather than bytes. */
export type TileKind = FileKind | "folder";

/**
 * Seven kinds, five colour families. `link` and `other` join the document
 * family — a link is a document you do not hold, and inventing a hue the
 * designer has not chosen is how a palette stops being a palette. Photographs
 * keep the pink the shelf has drawn since the designer's earlier note; see
 * globals.css for why it survived a set of comps that never show one.
 */
type Family = "doc" | "video" | "audio" | "image" | "folder";

const FAMILY: Record<TileKind, Family> = {
  pdf: "doc",
  link: "doc",
  other: "doc",
  image: "image",
  video: "video",
  audio: "audio",
  folder: "folder",
};

const GLYPH: Record<TileKind, (p: { className?: string }) => React.ReactElement> = {
  pdf: DocumentIcon,
  other: DocumentIcon,
  link: ExternalLinkIcon,
  image: ImageIcon,
  video: VideoIcon,
  audio: WaveformIcon,
  folder: FolderIcon,
};

/** Tailwind cannot see a class name it has to build at runtime, so the five
 *  pairs are written out. */
const TINT: Record<Family, string> = {
  doc: "bg-kind-doc text-kind-doc-ink",
  video: "bg-kind-video text-kind-video-ink",
  audio: "bg-kind-audio text-kind-audio-ink",
  image: "bg-kind-image text-kind-image-ink",
  folder: "bg-kind-folder text-kind-folder-ink",
};

const SIZE = {
  /** stat tiles and dense rows */
  sm: "h-9 w-9 rounded-control [&>svg]:h-4 [&>svg]:w-4",
  /** the grid cards */
  md: "h-11 w-11 rounded-tile [&>svg]:h-5 [&>svg]:w-5",
  /** file rows, where the tile is the row's anchor */
  lg: "h-14 w-14 rounded-tile [&>svg]:h-6 [&>svg]:w-6",
  /** a collection row's tile, where it is the whole left third of the card and
   *  the thing a reader scans down — see `CollectionListRow` */
  xl: "h-[4.5rem] w-[4.5rem] rounded-tile [&>svg]:h-7 [&>svg]:w-7",
} as const;

export function KindTile({
  kind,
  cover,
  size = "md",
  className = "",
}: {
  kind: TileKind;
  /**
   * The collection's own picture, when the BE has one (`NodeCard.cover_url`).
   *
   * It wins over the glyph, and that is the right way round: a folder that has
   * been given a face is one somebody chose a face for, and no generic mark
   * beats it. The tint underneath still shows through a transparent or
   * still-loading image, so the tile is never a blank square.
   */
  cover?: string | null;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const Glyph = GLYPH[kind];
  if (cover) {
    return (
      <span
        aria-hidden
        className={`flex shrink-0 items-center justify-center overflow-hidden ${TINT[FAMILY[kind]]} ${SIZE[size]} ${className}`}
      >
        {/* covers come from the BE media host; a plain img avoids configuring
            a remote pattern for every host the migration may still be on */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
      </span>
    );
  }
  return (
    // aria-hidden throughout: the tile repeats what the row's own text already
    // says ("PDF · 220 pages", "3 hours · 5 videos"), and a screen reader
    // announcing "image, document" before every title is noise. The colour is
    // never the only way to tell these apart — that is the rule the tint
    // family is built to keep.
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center ${TINT[FAMILY[kind]]} ${SIZE[size]} ${className}`}
    >
      <Glyph />
    </span>
  );
}
