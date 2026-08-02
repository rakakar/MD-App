import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkspaceShelf } from "@/components/library/WorkspaceShelf";
import type { SieveSelection } from "@/components/library/Sieve";
import { ShelfCard } from "@/components/shelf/BookShelf";
import { PageContainer, SegmentedNav } from "@/components/ui";
import { getBooks, getNode, getTopics, getWorkspaces } from "@/lib/api";
import { shelfMap } from "@/lib/library";
import type { BookSummary, Topic } from "@/lib/types";

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
        <WorkspaceShelf
          root={root}
          selection={selection}
          topics={topics}
          shelves={shelves}
          basePath="/resources"
          emptyTitle="संसाधन अभी आ रहे हैं"
          emptyHint="The library is being filled folder by folder; material appears here as it is published."
        />
      )}
    </PageContainer>
  );
}
