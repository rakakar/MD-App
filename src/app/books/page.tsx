import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ContinueReading } from "@/components/home/ContinueReading";
import { BookShelf } from "@/components/shelf/BookShelf";
import { WorkspaceScope } from "@/components/shell/WorkspaceProvider";
import { PageContainer } from "@/components/ui";
import { getBooks } from "@/lib/api";
import { contentLang } from "@/lib/script";
import type { BookSummary } from "@/lib/types";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Books",
  description: "Browse published books.",
};

interface Search {
  ws?: string;
  /** Originals axis — a book-genres/ code */
  genre?: string;
  /** Translations axis — an ISO 639-1 code */
  language?: string;
}

/**
 * The books shelf. Reached from Originals' "Read" and Translations' "Read".
 *
 * Which axis the chips run on comes from the workspace, not from a shared
 * control: Originals filter by genre, Translations by language. Resources is
 * not a books shelf at all — it is a file library, so it is sent to its own
 * folder browser rather than shown an empty grid.
 */
export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { ws, genre, language } = await searchParams;

  if (ws === "resources") redirect("/resources");

  const isTranslations = ws === "translations";

  // The shelf's own summary line (design 1B: "6 books · 760 pages · A. Nagraj").
  // Unfiltered, so it describes the library rather than the current chips.
  const all = await getBooks({
    workspace: isTranslations ? "translations" : "originals",
  }).catch(() => [] as BookSummary[]);
  const pages = all.reduce((n, b) => n + (b.page_count ?? 0), 0);

  return (
    <PageContainer size="shelf">
      <WorkspaceScope ws={isTranslations ? "translations" : "originals"} />
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
      <h1 className="font-display text-[1.625rem] font-medium leading-tight tracking-[-0.015em] lg:text-4xl">
        {isTranslations ? "Translations" : "Books"}
      </h1>
      {all.length > 0 && (
        <p className="mt-0.5 text-sm text-ink-soft">
          <span>
            {all.length} {all.length === 1 ? "book" : "books"}
          </span>
          {pages > 0 && ` · ${pages} pages`}
          {" · "}
          <span {...contentLang(all[0].author)}>{all[0].author}</span>
        </p>
      )}

      {/* Resume rows sit above the shelf (design 1B): someone opening "Read"
          mid-book is far likelier to want the page they left than the grid.
          Originals only — the store keeps one position per book across every
          workspace, so on the Translations shelf these rows would mostly be
          Hindi originals, which is not what that shelf is for. */}
      {!isTranslations && <ContinueReading limit={3} />}

      <BookShelf
        workspace={isTranslations ? "translations" : "originals"}
        axis={isTranslations ? "language" : "genre"}
        basePath="/books"
        carry={isTranslations ? { ws: "translations" } : {}}
        selected={isTranslations ? language : genre}
      />
    </PageContainer>
  );
}
