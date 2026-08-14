import type { LibraryFile, FileKind, NodeCard, NodeRollup } from "@/lib/types";

/** Type, as a reader reads it. The sieve puts this axis last on purpose. */
export const KIND_LABEL: Record<FileKind, string> = {
  pdf: "PDF",
  audio: "Audio",
  video: "Video",
  image: "Image",
  link: "Link",
  other: "File",
};

/** the same kinds in the plural, for the count lines below */
const KIND_PLURAL: Record<FileKind, string> = {
  pdf: "PDFs",
  audio: "Audio",
  video: "Videos",
  image: "Images",
  link: "Links",
  other: "Files",
};

/** "1 video" / "12 videos" — Audio is a mass noun and never takes the -s */
function countOfKind(n: number, kind: FileKind): string {
  return `${n} ${n === 1 ? KIND_LABEL[kind] : KIND_PLURAL[kind]}`;
}

/**
 * The order files are shown in, and the order the Type sieve offers.
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
 * `kinds` is what makes the number legible: "14 Audio · 1 PDF" rather than
 * "15 files". With one kind the total *is* that kind's count and the line
 * reads exactly so; with several, the kinds are named and the total stated
 * once, because the card knows which kinds occur but not how many of each.
 * Counts are shallow by contract, so a folder of folders reports folders.
 */
export function cardSummary(card: Pick<NodeCard, "child_count" | "item_count" | "kinds">): string {
  const parts: string[] = [];
  if (card.child_count > 0) {
    parts.push(`${card.child_count} ${card.child_count === 1 ? "folder" : "folders"}`);
  }
  if (card.item_count > 0) {
    const kinds = inKindOrder(card.kinds);
    const files = `${card.item_count} ${card.item_count === 1 ? "file" : "files"}`;
    parts.push(
      kinds.length === 1
        ? countOfKind(card.item_count, kinds[0])
        : kinds.length > 1
          ? `${files} · ${kinds.map((k) => KIND_LABEL[k]).join(" · ")}`
          : files
    );
  }
  return parts.join(" · ");
}

/**
 * What a **tile** says about its collection — the deep line, from `rollup`.
 *
 * Deliberately different from `cardSummary` above, which reports the shallow
 * counts a card carries and on a shelf root can only ever say "N folders".
 *
 * **Hours lead where there are hours.** A count is a number a reader cannot
 * weigh; twenty-seven hours of recordings is a promise, and it is the single
 * most useful thing this shelf knows about its largest collection. Rounded to
 * whole hours above one, because the tile is a decision aid rather than a
 * manifest — and below one it falls back to minutes rather than printing a
 * "0 hours" that reads as empty.
 *
 * The file count follows, named by kind while the kind is unambiguous. Folders
 * are last and only when they add something: "4 folders" beside "33 Videos"
 * tells a reader the shape of what they are opening; alone it told them
 * nothing, which is the whole reason this line exists.
 */
export function tileSummary(rollup: NodeRollup | undefined): string {
  if (!rollup) return "";
  const parts: string[] = [];

  if (rollup.duration > 0) {
    const hours = Math.round(rollup.duration / 3600);
    const minutes = Math.max(1, Math.round(rollup.duration / 60));
    parts.push(
      rollup.duration / 3600 >= 1
        ? `${hours} ${hours === 1 ? "hour" : "hours"}`
        : `${minutes} ${minutes === 1 ? "minute" : "minutes"}`
    );
  }

  if (rollup.items > 0) {
    const kinds = inKindOrder(rollup.kinds);
    parts.push(
      kinds.length === 1
        ? countOfKind(rollup.items, kinds[0])
        : `${rollup.items} ${rollup.items === 1 ? "file" : "files"}`
    );
  }

  if (rollup.folders > 0) {
    parts.push(`${rollup.folders} ${rollup.folders === 1 ? "folder" : "folders"}`);
  }
  return parts.join(" · ");
}

/**
 * The shelf's own total, for the header above the tiles.
 *
 * Summed across the tiles rather than taken from `count`, which counts folders
 * and files together — a reader reading "247 items" means files, and adding
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
    .map((kind) => countOfKind(counts.get(kind) ?? 0, kind))
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
    KIND_LABEL[file.kind],
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

/**
 * How long the whole collection runs — "8 hrs", or minutes below one.
 *
 * A chip, beside the count: "19 videos" says how many decisions there are and
 * this says what they add up to, which for a shivir is the fact a reader is
 * actually weighing. Whole hours, because a hero is a decision aid and not a
 * manifest — the exact figure is on each row.
 *
 * Empty where the BE has no durations for the files, which is honest: nothing
 * is better than "0 hrs" on a folder whose lengths have not been imported.
 * `AvShelf` says the same thing in words ("21 hours") on its collection cards,
 * where there is room for them; this is the abbreviated form a chip can hold.
 */
export function totalRunTime(files: Pick<LibraryFile, "duration_seconds">[]): string {
  const seconds = files.reduce((n, f) => n + (f.duration_seconds ?? 0), 0);
  if (seconds <= 0) return "";
  const hours = Math.round(seconds / 3600);
  return hours >= 1 ? `${hours} hrs` : `${Math.max(1, Math.round(seconds / 60))} min`;
}

/**
 * The language named once, in English — "Hindi", not "हिन्दी (Hindi)".
 *
 * The BE's label is bilingual because it is also what a Hindi-reading manager
 * sees. On a hero's facts line it was the only run of Devanagari in a line of
 * numbers and place names, and it said the same word twice. The interface is
 * English throughout (contract §0) and this is interface, not content.
 *
 * The parenthetical first, because that is the BE's own English for it;
 * `Intl` from the ISO code where there is no parenthetical, and the label
 * itself — already English, e.g. "English" — where neither applies.
 */
export function languageInEnglish(card: Pick<NodeCard, "language" | "language_label">): string {
  const inside = card.language_label?.match(/\(([^)]+)\)/)?.[1];
  if (inside) return inside;
  if (card.language) {
    try {
      const named = new Intl.DisplayNames(["en"], { type: "language" }).of(card.language);
      if (named && named !== card.language) return named;
    } catch {
      // a runtime without the data — the label below is still true
    }
  }
  return card.language_label ?? "";
}
