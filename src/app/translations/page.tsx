import type { Metadata } from "next";
import { BookCard, EmptyState, PageContainer, SectionHeading } from "@/components/ui";
import { getBooks } from "@/lib/api";
import type { BookSummary } from "@/lib/types";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Translations · अनुवाद",
  description: "English translations of A. Nagrajji's works.",
};

export default async function TranslationsHome() {
  // section code === workspace id (contract §10)
  const books = await getBooks("translations").catch(() => [] as BookSummary[]);

  return (
    <PageContainer>
      <h1 className="text-xl font-bold">Translations · अनुवाद</h1>
      <p className="mt-1 text-sm text-ink-soft">
        English translations, read in the same reader.
      </p>

      <SectionHeading>Books</SectionHeading>
      {books.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {books.map((b) => (
            <BookCard key={b.code} book={b} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Translations are on their way"
          hint="Published translations will appear here."
        />
      )}
    </PageContainer>
  );
}
