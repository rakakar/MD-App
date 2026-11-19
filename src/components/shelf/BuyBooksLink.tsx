import { ShoppingBagIcon } from "@/components/shell/icons";

/** where the printed editions are sold */
export const PURCHASE_URL = "https://purchase.madhyasth.org/";

/**
 * "Buy books", out to the print store — beside the title on the Books shelf
 * (designer's call, 24 Oct 2026) and on the Library shelf (19 Nov 2026).
 *
 * Outlined in the workspace colour, not filled — it leaves the app, so it
 * should not outrank anything that stays in it. `max-lg:-my-2` pulls it up to
 * centre on the title's line on a phone, where only the title shows, without
 * the row jumping when the `i` opens the description under it; the row it sits
 * in is `items-start lg:items-center` for the same reason.
 */
export function BuyBooksLink() {
  return (
    <a
      href={PURCHASE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-control border bg-card px-4 text-sm font-semibold transition-colors hover:bg-accent-tint max-lg:-my-2"
      style={{
        color: "var(--ws-ink)",
        borderColor: "color-mix(in srgb, var(--ws-color) 45%, transparent)",
      }}
    >
      <ShoppingBagIcon className="h-4.5 w-4.5" />
      Buy books
      <span aria-hidden>↗</span>
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
