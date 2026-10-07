import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContinueDocument } from "@/components/library/ContinueDocument";
import { WorkspaceShelf } from "@/components/library/WorkspaceShelf";
import { ShelfCard } from "@/components/shelf/BookShelf";
import { PageContainer, SegmentedNav } from "@/components/ui";
import { PageTitle } from "@/components/ui/PageTitle";
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
 * Off for now at the designer's request — a product decision, not a rule
 * about the data. Flip it back on and the toggle returns exactly as it was:
 * hidden below two formats, shown above them, "Books" reachable at
 * `?format=books`. Nothing below this line needed to change to turn it off,
 * which is the point of gating it here rather than deleting the branch.
 */
const SHOW_FORMAT_TOGGLE = false;

const TITLE = "Student Materials";
const DESCRIPTION =
  "Contains Textbooks, Study guides, Shodh patra, shivir materials, and other media. Written and curated by students.";

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

  // Started before the workspace list is awaited — see the same hoist in
  // `originals/page.tsx`. Only `getNode` needs the root id.
  const topicsPromise = getTopics().catch(() => [] as Topic[]);
  const booksPromise = SHOW_FORMAT_TOGGLE
    ? getBooks({ workspace: "resources" }).catch(() => [] as BookSummary[])
    : Promise.resolve([] as BookSummary[]);
  const shelvesPromise = shelfMap();

  const workspaces = await getWorkspaces().catch(() => []);
  const rootId = workspaces.find((w) => w.code === "resources")?.root_node_id ?? null;
  // `root_node_id` is null when the root is unpublished — the whole shelf is
  // then hidden by the same rule that hides any branch, and the honest answer
  // is that there is nothing here rather than an empty page pretending.
  if (rootId === null) notFound();

  const [root, topics, books, shelves] = await Promise.all([
    getNode(rootId).catch(() => null),
    topicsPromise,
    // Not fetched while the toggle is off — nothing on the page can show a
    // book row, so a books listing here would just be a request nobody reads.
    booksPromise,
    shelvesPromise,
  ]);
  if (!root) notFound();

  const available: Format[] = [
    "library",
    ...(SHOW_FORMAT_TOGGLE && books.length > 0 ? (["books"] as const) : []),
  ];
  const active: Format =
    SHOW_FORMAT_TOGGLE && format === "books" && books.length > 0 ? "books" : "library";

  // The resume rail, then the format switch: what sits between the title and
  // the shelf, on either view.
  const lead = (
    <>
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
    </>
  );

  return (
    <PageContainer size="shelf">
      {/* The title is the name of this *screen*, not of the workspace it sits
          in — the app bar and the switcher already say "Resources"; this is
          the answer to "what is this particular page for", the same way the
          nav item that opens it is now named "Student Materials" and not
          "Library". It used to be `root.name`, which said "संसाधन" and left
          the heading of a bottom-nav destination editable in the admin.

          Drawn by the shelf, which knows the count that sits behind its `i`;
          the books view has no count to add, so it draws its own. */}
      {active === "books" && (
        <>
          <PageTitle shelf title={TITLE} description={DESCRIPTION} />
          {lead}
        </>
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
          title={TITLE}
          description={DESCRIPTION}
          lead={lead}
          state={state}
          topics={topics}
          shelves={shelves}
          basePath="/resources"
          searchScope="Student Materials"
          photoStrip={false}
          emptyTitle="Resources are on their way"
          emptyHint="The library is being filled folder by folder; material appears here as it is published."
        />
      )}
    </PageContainer>
  );
}
