import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContinueDocument } from "@/components/library/ContinueDocument";
import { WorkspaceShelf } from "@/components/library/WorkspaceShelf";
import { ShelfCard } from "@/components/shelf/BookShelf";
import { PageContainer, SegmentedNav } from "@/components/ui";
import { getBooks, getNode, getTopics, getWorkspaces } from "@/lib/api";
import { readFind } from "@/lib/find";
import { shelfMap } from "@/lib/library";
import type { BookSummary, Topic } from "@/lib/types";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Student Materials",
  description:
    "Textbooks, study guides, shodh patra, shivir materials and other media — written and curated by students.",
};

/**
 * Which format of the shelf is showing (PRD v2 §5.0.1).
 *
 * A workspace is a shelf, not a treatment: Resources holds the library tree *and*
 * whichever books are filed here. The tab exists for that, and it is never
 * drawn when there is only one — a single tab is a label for the thing already
 * on screen.
 */
type Format = "library" | "books";

const FORMAT_LABEL: Record<Format, string> = {
  library: "Library",
  books: "Books",
};

/**
 * The Resources shelf — the workspace root, rendered as its contents.
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
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const format = typeof params.format === "string" ? params.format : undefined;
  const state = readFind(params);

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
      {/* The title is the name of this *screen*, not of the workspace it sits
          in — the app bar and the switcher already say "Resources"; this is
          the answer to "what is this particular page for", the same way the
          nav item that opens it is now named "Student Materials" and not
          "Library". It used to be `root.name`, which said "संसाधन" and left
          the heading of a bottom-nav destination editable in the admin. */}
      <h1 className="font-display text-[1.625rem] font-medium leading-tight tracking-[-0.015em] lg:text-4xl">
        Student Materials
      </h1>
      <p className="mt-0.5 text-sm text-ink-soft">
        Contains Textbooks, Study guides, Shodh patra, shivir materials, and
        other media. Written and curated by students.
      </p>

      {/* The shortest path back to a half-read document, as on `/originals` —
          scoped to this shelf, so it names Resources' own files and not the
          originals a reader left off in. Drawn client-side from saved places,
          so it is simply absent for anyone who has not started one. */}
      <ContinueDocument workspace="resources" />

      {available.length > 1 && (
        <div className="mt-4">
          <SegmentedNav
            label="Format"
            items={available.map((f) => ({
              label: FORMAT_LABEL[f],
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
          state={state}
          topics={topics}
          shelves={shelves}
          basePath="/resources"
          searchScope="Student Materials"
          emptyTitle="Resources are on their way"
          emptyHint="The library is being filled folder by folder; material appears here as it is published."
        />
      )}
    </PageContainer>
  );
}
