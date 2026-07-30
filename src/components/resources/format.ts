import type { ResourceItem, ResourceKind } from "@/lib/types";

/** प्रकार, as a reader reads it. The chip order puts this last on purpose. */
export const KIND_HI: Record<ResourceKind, string> = {
  pdf: "PDF",
  audio: "ऑडियो",
  image: "चित्र",
  other: "फ़ाइल",
};

/** the प्रकार facet chips — `other` is not one, nothing is sought by it */
export const FILTERABLE_KINDS: ResourceKind[] = ["pdf", "audio", "image"];

/**
 * What a card can say about its contents without a second request.
 *
 * A card carries `item_count` (the total) and `kinds` (which kinds occur), not
 * a count per kind — so "14 ऑडियो · 1 PDF" is only sayable once the album's
 * `items[]` have arrived. With one kind the total *is* that kind's count and
 * the line reads exactly as the spec draws it; with several, the kinds are
 * named and the total is stated once, rather than a number being invented for
 * each of them.
 */
export function kindsSummary(kinds: ResourceKind[], itemCount: number): string {
  if (itemCount === 0) return "";
  if (kinds.length === 1) return `${itemCount} ${KIND_HI[kinds[0]]}`;
  const named = kinds.map((k) => KIND_HI[k]).filter(Boolean);
  const total = `${itemCount} फ़ाइलें`;
  return named.length > 0 ? `${total} · ${named.join(" · ")}` : total;
}

/** the same line on the album page, where the real per-kind counts are known */
export function itemsSummary(items: ResourceItem[]): string {
  const counts = new Map<ResourceKind, number>();
  for (const i of items) counts.set(i.kind, (counts.get(i.kind) ?? 0) + 1);
  return [...counts]
    .map(([kind, n]) => `${n} ${KIND_HI[kind]}`)
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

/** the facts under an item's title — kind, then whatever the BE actually knows */
export function itemFacts(item: ResourceItem): string {
  return [
    item.kind_label || KIND_HI[item.kind],
    item.page_count ? `${item.page_count} pages` : null,
    formatDuration(item.duration_seconds) || null,
    formatBytes(item.file_size) || null,
  ]
    .filter(Boolean)
    .join(" · ");
}
