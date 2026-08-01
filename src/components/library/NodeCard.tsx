import Link from "next/link";
import { cardSummary, nodeFacts } from "@/components/library/format";
import { ProvenanceBadge } from "@/components/library/ProvenanceBadge";
import { ChevronRight, FolderIcon } from "@/components/shell/icons";
import { nodeHref, type ShelfMap } from "@/lib/library";
import type { BreadcrumbStep, LocatedNodeCard, NodeCard } from "@/lib/types";

/**
 * One folder, as a card.
 *
 * Two sizes, because the top of a shelf and the inside of a folder are not the
 * same question. `door` is the large card the seven purpose doors have always
 * been drawn as — they are ordinary folders in the data now (Content Model v3
 * D8), and keeping them ordinary in the model while letting the shelf's first
 * level look like doors is the whole benefit of that change. Everything deeper
 * is a `row`: by then the reader is navigating, not choosing a direction.
 */
export function NodeCardView({
  card,
  variant = "row",
  shelves,
}: {
  card: NodeCard | LocatedNodeCard;
  variant?: "door" | "row";
  /** roots that are really a shelf, so a card links at its canonical URL */
  shelves?: ShelfMap;
}) {
  const summary = cardSummary(card);
  const facts = nodeFacts(card);
  // A cross-posted folder says where it really lives and jumps there — never
  // nested under the folder that borrowed it (§13.6). Without the path a
  // cross-post reads as a duplicate, which is the confusion it exists to
  // avoid, so the breadcrumb is the point of the card rather than a detail.
  const home = "breadcrumb" in card ? card.breadcrumb : null;

  if (variant === "door") {
    return (
      <Link
        href={nodeHref(card.id, shelves)}
        className="group flex h-full items-start gap-3 rounded-[18px] border border-rule bg-white p-5 transition-shadow hover:shadow-md"
      >
        <span className="min-w-0 flex-1">
          <span
            lang="hi"
            className="hi block text-[19px] font-semibold leading-snug group-hover:underline"
          >
            {card.name}
          </span>
          {card.description && (
            <span lang="hi" className="hi mt-1 block text-[13px] leading-relaxed text-ink-soft">
              {card.description}
            </span>
          )}
          <span className="mt-2 flex flex-wrap items-center gap-2">
            {/* An empty published folder is legitimate — the doors ship
                published so that content published inside them is visible
                (§13.3). It says so rather than showing a bare "0". */}
            <span
              lang="hi"
              className="hi text-[11.5px] font-semibold"
              style={{ color: summary ? "var(--ws-ink)" : undefined }}
            >
              {summary || <span className="text-muted">अभी कुछ नहीं</span>}
            </span>
            <ProvenanceBadge provenance={card.provenance} />
          </span>
        </span>
        <span aria-hidden className="mt-1 shrink-0 text-muted">
          <ChevronRight />
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={nodeHref(card.id, shelves)}
      className="group flex items-start gap-3 rounded-2xl border border-rule bg-white p-4 transition-shadow hover:shadow-md"
    >
      <span aria-hidden className="mt-0.5 shrink-0 text-muted">
        <FolderIcon />
      </span>
      <span className="min-w-0 flex-1">
        {home && home.length > 0 && <BreadcrumbLine steps={home} />}
        <span lang="hi" className="hi block text-[15px] font-medium leading-snug group-hover:underline">
          {card.name}
        </span>
        {facts && (
          <span lang="hi" className="hi mt-0.5 block text-xs text-ink-soft">
            {facts}
          </span>
        )}
        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
          <span lang="hi" className="hi">
            {summary || "अभी कुछ नहीं"}
          </span>
          <ProvenanceBadge provenance={card.provenance} />
        </span>
        {card.description && (
          <span lang="hi" className="hi mt-1 block text-xs leading-relaxed text-ink-soft">
            {card.description}
          </span>
        )}
      </span>
      <span aria-hidden className="mt-1 shrink-0 text-muted">
        <ChevronRight />
      </span>
    </Link>
  );
}

/**
 * Where a row really lives, printed above its name.
 *
 * Plain text rather than links: this sits inside a card that is itself a link,
 * and an anchor inside an anchor is invalid HTML that browsers unnest in ways
 * nobody controls. The card already jumps to the thing; the path is here to
 * say which "दिन 1" this is.
 */
export function BreadcrumbLine({ steps }: { steps: BreadcrumbStep[] }) {
  return (
    <span lang="hi" className="hi mb-0.5 block truncate text-[11px] text-muted">
      {steps.map((s) => s.name).join(" / ")}
    </span>
  );
}
