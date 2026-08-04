import Link from "next/link";
import { cardSummary, nodeFacts, tileSummary } from "@/components/library/format";
import { ProvenanceBadge } from "@/components/library/ProvenanceBadge";
import {
  ChevronRight,
  DocumentIcon,
  FolderIcon,
  HeadphonesIcon,
  ImageIcon,
  VideoIcon,
} from "@/components/shell/icons";
import { nodeHref, type ShelfMap } from "@/lib/library";
import type {
  BreadcrumbStep,
  FileKind,
  LocatedNodeCard,
  NodeCard,
  NodeRollup,
} from "@/lib/types";

/**
 * The face of a collection, from what is actually inside it.
 *
 * A folder icon on every tile is a folder icon on no tile — it repeats what
 * the grid already says. These earn their place only where a collection is
 * **of one kind**, which on this shelf is the ordinary case rather than the
 * lucky one: मूल ग्रंथ's five collections are videos, recordings, photographs
 * and documents, and each is pure. A mixed collection gets the folder back,
 * because there is no one true thing to draw.
 */
function KindIcon({ kinds, className }: { kinds: FileKind[]; className?: string }) {
  const only: FileKind | null = kinds.length === 1 ? kinds[0] : null;
  if (only === "audio") return <HeadphonesIcon className={className} />;
  if (only === "video") return <VideoIcon className={className} />;
  if (only === "image") return <ImageIcon className={className} />;
  if (only === "pdf") return <DocumentIcon className={className} />;
  return <FolderIcon className={className} />;
}

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
    return (
      <Link
        href={nodeHref(card.id, shelves)}
        className="group flex h-full flex-col rounded-[18px] border border-rule bg-white p-3.5 transition-shadow hover:shadow-md"
      >
        <span
          aria-hidden
          className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: "var(--color-accent-tint)", color: "var(--ws-ink)" }}
        >
          <KindIcon kinds={rollup?.kinds ?? []} className="h-[18px] w-[18px]" />
        </span>
        {/* Clamped, because a tile is half a phone wide and one long name
            otherwise sets the height of every tile beside it — the folder
            named "Samvaad, Talk, & Shivir - संवाद, वार्ता एवं शिविर" ran to
            three lines and left its neighbour two-thirds empty. */}
        <span
          lang="hi"
          className="hi line-clamp-2 text-[15px] font-semibold leading-snug group-hover:underline"
        >
          {card.name}
        </span>
        {card.description && (
          // Two lines, not one. This line is doing more work than it looks:
          // a folder is named in the language its material is in, so on a
          // Hindi shelf the description is where an English reader is met —
          // "ऑडियो" over "Audio — Nagraj ji's recorded discourses". Clipped to
          // one line it became "Audio — Nagraj ji's record…", which is the
          // half of the sentence that says nothing. Still clamped, because
          // four lines would push the count off the bottom of the tile.
          <span className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-muted">
            {card.description}
          </span>
        )}
        <span className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-2.5">
          <span
            lang="hi"
            className="hi text-[11.5px] font-semibold"
            style={{ color: weight ? "var(--ws-ink)" : undefined }}
          >
            {weight || <span className="text-muted">अभी कुछ नहीं</span>}
          </span>
          <ProvenanceBadge provenance={card.provenance} />
        </span>
      </Link>
    );
  }

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
