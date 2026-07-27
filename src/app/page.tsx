import Link from "next/link";
import { ContinueReading } from "@/components/home/ContinueReading";
import { SutraCard } from "@/components/home/SutraCard";
import { BookCard, EmptyState, PageContainer, SectionHeading } from "@/components/ui";
import { getBooks } from "@/lib/api";
import { ACTIVE_SUTRA_SOURCE } from "@/lib/sutra";
import type { BookSummary, ParaResolution } from "@/lib/types";
import { sectionCodesForWorkspace } from "@/lib/workspaceConfig";

export const revalidate = 900;

async function loadHome(): Promise<{
  books: BookSummary[];
  sutra: ParaResolution | null;
}> {
  const sections = sectionCodesForWorkspace("originals");
  const [books, sutra] = await Promise.all([
    Promise.all(sections.map((s) => getBooks(s).catch(() => [] as BookSummary[]))).then(
      (lists) => lists.flat()
    ),
    ACTIVE_SUTRA_SOURCE.getToday().catch(() => null),
  ]);
  return { books, sutra };
}

export default async function OriginalsHome() {
  const { books, sutra } = await loadHome();

  return (
    <PageContainer>
      <h1 className="sr-only">Originals — मूल ग्रंथ</h1>

      {sutra && <SutraCard sutra={sutra} />}

      <ContinueReading />

      <SectionHeading
        action={
          <Link href="/books" className="text-xs font-medium" style={{ color: "var(--ws-color)" }}>
            All books →
          </Link>
        }
      >
        Books · ग्रंथ
      </SectionHeading>
      {books.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {books.slice(0, 6).map((b) => (
            <BookCard key={b.code} book={b} />
          ))}
        </div>
      ) : (
        <EmptyState title="No books available yet" hint="Published books will appear here." />
      )}

      <SectionHeading>Listen &amp; watch</SectionHeading>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/audio"
          className="rounded-2xl border border-rule bg-white p-5 transition-shadow hover:shadow-md"
        >
          <p className="text-base font-semibold">Discourse audio</p>
          <p className="mt-1 text-sm text-ink-soft">
            Recorded discourses and chapter read-aloud.
          </p>
        </Link>
        <Link
          href="/videos"
          className="rounded-2xl border border-rule bg-white p-5 transition-shadow hover:shadow-md"
        >
          <p className="text-base font-semibold">Videos</p>
          <p className="mt-1 text-sm text-ink-soft">Talks and playlists on YouTube.</p>
        </Link>
      </div>
    </PageContainer>
  );
}
