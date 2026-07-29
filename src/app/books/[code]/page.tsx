import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DownloadButton } from "@/components/reader/DownloadButton";
import { ResumeButton } from "@/components/reader/ResumeButton";
import { CoverTile } from "@/components/shelf/CoverTile";
import { WorkspaceScope } from "@/components/shell/WorkspaceProvider";
import { PageContainer, SectionHeading } from "@/components/ui";
import { ApiError, getBook, getBookGenres, getBooks } from "@/lib/api";
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

  // `genre` arrives as a code ("parichay"); the chip has to read as a name.
  // A missing genres list just drops the chip rather than printing the slug.
  const genreLabel = book.genre
    ? await getBookGenres()
        .then((gs) => gs.find((g) => g.code === book.genre)?.name_hi ?? null)
        .catch(() => null)
    : null;
  const frontMatter = book.chapters.filter((c) => c.is_front_matter);
  const mainChapters = book.chapters.filter((c) => !c.is_front_matter);
  const firstChapter = book.chapters[0];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: book.title_hi,
    author: { "@type": "Person", name: book.author },
    inLanguage: book.language || "hi",
    translator: book.translator
      ? { "@type": "Person", name: book.translator }
      : undefined,
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

      {/* Cover-tinted hero (design 1C): the workspace hue washes behind the
          cover and title so the book announces itself, then the page returns
          to plain paper for the chapter list. */}
      <div
        className="-mx-4 flex gap-5 px-4 pb-5 pt-1 sm:-mx-6 sm:px-6"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--ws-color) 10%, transparent) 0%, transparent 100%)",
        }}
      >
        <CoverTile book={book} size="lg" />
        <div className="min-w-0">
          <h1 lang="hi" className="hi text-2xl font-bold leading-snug">
            {book.title_hi}
          </h1>
          {book.subtitle_hi && (
            <p lang="hi" className="hi mt-1 text-base text-ink-soft">
              {book.subtitle_hi}
            </p>
          )}
          {/*
            On a translation the author is still ए. नागराज — the words are his,
            the rendering is not. Naming the translator on the same line, in the
            same weight, is what keeps the page from crediting him with someone
            else's English.
          */}
          {book.translation_of && book.translator && (
            <p className="mt-2 text-sm">
              <span lang="hi" className="hi text-ink-soft">अनुवाद:</span>{" "}
              <span className="font-semibold text-ink">{book.translator}</span>
              {book.language_label && (
                <span lang="hi" className="hi text-ink-soft"> · {book.language_label}</span>
              )}
            </p>
          )}
          <p className="mt-2 text-sm text-ink-soft">
            <span lang="hi" className="hi">{book.author}</span>
            {mainChapters.length > 0 && (
              <span lang="hi" className="hi"> · {mainChapters.length} अध्याय</span>
            )}
            {book.page_count ? ` · ${book.page_count} pages` : ""}
          </p>

          {/* Fact chips (design 1C). Each is a fact the BE actually carries —
              nothing here is decorative, so a missing chip means a missing
              fact rather than a hidden one. */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {!book.translation_of && (
              <Chip>
                <span lang="hi" className="hi">मूल ग्रंथ</span>
              </Chip>
            )}
            {genreLabel && (
              <Chip>
                <span lang="hi" className="hi">{genreLabel}</span>
              </Chip>
            )}
            {book.edition && <Chip>{book.edition}</Chip>}
            {book.publication_year && <Chip>{book.publication_year}</Chip>}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ResumeButton
              bookCode={book.code}
              firstChapterHref={
                firstChapter
                  ? `/books/${encodeURIComponent(book.code)}/${firstChapter.number}`
                  : null
              }
            />
            <DownloadButton book={book} />
          </div>
        </div>
      </div>

      {book.description && (
        <p lang="hi" className="hi mt-6 text-sm leading-relaxed text-ink-soft">
          {book.description}
        </p>
      )}

      {/*
        Back to the original — the whole book, never a paragraph. MVD-EN 3.42.5
        is not the same passage as MVD 3.42.5: the printed pages differ, so a
        canonical ref does not survive being carried across languages. The book
        is the largest unit that does.
      */}
      {book.translation_of && (
        <p className="mt-6 rounded-2xl border border-rule bg-white p-4 text-sm">
          <span lang="hi" className="hi text-ink-soft">यह एक अनुवाद है ·</span>{" "}
          <Link
            href={`/books/${encodeURIComponent(book.translation_of)}`}
            className="font-semibold underline underline-offset-2"
            style={{ color: "var(--ws-ink)" }}
          >
            <span lang="hi" className="hi">मूल पुस्तक देखें</span>
          </Link>
        </p>
      )}

      {book.translations.length > 0 && (
        <>
          <SectionHeading>इस पुस्तक के अनुवाद</SectionHeading>
          <ul className="divide-y divide-rule overflow-hidden rounded-2xl border border-rule bg-white">
            {book.translations.map((t) => (
              <li key={t.code}>
                <Link
                  href={`/books/${encodeURIComponent(t.code)}`}
                  className="flex flex-col gap-0.5 px-4 py-3 transition-colors hover:bg-black/[.03]"
                >
                  <span className="flex items-baseline gap-2">
                    <span
                      lang="hi"
                      className="hi text-sm font-semibold"
                      style={{ color: "var(--ws-ink)" }}
                    >
                      {t.language_label}
                    </span>
                    <span lang="hi" className="hi min-w-0 flex-1 truncate text-[15px]">
                      {t.title_hi}
                    </span>
                  </span>
                  {t.translator && (
                    <span className="text-xs text-ink-soft">
                      <span lang="hi" className="hi">अनुवाद:</span> {t.translator}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* अध्याय सूची with its own count (design 1C) */}
      <SectionHeading
        action={
          mainChapters.length > 0 ? (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums text-white"
              style={{ background: "var(--ws-color)" }}
            >
              {mainChapters.length}
            </span>
          ) : undefined
        }
      >
        <span lang="hi" className="hi">अध्याय सूची</span> · Contents
      </SectionHeading>
      <ol className="divide-y divide-rule overflow-hidden rounded-2xl border border-rule bg-white">
        {frontMatter.length > 0 && (
          <li className="px-4 py-2 text-[11px] font-bold uppercase tracking-[0.09em] text-ink-soft">
            Front matter
          </li>
        )}
        {[...frontMatter, ...mainChapters].map((ch) => {
          // Span, not range — the spec's row reads "8 pages", which is what a
          // reader is deciding on. The printed range stays available to anyone
          // who needs it via the reader's own page markers.
          const pages = ch.end_page - ch.start_page + 1;
          return (
            <li key={`${ch.is_front_matter}-${ch.number}`}>
              <Link
                href={`/books/${encodeURIComponent(book.code)}/${ch.number}`}
                className="flex items-baseline gap-3 px-4 py-3.5 transition-colors hover:bg-black/[.03]"
              >
                <span
                  className="w-7 shrink-0 text-right text-sm font-semibold tabular-nums"
                  style={{ color: "var(--ws-ink)" }}
                >
                  {ch.number}
                </span>
                <span lang="hi" className="hi min-w-0 flex-1 text-[15px] font-medium">
                  {ch.title_hi}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-ink-soft">
                  {Number.isFinite(pages) && pages > 0
                    ? `${pages} ${pages === 1 ? "page" : "pages"}`
                    : ""}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </PageContainer>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-rule bg-white px-2.5 py-1 text-[11px] font-medium text-ink-soft">
      {children}
    </span>
  );
}
