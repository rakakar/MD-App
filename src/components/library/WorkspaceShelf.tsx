import Link from "next/link";
import { FileList } from "./FileList";
import { FindBar } from "./FindBar";
import { FindResults } from "./FindResults";
import { NodeCardView } from "./NodeCard";
import { Sieve } from "./Sieve";
import { EmptyState } from "@/components/ui";
import { findLibrary, nodeChildren } from "@/lib/api";
import { isAsked, type FindState } from "@/lib/find";
import type { LibraryFindResponse, LibraryNode, Topic } from "@/lib/types";

/**
 * A workspace root, drawn as its contents.
 *
 * Lifted out of the संसाधन page once Originals started holding folders too
 * (Content Model v3 §5, D14): the two shelves ask the same question of the
 * same shape — the root's children as doors, over whatever files sit on the
 * root itself — and the second copy of two hundred lines is where they would
 * start to disagree.
 *
 * What stays per-workspace is only what a reader would notice: the address the
 * find writes into, and what an empty shelf says. Everything structural is the
 * same because the tree is the same tree.
 *
 * The root is never drawn as a card inside its own shelf (§10.1) — a card
 * labelled संसाधन sitting inside संसाधन is an empty step.
 *
 * **Browse and find are two different calls, and this is where the switch
 * lives** (§13.2, §13.4). With nothing typed and no chip on, the shelf is the
 * root's children — one level, cached, no breadcrumbs, exactly as before. The
 * moment anything is asked it becomes `library/search/`: the whole workspace,
 * deep, ranked, a path on every row. The sieve above is fetched either way,
 * because its counts describe the whole shelf and that is precisely what the
 * browse cannot answer.
 */
export async function WorkspaceShelf({
  root,
  state,
  topics,
  shelves,
  basePath,
  emptyTitle,
  emptyHint,
}: {
  root: LibraryNode;
  state: FindState;
  topics: Topic[];
  shelves: Record<number, string>;
  /** where the box and the chips write their query — this shelf's own address */
  basePath: string;
  emptyTitle: string;
  emptyHint: string;
}) {
  const doors = nodeChildren(root);
  const files = [...root.items, ...root.linked_items];
  const scope = { workspace: root.workspace };

  // Losing the find must not lose the shelf: a failed request drops back to
  // the browse, which needs nothing from it.
  const find: LibraryFindResponse | null = await findLibrary({ ...scope, state }).catch(
    () => null
  );
  const finding = isAsked(state) && find !== null;

  return (
    <>
      <TopicDoors topics={topics} />

      <FindBar basePath={basePath} state={state} scope={root.name} />
      {find && <Sieve facets={find.facets} state={state} basePath={basePath} />}

      {finding ? (
        <FindResults
          find={find}
          state={state}
          basePath={basePath}
          scope={scope}
          shelves={shelves}
        />
      ) : (
        <>
          {doors.length > 0 ? (
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {doors.map((door) => (
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

          {/* A file filed directly on the root — a lone PDF needs no wrapper
              now, so the shelf has to be able to hold one. */}
          {files.length > 0 && (
            <FileList files={root.items} linked={root.linked_items} albumTitle={root.name} />
          )}
        </>
      )}
    </>
  );
}

/**
 * The विषय chips — a **door onto the whole library**, which is why tapping one
 * navigates away rather than narrowing what is on screen (contract §13.4).
 *
 * Kept above the box and outside the sieve for that reason, even though the
 * find endpoint will happily filter on विषय too: these are counted library-wide
 * and leave the shelf, while a sieve chip is counted over this shelf and stays.
 * One row that navigates, one block that narrows.
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
