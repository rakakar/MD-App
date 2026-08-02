import Link from "next/link";
import { FileList } from "./FileList";
import { NodeCardView } from "./NodeCard";
import { Sieve, applySieve, ClearSieve, type SieveSelection } from "./Sieve";
import { EmptyState } from "@/components/ui";
import { nodeChildren } from "@/lib/api";
import type { LibraryNode, Topic } from "@/lib/types";

/**
 * A workspace root, drawn as its contents.
 *
 * Lifted out of the संसाधन page once Originals started holding folders too
 * (Content Model v3 §5, D14): the two shelves ask the same question of the
 * same shape — the root's children as doors, sieved, over whatever files sit
 * on the root itself — and the second copy of two hundred lines is where they
 * would start to disagree.
 *
 * What stays per-workspace is only what a reader would notice: the address the
 * sieve writes into, and what an empty shelf says. Everything structural is
 * the same because the tree is the same tree.
 *
 * The root is never drawn as a card inside its own shelf (§10.1) — a card
 * labelled संसाधन sitting inside संसाधन is an empty step.
 */
export function WorkspaceShelf({
  root,
  selection,
  topics,
  shelves,
  basePath,
  emptyTitle,
  emptyHint,
}: {
  root: LibraryNode;
  selection: SieveSelection;
  topics: Topic[];
  shelves: Record<number, string>;
  /** where the sieve's chips write their query — this shelf's own address */
  basePath: string;
  emptyTitle: string;
  emptyHint: string;
}) {
  const doors = nodeChildren(root);
  const shown = applySieve(doors, selection);
  const filtered = Object.values(selection).some(Boolean);
  const files = [...root.items, ...root.linked_items];

  return (
    <>
      <TopicDoors topics={topics} />

      <Sieve cards={doors} selection={selection} basePath={basePath} />
      {filtered && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft">
          <span lang="hi" className="hi">
            {shown.length} / {doors.length}
          </span>
          <ClearSieve basePath={basePath} selection={selection} />
        </div>
      )}

      {shown.length > 0 ? (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {shown.map((door) => (
            <li key={door.id}>
              <NodeCardView card={door} variant="door" shelves={shelves} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5">
          <EmptyState title={emptyTitle} hint={emptyHint} />
        </div>
      )}

      {/* A file filed directly on the root — a lone PDF needs no wrapper now,
          so the shelf has to be able to hold one. */}
      {files.length > 0 && (
        <FileList files={root.items} linked={root.linked_items} albumTitle={root.name} />
      )}
    </>
  );
}

/**
 * The विषय chips — a **door onto the whole library**, which is why tapping one
 * navigates away rather than narrowing what is on screen (contract §13.4).
 *
 * Zero-count chips are hidden: a chip that filters to nothing is a dead
 * control, so a shelf whose विषय are all empty simply does not draw the row.
 */
function TopicDoors({ topics }: { topics: Topic[] }) {
  const live = topics.filter((t) => t.node_count > 0).sort((a, b) => a.ordering - b.ordering);
  if (live.length === 0) return null;

  return (
    <div className="mt-5">
      <p lang="hi" className="hi mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-soft">
        विषय
      </p>
      <div className="flex flex-wrap gap-1.5">
        {live.map((t) => (
          <Link
            key={t.code}
            href={`/library?topic=${encodeURIComponent(t.code)}`}
            className="rounded-full border border-rule bg-white px-3 py-1 text-xs font-medium text-ink transition-colors hover:bg-black/[.03]"
          >
            {/* The one taxonomy label that arrives in Hindi and is shown as a
                manager typed it — they add topics without a deploy, so the FE
                cannot hold a label it has never seen. */}
            <span lang="hi" className="hi">
              {t.name}
            </span>
            <span className="ms-1 tabular-nums opacity-70">{t.node_count}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
