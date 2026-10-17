import type { Metadata } from "next";
import { ContinueReading } from "@/components/home/ContinueReading";
import { BookShelf } from "@/components/shelf/BookShelf";
import { WorkspaceScope } from "@/components/shell/WorkspaceProvider";
import { PageContainer } from "@/components/ui";
import { PageTitle } from "@/components/ui/PageTitle";
import { getBooks } from "@/lib/api";
import { contentLang } from "@/lib/script";
import type { BookSummary } from "@/lib/types";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Books",
  description: "Browse published books.",
};

/**
 * The Originals books shelf, filtered by genre.
 *
 * It used to serve Translations and Resources too, through `?ws=`. Those are
 * redirects in next.config.ts now — Translations has its own home with the
 * same language chips, and Resources is a file library with its own folder
 * browser — so this page reads no query string at all. That is what lets it be
 * prerendered: the genre chip is applied in the browser (`ShelfGrid`).
 */
export default async function BooksPage() {
  // The shelf's own summary line (design 1B: "6 books · 760 pages · A. Nagraj").
  // Unfiltered, so it describes the library rather than the current chips.
  const all = await getBooks({ workspace: "originals" }).catch(() => [] as BookSummary[]);
  const pages = all.reduce((n, b) => n + (b.page_count ?? 0), 0);

  return (
    <PageContainer size="shelf">
      <WorkspaceScope ws="originals" />
      {/* "Read", not "Originals" (design 1B): this is the Read tab, the
          workspace is already named in the app bar right above it, and the
          spec puts the shelf's identity in the summary line underneath. */}
      {/* `leading-tight` and a 2px margin under it: the summary line is this
          title's own subtitle, not the next thing on the page, so it sits
          against it. The air goes below the pair instead — see the resume
          rail's own `mt-5`. */}
      {/* "Books" on Originals, matching the tab that opens it. It read "Read"
          because that was the tab's name; the tab is "Books" now and a page
          whose heading disagrees with the control the reader just pressed is
          a page they have to check they arrived at. Translations keeps its
          own name — its tab still reads "Read", and renaming one shelf's is
          not licence to rename another's. */}
      <PageTitle
        shelf
        title="Books"
        meta={
          all.length > 0 && (
            <>
              <span>
                {all.length} {all.length === 1 ? "book" : "books"}
              </span>
              {pages > 0 && ` · ${pages} pages`}
              {" · "}
              <span {...contentLang(all[0].author)}>{all[0].author}</span>
            </>
          )
        }
      />

      {/* Resume rows sit above the shelf (design 1B): someone opening "Read"
          mid-book is far likelier to want the page they left than the grid.
          Originals only — the store keeps one position per book across every
          workspace, so on the Translations shelf these rows would mostly be
          Hindi originals, which is not what that shelf is for. */}
      <ContinueReading limit={3} books={all.length > 0 ? all : undefined} />

      <BookShelf workspace="originals" axis="genre" basePath="/books" />
    </PageContainer>
  );
}
