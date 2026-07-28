import type { Metadata } from "next";
import Link from "next/link";
import { BookCard, EmptyState, PageContainer, SectionHeading } from "@/components/ui";
import { getBooks } from "@/lib/api";
import type { BookSummary } from "@/lib/types";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Resources · संसाधन",
  description: "Shivir notes, PPTs, Shodh Patra, Yojana and education materials.",
};

export default async function ResourcesHome() {
  // section code === workspace id (contract §10); students' and community
  // material both live in this one section now.
  const books = await getBooks("resources").catch(() => [] as BookSummary[]);

  return (
    <PageContainer>
      <h1 className="text-xl font-bold">Resources · संसाधन</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Shivir notes, presentations, Shodh Patra, Yojana &amp; education materials.
      </p>

      <SectionHeading
        action={
          <Link
            href="/books?ws=resources"
            className="text-xs font-medium"
            style={{ color: "var(--ws-ink)" }}
          >
            Browse all →
          </Link>
        }
      >
        Materials
      </SectionHeading>
      {books.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {books.map((b) => (
            <BookCard key={b.code} book={b} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No resources yet"
          hint="Materials will appear here as they are published."
        />
      )}
    </PageContainer>
  );
}
