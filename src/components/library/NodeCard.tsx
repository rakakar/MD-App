import Link from "next/link";
import { cardSummary, nodeFacts, tileSummary } from "@/components/library/format";
import { contentLang } from "@/lib/script";
import { ProvenanceBadge } from "@/components/library/ProvenanceBadge";
import { ChevronRight, FolderIcon } from "@/components/shell/icons";
import { CollectionCard } from "@/components/ui";
import { nodeHref, type ShelfMap } from "@/lib/library";
import type {
  BreadcrumbStep,
  LocatedNodeCard,
  NodeCard,
  NodeRollup,
} from "@/lib/types";

/**
 * The kind tint and the kind glyph that used to live here are gone, into
 * `ui/KindTile` and the `kind` token family in globals.css.
 *
 * They were right and they were also the drift the finished comps exposed:
 * this file held one set of five hues, the designer's export held another, and
 * the two had already diverged by a shade in three places. There is one set
 * now and it is in the stylesheet, where a theme can restate it — which is
 * what these hard-coded pairs could never do, and why photographs looked
 * lit-up on the dark shelf.
 */

/**
 * One folder, as a card.
 *
 * Three sizes, because the top of a shelf and the inside of a folder are not
 * the same question. `door` is the large card the seven purpose doors have
 * always been drawn as — they are ordinary folders in the data now (Content
 * Model v3 D8), and keeping them ordinary in the model while letting the
 * shelf's first level look like doors is the whole benefit of that change.
 * Everything deeper is a `row`: by then the reader is navigating, not choosing
 * a direction.
 *
 * `tile` is `door` once the card can say what is inside it. A door is one per
 * line and mostly words, which is right when the words are all there is; given
 * `rollup`, a collection has a face (its kind) and a weight (its hours), and
 * both survive being half as wide. Two per row is what puts a five-collection
 * shelf on one phone screen instead of two and a half — and this app is read
 * on a phone.
 */
export function NodeCardView({
  card,
  variant = "row",
  shelves,
  rollup,
}: {
  card: NodeCard | LocatedNodeCard;
  variant?: "door" | "row" | "tile";
  /** roots that are really a shelf, so a card links at its canonical URL */
  shelves?: ShelfMap;
  /** what is really inside, all the way down — `tile` is drawn from it */
  rollup?: NodeRollup;
}) {
  const summary = cardSummary(card);
  const facts = nodeFacts(card);
  // A cross-posted folder says where it really lives and jumps there — never
  // nested under the folder that borrowed it (§13.6). Without the path a
  // cross-post reads as a duplicate, which is the confusion it exists to
  // avoid, so the breadcrumb is the point of the card rather than a detail.
  const home = "breadcrumb" in card ? card.breadcrumb : null;

  if (variant === "tile") {
    // The deep line where there is one, the shallow line where the rollup has
    // nothing to say — an unpublished branch or a collection still empty. A
    // tile never falls silent, because a tile with no third line reads broken.
    const weight = tileSummary(rollup) || summary;
    const kinds = rollup?.kinds ?? card.kinds;
    return (
      <CollectionCard
        href={nodeHref(card.id, shelves)}
        // A tile takes the kind of what is inside it, when that is one thing.
        // A mixed collection is a folder — there is no one true glyph for it,
        // and the folder icon on every tile is the folder icon on no tile.
        kind={kinds.length === 1 ? kinds[0] : "folder"}
        cover={card.cover_url}
        title={card.name}
        description={card.description || null}
        meta={weight || <span className="text-ink-soft">Nothing yet</span>}
        badge={<ProvenanceBadge provenance={card.provenance} />}
      />
    );
  }

  if (variant === "door") {
    return (
      <Link
        href={nodeHref(card.id, shelves)}
        className="group flex h-full items-start gap-3 rounded-[18px] border border-rule bg-card p-5 transition-shadow hover:shadow-md"
      >
        <span className="min-w-0 flex-1">
          <span
            {...contentLang(card.name)}
            className={`${contentLang(card.name).className} block text-[1.1875rem] font-semibold leading-snug group-hover:underline`}
          >
            {card.name}
          </span>
          {card.description && (
            <span
              {...contentLang(card.description)}
              className={`${contentLang(card.description).className} mt-1 block text-sm leading-relaxed text-ink-soft`}
            >
              {card.description}
            </span>
          )}
          <span className="mt-2 flex flex-wrap items-center gap-2">
            {/* An empty published folder is legitimate — the doors ship
                published so that content published inside them is visible
                (§13.3). It says so rather than showing a bare "0". */}
            <span
              className="text-xs font-semibold"
              style={{ color: summary ? "var(--ws-ink)" : undefined }}
            >
              {summary || <span className="text-ink-soft">Nothing yet</span>}
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
      className="group flex items-start gap-3 rounded-2xl border border-rule bg-card p-4 transition-shadow hover:shadow-md"
    >
      <span aria-hidden className="mt-0.5 shrink-0 text-muted">
        <FolderIcon />
      </span>
      <span className="min-w-0 flex-1">
        {home && home.length > 0 && <BreadcrumbLine steps={home} />}
        <span
          {...contentLang(card.name)}
          className={`${contentLang(card.name).className} block text-sm font-medium leading-snug group-hover:underline`}
        >
          {card.name}
        </span>
        {facts && (
          <span {...contentLang(facts)} className={`${contentLang(facts).className} mt-0.5 block text-xs text-ink-soft`}>
            {facts}
          </span>
        )}
        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
          <span>{summary || "Nothing yet"}</span>
          <ProvenanceBadge provenance={card.provenance} />
        </span>
        {card.description && (
          <span
            {...contentLang(card.description)}
            className={`${contentLang(card.description).className} mt-1 block text-sm leading-relaxed text-ink-soft`}
          >
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
    <span lang="hi" className="hi mb-0.5 block truncate text-xs text-ink-soft">
      {steps.map((s) => s.name).join(" / ")}
    </span>
  );
}
