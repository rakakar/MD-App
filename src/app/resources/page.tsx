import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NodeCardView } from "@/components/library/NodeCard";
import { FileList } from "@/components/library/FileList";
import { Sieve, applySieve, ClearSieve, type SieveSelection } from "@/components/library/Sieve";
import { ShelfCard } from "@/components/shelf/BookShelf";
import { ChevronRight } from "@/components/shell/icons";
import { EmptyState, PageContainer, SectionHeading, SegmentedNav } from "@/components/ui";
import { getBooks, getNode, getTopics, getWorkspaces, nodeChildren } from "@/lib/api";
import { shelfMap } from "@/lib/library";
import type { BookSummary, LibraryNode, Topic } from "@/lib/types";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Resources · संसाधन",
  description:
    "प्रवचन, शिविर सामग्री, संकलन, अध्ययन व शोध, चित्र व चार्ट — purpose-wise.",
};

/**
 * Which format of the shelf is showing (PRD v2 §5.0.1).
 *
 * A workspace is a shelf, not a treatment: संसाधन holds the library tree *and*
 * whichever books are filed here. The tab exists for that, and it is never
 * drawn when there is only one — a single tab is a label for the thing already
 * on screen.
 */
type Format = "library" | "books";

const FORMAT_LABEL: Record<Format, string> = {
  library: "सामग्री",
  books: "पुस्तकें",
};

/**
 * The संसाधन shelf — the Resources workspace root, rendered as its contents.
 *
 * The root is a folder like any other and the seven purpose doors are now
 * ordinary folders inside it (Content Model v3 D8) — one fewer concept, one
 * fewer panel screen. What is kept is how they *look*: the first level of the
 * shelf is drawn as doors, everything below it as folder rows, because a
 * reader choosing a direction and a reader navigating are not doing the same
 * thing.
 *
 * The root itself is never drawn as a card inside its own shelf (§10.1) — a
 * card labelled संसाधन sitting inside संसाधन is an empty step.
 */
export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<SieveSelection & { format?: string }>;
}) {
  const { format, ...selection } = await searchParams;

  const workspaces = await getWorkspaces().catch(() => []);
  const rootId = workspaces.find((w) => w.code === "resources")?.root_node_id ?? null;
  // `root_node_id` is null when the root is unpublished — the whole shelf is
  // then hidden by the same rule that hides any branch, and the honest answer
  // is that there is nothing here rather than an empty page pretending.
  if (rootId === null) notFound();

  const [root, topics, books, shelves] = await Promise.all([
    getNode(rootId).catch(() => null),
    getTopics().catch(() => [] as Topic[]),
    getBooks({ workspace: "resources" }).catch(() => [] as BookSummary[]),
    shelfMap(),
  ]);
  if (!root) notFound();

  const available: Format[] = ["library", ...(books.length > 0 ? (["books"] as const) : [])];
  const active: Format = format === "books" && books.length > 0 ? "books" : "library";

  return (
    <PageContainer size="shelf">
      <h1 className="font-display text-[26px] font-medium tracking-[-0.015em] lg:text-4xl">
        <span lang="hi" className="hi">{root.name}</span>
      </h1>
      <p lang="hi" className="hi mt-1 text-sm text-ink-soft">
        शिविर सामग्री, संकलन, प्रवचन, शोध पत्र, चित्र व चार्ट — क्या खोज रहे हैं, उससे शुरू करें।
      </p>

      {available.length > 1 && (
        <div className="mt-4">
          <SegmentedNav
            label="Format"
            items={available.map((f) => ({
              label: (
                <span lang="hi" className="hi">
                  {FORMAT_LABEL[f]}
                </span>
              ),
              href: f === "library" ? "/resources" : `/resources?format=${f}`,
              active: f === active,
            }))}
          />
        </div>
      )}

      {active === "books" ? (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {books.map((b) => (
            <li key={b.code}>
              <ShelfCard book={b} />
            </li>
          ))}
        </ul>
      ) : (
        <Shelf root={root} selection={selection} topics={topics} shelves={shelves} />
      )}
    </PageContainer>
  );
}

function Shelf({
  root,
  selection,
  topics,
  shelves,
}: {
  root: LibraryNode;
  selection: SieveSelection;
  topics: Topic[];
  shelves: Record<number, string>;
}) {
  const doors = nodeChildren(root);
  const shown = applySieve(doors, selection);
  const filtered = Object.values(selection).some(Boolean);
  const files = [...root.items, ...root.linked_items];

  return (
    <>
      <TopicDoors topics={topics} />

      <Sieve cards={doors} selection={selection} basePath="/resources" />
      {filtered && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft">
          <span lang="hi" className="hi">
            {shown.length} / {doors.length}
          </span>
          <ClearSieve basePath="/resources" selection={selection} />
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
          <EmptyState
            title="संसाधन अभी आ रहे हैं"
            hint="The library is being filled folder by folder; material appears here as it is published."
          />
        </div>
      )}

      {/* A file filed directly on the root — a lone PDF needs no wrapper now,
          so the shelf has to be able to hold one. */}
      {files.length > 0 && (
        <FileList files={root.items} linked={root.linked_items} albumTitle={root.name} />
      )}

      <SectionHeading tier="title">
        <span lang="hi" className="hi">नागराज जी की वाणी</span>
      </SectionHeading>
      <Link
        href="/vani"
        className="flex items-center gap-3 rounded-2xl border border-rule bg-white p-4 transition-shadow hover:shadow-md"
      >
        <span className="min-w-0 flex-1">
          <span lang="hi" className="hi block text-[15px] font-medium">
            जो उनके अपने शब्दों, स्वर या हाथ से है
          </span>
          <span className="mt-0.5 block text-xs text-ink-soft">
            Everything marked मूल, gathered from across the library.
          </span>
        </span>
        <span aria-hidden className="shrink-0 text-muted">
          <ChevronRight />
        </span>
      </Link>
    </>
  );
}

/**
 * The विषय chips — a **door onto the whole library**, which is why tapping one
 * navigates away rather than narrowing what is on screen (contract §13.4).
 *
 * Zero-count chips are hidden: a chip that filters to nothing is a dead
 * control. Today every count is 0 because nothing is filed yet, so the row
 * simply is not drawn.
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
