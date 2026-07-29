import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BookShelf } from "@/components/shelf/BookShelf";
import { WorkspaceScope } from "@/components/shell/WorkspaceProvider";
import { PageContainer } from "@/components/ui";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Books · ग्रंथ",
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

  return (
    <PageContainer>
      <WorkspaceScope ws={isTranslations ? "translations" : "originals"} />
      <h1 className="text-xl font-bold">
        {isTranslations ? "Translations · अनुवाद" : "Originals · मूल ग्रंथ"}
      </h1>

      <BookShelf
        section={isTranslations ? "translations" : "originals"}
        axis={isTranslations ? "language" : "genre"}
        basePath="/books"
        carry={isTranslations ? { ws: "translations" } : {}}
        selected={isTranslations ? language : genre}
      />
    </PageContainer>
  );
}
