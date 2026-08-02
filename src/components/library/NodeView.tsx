import Link from "next/link";
import { FileList } from "@/components/library/FileList";
import { NodeCardView } from "@/components/library/NodeCard";
import { ProvenanceBadge } from "@/components/library/ProvenanceBadge";
import { ClearSieve, Sieve, applySieve, type SieveSelection } from "@/components/library/Sieve";
import { filesSummary, nodeFacts } from "@/components/library/format";
import { CoverTile } from "@/components/shelf/CoverTile";
import { BackIcon } from "@/components/shell/icons";
import { nodeChildren } from "@/lib/api";
import { bookHue } from "@/lib/bookHue";
import { nodeHref, type ShelfMap } from "@/lib/library";
import type { LibraryNode } from "@/lib/types";

/**
 * One folder — **the same component at every depth**.
 *
 * `GET nodes/{id}/` returns an identical shape at depth 1 and depth 6, which
 * is what collapses the old three-screen flow (door page → collection card →
 * track list) into this. What used to be a "collection" is a folder that
 * happens to hold files; an audio series is a folder; a lone PDF needs no
 * wrapper at all.
 *
 * The recursion is by **route**, not by nesting: each level is its own URL and
 * its own fetch, which is what makes a deep link shareable and the back button
 * mean something. `children` is deliberately not enough to recurse without
 * another request.
 */
export function NodeView({
  node,
  selection = {},
  basePath,
  shelves = {},
  /** the first breadcrumb step is the page's own title on a shelf, not a link */
  isShelf = false,
}: {
  node: LibraryNode;
  selection?: SieveSelection;
  /** this folder's own URL, for the sieve's chip links */
  basePath: string;
  shelves?: ShelfMap;
  isShelf?: boolean;
}) {
  // Through the accessor, never `node.children` directly: when the pCloud
  // import forces `children` to be capped and paginated, that is the one place
  // it changes (§13.2).
  const children = nodeChildren(node);
  const shown = applySieve(children, selection);
  const filtered = Object.values(selection).some(Boolean);
  const files = [...node.items, ...node.linked_items];

  // The album/index rule. A folder with no child folders and at least one file
  // is an album: a hero, a cover and the player, which is what a fourteen-part
  // शिविर recording needs. A folder that holds folders is an index whatever
  // else is in it — its files list below them. Deterministic on purpose: a
  // rule that counted files against folders would flip an index into an album
  // the day someone added one more file, and the reader would experience that
  // as an app that changes its mind.
  const isAlbum = children.length + node.linked_children.length === 0 && files.length > 0;

  return (
    <>
      {isAlbum ? (
        <AlbumHeader node={node} shelves={shelves} isShelf={isShelf} />
      ) : (
        <IndexHeader node={node} shelves={shelves} isShelf={isShelf} />
      )}

      {children.length > 0 && (
        <>
          <Sieve cards={children} selection={selection} basePath={basePath} />

          {filtered && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft">
              <span lang="hi" className="hi">
                {shown.length} / {children.length} फ़ोल्डर
              </span>
              <ClearSieve basePath={basePath} selection={selection} />
            </div>
          )}

          <ul className="mt-4 flex flex-col gap-3">
            {shown.map((child) => (
              <li key={child.id}>
                <NodeCardView card={child} shelves={shelves} />
              </li>
            ))}
          </ul>

          {shown.length === 0 && (
            <p lang="hi" className="hi mt-4 text-center text-sm text-ink-soft">
              इस छाँट पर कुछ नहीं — कोई चिप हटाकर देखें।
            </p>
          )}
        </>
      )}

      {/*
        Cross-posted folders, kept apart from the folder's own children and
        never nested under it: a borrowed folder has exactly one home, and its
        card jumps there rather than pretending to live here (§13.6). The
        sieve above does not touch them for the same reason — they are not
        this folder's contents.
      */}
      {node.linked_children.length > 0 && (
        <section className="mt-7">
          <h2 lang="hi" className="hi mb-3 text-[11px] font-bold uppercase tracking-[0.09em] text-ink-soft">
            और भी यहाँ से
          </h2>
          <ul className="flex flex-col gap-3">
            {node.linked_children.map((card) => (
              <li key={card.id}>
                <NodeCardView card={card} shelves={shelves} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <FileList
        files={node.items}
        linked={node.linked_items}
        albumTitle={node.name}
        coverUrl={node.cover_url}
      />

      {children.length === 0 && node.linked_children.length === 0 && files.length === 0 && (
        <EmptyFolder />
      )}
    </>
  );
}

/** the hero an album gets — cover, facts, badge, and what is inside */
function AlbumHeader({
  node,
  shelves,
  isShelf,
}: {
  node: LibraryNode;
  shelves: ShelfMap;
  isShelf: boolean;
}) {
  const hue = bookHue(`node-${node.id}`);
  const parent = node.breadcrumb.at(-1);
  const files = [...node.items, ...node.linked_items];

  return (
    <div
      className="-mx-4 -mt-5 px-4 pb-5 pt-4 sm:mx-0 sm:mt-0 sm:rounded-3xl sm:p-6"
      style={{
        background: `linear-gradient(165deg, ${hue.from}, ${hue.to} 70%, color-mix(in srgb, ${hue.to} 82%, #000))`,
      }}
    >
      {parent && !isShelf && (
        <Link
          href={nodeHref(parent.id, shelves)}
          aria-label={`Back to ${parent.name}`}
          className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <BackIcon />
        </Link>
      )}

      <div className="flex items-end gap-4">
        <div className="w-24 shrink-0">
          <CoverTile
            book={{
              title_hi: node.name,
              cover_image: node.cover_url,
              code: `node-${node.id}`,
            }}
            size="grid"
          />
        </div>
        <div className="min-w-0 flex-1 pb-1">
          <Trail node={node} shelves={shelves} tone="dark" />
          <h1 lang="hi" className="hi mt-0.5 text-[21px] font-semibold leading-tight text-white">
            {node.name}
          </h1>
          {nodeFacts(node) && (
            <p lang="hi" className="hi mt-2 text-[12.5px] font-medium text-white/75">
              {nodeFacts(node)}
            </p>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {/* The badge rides on the album too, not only on the card: this is
                the screen where someone actually reads or listens, and it is
                the last place to say whose word this is. */}
            <ProvenanceBadge provenance={node.provenance} tone="dark" />
            <span lang="hi" className="hi text-[11.5px] font-semibold text-white/75">
              {filesSummary(files)}
            </span>
          </div>
        </div>
      </div>

      {node.description && (
        <p lang="hi" className="hi mt-4 text-sm leading-relaxed text-white/85">
          {node.description}
        </p>
      )}

      <WholeSetLink url={node.external_url} tone="dark" />
    </div>
  );
}

/**
 * "The whole set, where it also lives" — a YouTube playlist for a folder of
 * recordings.
 *
 * Under the files rather than over them, and worded as *also*: every video is
 * here as its own item and plays here, so a link out offered first would send
 * a reader away from the thing they already have. It is for the reader who
 * wants the set in one piece, or wants it on the platform they keep it on.
 */
function WholeSetLink({ url, tone = "light" }: { url: string; tone?: "light" | "dark" }) {
  if (!url) return null;
  const dark = tone === "dark";
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        dark
          ? "border-white/30 text-white/90 hover:bg-white/10"
          : "border-rule bg-white text-ink hover:bg-black/[.03]"
      }`}
    >
      <span lang="hi" className="hi">पूरी शृंखला देखें</span>
      <span aria-hidden>↗</span>
    </a>
  );
}

/** the quieter head an index gets — a path, a name, a line about it */
function IndexHeader({
  node,
  shelves,
  isShelf,
}: {
  node: LibraryNode;
  shelves: ShelfMap;
  isShelf: boolean;
}) {
  const parent = node.breadcrumb.at(-1);
  return (
    <div>
      {parent && !isShelf && (
        <Link
          href={nodeHref(parent.id, shelves)}
          aria-label={`Back to ${parent.name}`}
          className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rule bg-white text-ink-soft transition-colors hover:bg-black/[.03]"
        >
          <BackIcon />
        </Link>
      )}
      <Trail node={node} shelves={shelves} />
      <h1
        lang="hi"
        className="hi text-[22px] font-semibold leading-tight lg:text-3xl"
      >
        {node.name}
      </h1>
      {node.description && (
        <p lang="hi" className="hi mt-1 text-sm text-ink-soft">
          {node.description}
        </p>
      )}
      {nodeFacts(node) && (
        <p lang="hi" className="hi mt-1.5 text-xs text-ink-soft">
          {nodeFacts(node)}
        </p>
      )}
      <div className="mt-2">
        <ProvenanceBadge provenance={node.provenance} />
      </div>
      <WholeSetLink url={node.external_url} />
    </div>
  );
}

/**
 * Where this folder sits, root first — every step a link, because six levels
 * deep the only way back to level two is through here.
 *
 * A folder's own breadcrumb stops at its parent (§13.6), so the folder's name
 * is the heading below rather than the last crumb. A root's is `[]` and
 * nothing is drawn.
 */
function Trail({
  node,
  shelves,
  tone = "paper",
}: {
  node: LibraryNode;
  shelves: ShelfMap;
  tone?: "paper" | "dark";
}) {
  if (node.breadcrumb.length === 0) return null;
  return (
    <nav
      aria-label="Breadcrumb"
      lang="hi"
      className={`hi mb-0.5 flex flex-wrap items-center gap-x-1 text-[11.5px] font-semibold ${
        tone === "dark" ? "text-white/70" : "text-ink-soft"
      }`}
    >
      {node.breadcrumb.map((step, i) => (
        <span key={step.id} className="flex items-center gap-x-1">
          {i > 0 && <span aria-hidden>/</span>}
          <Link href={nodeHref(step.id, shelves)} className="hover:underline">
            {step.name}
          </Link>
        </span>
      ))}
    </nav>
  );
}

/**
 * A published folder with nothing in it yet.
 *
 * Legitimate rather than broken: the workspace roots and the seven doors ship
 * published so that content published *inside* them is visible at all, and a
 * manager-created folder cannot publish while empty (§13.3). So it says what
 * it is instead of being hidden — with the library still being filled, hiding
 * empties would make the shelf look like it does not exist.
 */
function EmptyFolder() {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-rule px-4 py-8 text-center">
      <p lang="hi" className="hi text-sm font-medium">
        अभी कुछ प्रकाशित नहीं
      </p>
      <p className="mt-1 text-xs text-ink-soft">
        Material appears here as it is published into this folder.
      </p>
    </div>
  );
}
