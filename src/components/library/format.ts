import type { LibraryFile, FileKind, NodeCard, NodeRollup } from "@/lib/types";

/** प्रकार, as a reader reads it. The sieve puts this axis last on purpose. */
export const KIND_HI: Record<FileKind, string> = {
  pdf: "PDF",
  audio: "ऑडियो",
  video: "वीडियो",
  image: "चित्र",
  link: "लिंक",
  other: "फ़ाइल",
};

/**
 * The order files are shown in, and the order the प्रकार sieve offers.
 *
 * Audio first: a shivir bundle is mostly recordings and the handout is the
 * appendix, not the other way round. `other` trails because nothing is ever
 * sought by it.
 */
export const KIND_ORDER: FileKind[] = ["audio", "video", "pdf", "image", "link", "other"];

function inKindOrder(kinds: FileKind[]): FileKind[] {
  return KIND_ORDER.filter((k) => kinds.includes(k));
}

/**
 * What a folder card says about its contents, from the counts the card
 * already carries (§13.1) — never a second request.
 *
 * `kinds` is what makes the number legible: "14 ऑडियो · 1 PDF" rather than
 * "15 फ़ाइलें". With one kind the total *is* that kind's count and the line
 * reads exactly so; with several, the kinds are named and the total stated
 * once, because the card knows which kinds occur but not how many of each.
 * Counts are shallow by contract, so a folder of folders reports folders.
 */
export function cardSummary(card: Pick<NodeCard, "child_count" | "item_count" | "kinds">): string {
  const parts: string[] = [];
  if (card.child_count > 0) parts.push(`${card.child_count} फ़ोल्डर`);
  if (card.item_count > 0) {
    const kinds = inKindOrder(card.kinds);
    parts.push(
      kinds.length === 1
        ? `${card.item_count} ${KIND_HI[kinds[0]]}`
        : kinds.length > 1
          ? `${card.item_count} फ़ाइलें · ${kinds.map((k) => KIND_HI[k]).join(" · ")}`
          : `${card.item_count} फ़ाइलें`
    );
  }
  return parts.join(" · ");
}

/**
 * What a **tile** says about its collection — the deep line, from `rollup`.
 *
 * Deliberately different from `cardSummary` above, which reports the shallow
 * counts a card carries and on a shelf root can only ever say "N फ़ोल्डर".
 *
 * **Hours lead where there are hours.** A count is a number a reader cannot
 * weigh; twenty-seven hours of recordings is a promise, and it is the single
 * most useful thing this shelf knows about its largest collection. Rounded to
 * whole hours above one, because the tile is a decision aid rather than a
 * manifest — and below one it falls back to minutes rather than printing a
 * "0 घंटे" that reads as empty.
 *
 * The file count follows, named by kind while the kind is unambiguous. Folders
 * are last and only when they add something: "4 फ़ोल्डर" beside "33 वीडियो"
 * tells a reader the shape of what they are opening; alone it told them
 * nothing, which is the whole reason this line exists.
 */
export function tileSummary(rollup: NodeRollup | undefined): string {
  if (!rollup) return "";
  const parts: string[] = [];

  if (rollup.duration > 0) {
    const hours = rollup.duration / 3600;
    parts.push(
      hours >= 1
        ? `${Math.round(hours)} घंटे`
        : `${Math.max(1, Math.round(rollup.duration / 60))} मिनट`
    );
  }

  if (rollup.items > 0) {
    const kinds = inKindOrder(rollup.kinds);
    parts.push(
      kinds.length === 1
        ? `${rollup.items} ${KIND_HI[kinds[0]]}`
        : `${rollup.items} फ़ाइलें`
    );
  }

  if (rollup.folders > 0) parts.push(`${rollup.folders} फ़ोल्डर`);
  return parts.join(" · ");
}

/**
 * The shelf's own total, for the header above the tiles.
 *
 * Summed across the tiles rather than taken from `count`, which counts folders
 * and files together — a reader reading "247 सामग्री" means files, and adding
 * the folders they are filed in would inflate it by a fifth for no one.
 */
export function shelfTotals(rollups: (NodeRollup | undefined)[]): {
  items: number;
  duration: number;
} {
  return rollups.reduce(
    (total, r) => ({
      items: total.items + (r?.items ?? 0),
      duration: total.duration + (r?.duration ?? 0),
    }),
    { items: 0, duration: 0 }
  );
}

/** the same line where the files themselves are in hand, so each kind is counted */
export function filesSummary(files: LibraryFile[]): string {
  const counts = new Map<FileKind, number>();
  for (const f of files) counts.set(f.kind, (counts.get(f.kind) ?? 0) + 1);
  return inKindOrder([...counts.keys()])
    .map((kind) => `${counts.get(kind)} ${KIND_HI[kind]}`)
    .join(" · ");
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

/** the facts under a file's title — kind, then whatever the BE actually knows */
export function fileFacts(file: LibraryFile): string {
  return [
    KIND_HI[file.kind],
    file.page_count ? `${file.page_count} ${file.page_count === 1 ? "page" : "pages"}` : null,
    formatDuration(file.duration_seconds) || null,
    formatBytes(file.file_size) || null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** the folder's own facts line — year · place · people · language */
export function nodeFacts(card: NodeCard): string {
  return [card.year, card.place, card.people, card.language_label].filter(Boolean).join(" · ");
}
