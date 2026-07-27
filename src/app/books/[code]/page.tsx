import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DownloadButton } from "@/components/reader/DownloadButton";
import { WorkspaceScope } from "@/components/shell/WorkspaceProvider";
import { PageContainer, SectionHeading } from "@/components/ui";
import { ApiError, getBook, getBooks } from "@/lib/api";
import { sectionCode } from "@/lib/types";
import { workspaceForSection } from "@/lib/workspaceConfig";

export const revalidate = 900;
export const dynamicParams = true;

export async function generateStaticParams() {
  const books = await getBooks().catch(() => []);
  return books.map((b) => ({ code: b.code }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  try {
    const book = await getBook(decodeURIComponent(code));
    return {
      title: book.title_hi,
      description: book.description || book.subtitle_hi || undefined,
      alternates: { canonical: `/books/${encodeURIComponent(book.code)}` },
      openGraph: {
        title: book.title_hi,
        description: book.description || undefined,
        images: book.cover_image ? [book.cover_image] : undefined,
      },
    };
  } catch {
    return { title: "Book" };
  }
}

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  let book;
  try {
    book = await getBook(decodeURIComponent(code));
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  const ws = workspaceForSection(sectionCode(book.section));
  const frontMatter = book.chapters.filter((c) => c.is_front_matter);
  const mainChapters = book.chapters.filter((c) => !c.is_front_matter);
  const firstChapter = book.chapters[0];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: book.title_hi,
    author: { "@type": "Person", name: book.author },
    inLanguage: ws === "translations" ? "en" : "hi",
    bookEdition: book.edition || undefined,
    datePublished: book.publication_year ? String(book.publication_year) : undefined,
    description: book.description || undefined,
    image: book.cover_image ?? undefined,
    numberOfPages: book.page_count ?? undefined,
  };

  return (
    <PageContainer>
      <WorkspaceScope ws={ws} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="flex gap-5">
        {book.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.cover_image}
            alt={`Cover of ${book.title_hi}`}
            className="h-40 w-28 shrink-0 rounded-lg object-cover shadow-md"
          />
        ) : (
          <div
            className="flex h-40 w-28 shrink-0 items-center justify-center rounded-lg text-white shadow-md"
            style={{ background: "var(--ws-color)" }}
            aria-hidden
          >
            <span className="hi text-3xl font-bold">{book.title_hi?.[0]}</span>
          </div>
        )}
        <div className="min-w-0">
          <h1 lang="hi" className="hi text-2xl font-bold leading-snug">
            {book.title_hi}
          </h1>
          {book.subtitle_hi && (
            <p lang="hi" className="hi mt-1 text-base text-ink-soft">
              {book.subtitle_hi}
            </p>
          )}
          <p className="mt-2 text-sm text-ink-soft">
            {book.author}
            {book.edition ? ` · ${book.edition}` : ""}
            {book.publication_year ? ` · ${book.publication_year}` : ""}
            {book.page_count ? ` · ${book.page_count} pages` : ""}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {firstChapter && (
              <Link
                href={`/books/${encodeURIComponent(book.code)}/${firstChapter.number}`}
                className="rounded-full px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: "var(--ws-color)" }}
              >
                Start reading
              </Link>
            )}
            <DownloadButton book={book} />
          </div>
        </div>
      </div>

      {book.description && (
        <p lang="hi" className="hi mt-6 text-sm leading-relaxed text-ink-soft">
          {book.description}
        </p>
      )}

      <SectionHeading>विषय-सूची · Contents</SectionHeading>
      <ol className="divide-y divide-rule overflow-hidden rounded-2xl border border-rule bg-white">
        {frontMatter.length > 0 && (
          <li className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
            Front matter
          </li>
        )}
        {[...frontMatter, ...mainChapters].map((ch) => (
          <li key={`${ch.is_front_matter}-${ch.number}`}>
            <Link
              href={`/books/${encodeURIComponent(book.code)}/${ch.number}`}
              className="flex items-baseline gap-3 px-4 py-3 transition-colors hover:bg-black/[.03]"
            >
              <span
                className="w-7 shrink-0 text-right text-sm font-semibold tabular-nums"
                style={{ color: "var(--ws-color)" }}
              >
                {ch.number}
              </span>
              <span lang="hi" className="hi min-w-0 flex-1 text-[15px]">
                {ch.title_hi}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-ink-soft">
                {book.book_type === "print"
                  ? `पृ ${ch.start_page}–${ch.end_page}`
                  : `${ch.start_page}–${ch.end_page}`}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </PageContainer>
  );
}
