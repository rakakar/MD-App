import type { Metadata } from "next";
import Link from "next/link";
import { WorkspaceScope } from "@/components/shell/WorkspaceProvider";
import { BookCard, EmptyState, PageContainer } from "@/components/ui";
import { getBooks, getSections } from "@/lib/api";
import type { BookSummary, Section } from "@/lib/types";
import {
  isContentWorkspace,
  workspaceForSection,
  type WorkspaceId,
} from "@/lib/workspaceConfig";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Books · ग्रंथ",
  description: "Browse published books.",
};

interface Search {
  section?: string;
  ws?: string;
}

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { section, ws } = await searchParams;

  const wsId: WorkspaceId | null =
    (ws as WorkspaceId) ??
    (section ? workspaceForSection(section) : null);

  const [allSections, books] = await Promise.all([
    getSections().catch(() => [] as Section[]),
    // a content workspace browses the section that shares its id (contract §10)
    section
      ? getBooks(section).catch(() => [] as BookSummary[])
      : wsId && isContentWorkspace(wsId)
        ? getBooks(wsId).catch(() => [] as BookSummary[])
        : getBooks().catch(() => [] as BookSummary[]),
  ]);

  // filter chips scoped to the active workspace's sections when known
  const chips = wsId
    ? allSections.filter((s) => workspaceForSection(s.code) === wsId)
    : allSections;

  return (
    <PageContainer>
      {wsId && <WorkspaceScope ws={wsId} />}
      <h1 className="text-xl font-bold">Books · ग्रंथ</h1>

      {chips.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by section">
          <Link
            href={wsId ? `/books?ws=${wsId}` : "/books"}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              !section ? "border-transparent text-white" : "border-rule bg-white text-ink"
            }`}
            style={!section ? { background: "var(--ws-color)" } : undefined}
          >
            All
          </Link>
          {chips.map((s) => (
            <Link
              key={s.code}
              href={`/books?section=${encodeURIComponent(s.code)}`}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                section === s.code
                  ? "border-transparent text-white"
                  : "border-rule bg-white text-ink"
              }`}
              style={section === s.code ? { background: "var(--ws-color)" } : undefined}
            >
              {s.name_hi || s.name_en || s.code}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {books.map((b) => (
          <BookCard key={b.code} book={b} />
        ))}
      </div>
      {books.length === 0 && (
        <div className="mt-5">
          <EmptyState
            title="No books here yet"
            hint={section ? `Nothing published under ${section} so far.` : undefined}
          />
        </div>
      )}
    </PageContainer>
  );
}
