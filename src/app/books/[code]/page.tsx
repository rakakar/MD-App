import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookHeroActions } from "@/components/books/BookHeroActions";
import { PdfView } from "@/components/library/PdfView";
import { CoverTile } from "@/components/shelf/CoverTile";
import { BackIcon, ChevronRight } from "@/components/shell/icons";
import { WorkspaceScope } from "@/components/shell/WorkspaceProvider";
import { PageContainer, SectionHeading } from "@/components/ui";
import { ApiError, bookPdfUrl, getBook, getBookGenres, getBooks } from "@/lib/api";
import { bookHue } from "@/lib/bookHue";
import { genreLabel } from "@/lib/labels";
import { contentLang } from "@/lib/script";
import { contentWorkspace } from "@/lib/workspaceConfig";

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

  const ws = contentWorkspace(book.workspace);
  // the same hue the cover carries everywhere else, so the hero reads as this
  // book's surface rather than as a second colour it happens to be sitting on
  const hue = bookHue(book.code);

  // `genre` arrives as a code ("parichay"); the chip has to read as a name.
  // The genres list is still consulted so a genre added after we shipped shows
  // its English name rather than nothing; a failed fetch drops the chip rather
  // than printing the slug.
  const genreChip = book.genre
    ? await getBookGenres()
        .then((gs) => {
          const g = gs.find((row) => row.code === book.genre);
          return g ? genreLabel(g.code, g.name) : null;
        })
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
    <PageContainer size="shelf">
      <WorkspaceScope ws={ws} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/*
        One column on a phone, the spec's two from lg (1C desktop): the hero
        becomes a fixed 340px rail and the chapter list becomes the page's main
        content. Stacked at this width the hero would be a 1088px band with a
        book's worth of empty colour in it, and the chapters — the thing anyone
        came here to choose from — would start below the fold.
      */}
      <div className="lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start lg:gap-8">
      {/* Cover-tinted hero (design 1C): a full-bleed panel in the book's own
          colour, carrying everything needed to decide where to enter — then
          the page returns to plain paper for the chapter list.

          Full-bleed and dark, not a wash: the hero is the book's own surface,
          which is what makes one book feel unlike the next when they are
          otherwise identical rows of Devanagari on the same paper. */}
      <div
        // Full-bleed on a phone, where the hero *is* the top of the screen; a
        // rounded panel from sm up, where a band running the full width of a
        // desktop window would read as a site header rather than as this book.
        className="-mx-4 -mt-5 px-4 pb-5 pt-4 sm:mx-0 sm:mt-0 sm:rounded-3xl sm:p-6"
        style={{
          background: `linear-gradient(165deg, ${hue.from}, ${hue.to} 70%, color-mix(in srgb, ${hue.to} 82%, #000))`,
        }}
      >
        <Link
          href="/books"
          aria-label="Back to shelf"
          className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <BackIcon />
        </Link>

        <div className="flex items-end gap-4">
          <CoverTile book={book} size="lg" />
          <div className="min-w-0 flex-1 pb-1">
            <h1 lang="hi" className="hi text-[1.3125rem] font-semibold leading-tight text-white">
              {book.title_hi}
            </h1>
            {book.subtitle_hi && (
              <p lang="hi" className="hi mt-1 text-sm text-white/75">
                {book.subtitle_hi}
              </p>
            )}
            <p className="mt-2 text-xs font-medium text-white/75">
              <span {...contentLang(book.author)}>{book.author}</span>
              {mainChapters.length > 0 && (
                <span>
                  {" · "}
                  {mainChapters.length} {mainChapters.length === 1 ? "chapter" : "chapters"}
                </span>
              )}
              {book.page_count ? ` · ${book.page_count} pages` : ""}
            </p>
            {/*
              On a translation the author is still A. Nagraj — the words are
              his, the rendering is not. Naming the translator right under him,
              in the same weight, is what keeps the page from crediting him
              with someone else's English.
            */}
            {book.translation_of && book.translator && (
              <p className="mt-1 text-xs text-white/75">
                Translator:{" "}
                <span className="font-semibold text-white">{book.translator}</span>
                {book.language_label && <span> · {book.language_label}</span>}
              </p>
            )}

            {/* Fact chips (design 1C). Each is a fact the BE actually carries —
                nothing here is decorative, so a missing chip means a missing
                fact rather than a hidden one. */}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {/* First, because it changes what this page even is. A PDF-only
                  book has arrived before the pipeline did (§13.9): a reader
                  who expects the reflowable reader here should learn that from
                  the chip, not from its absence. */}
              {book.is_pdf_only && <Chip>PDF-only</Chip>}
              {!book.translation_of && (
                <Chip>Original</Chip>
              )}
              {genreChip && (
                <Chip>{genreChip}</Chip>
              )}
              {book.edition && <Chip>{book.edition}</Chip>}
              {book.publication_year && <Chip>{book.publication_year}</Chip>}
            </div>
          </div>
        </div>

        {/*
          A PDF-only book has no chapters to resume into and nothing to cache
          for offline reading, so the whole action row is replaced rather than
          disabled: Resume would point at a chapter that does not exist, and
          the offline download would fetch an empty table of contents.
        */}
        {book.is_pdf_only ? (
          <a
            href="#pdf"
            className="mt-4 flex items-center justify-center rounded-xl bg-card px-4 py-3 text-sm font-semibold sm:max-w-sm"
            style={{ color: hue.to }}
          >
            Read the PDF
          </a>
        ) : (
          <BookHeroActions
            book={book}
            firstChapterHref={
              firstChapter
                ? `/books/${encodeURIComponent(book.code)}/${firstChapter.number}`
                : null
            }
          />
        )}
      </div>

      {/* In two columns this column starts at the top, so whatever happens to
          be first in it drops its stacked-layout top margin. */}
      <div className="min-w-0 lg:[&>*:first-child]:mt-0">
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
        <p className="mt-6 rounded-2xl border border-rule bg-card p-4 text-sm">
          <span className="text-ink-soft">This is a translation ·</span>{" "}
          <Link
            href={`/books/${encodeURIComponent(book.translation_of)}`}
            className="font-semibold underline underline-offset-2"
            style={{ color: "var(--ws-ink)" }}
          >
            See the original book
          </Link>
        </p>
      )}

      {book.translations.length > 0 && (
        <>
          <SectionHeading>Translations of this book</SectionHeading>
          <ul className="divide-y divide-rule overflow-hidden rounded-2xl border border-rule bg-card">
            {book.translations.map((t) => (
              <li key={t.code}>
                <Link
                  href={`/books/${encodeURIComponent(t.code)}`}
                  className="flex flex-col gap-0.5 px-4 py-3 transition-colors hover:bg-ink/[.03]"
                >
                  <span className="flex items-baseline gap-2">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "var(--ws-ink)" }}
                    >
                      {t.language_label}
                    </span>
                    <span
                      {...contentLang(t.title_hi)}
                      className={`${contentLang(t.title_hi).className} min-w-0 flex-1 truncate text-sm`}
                    >
                      {t.title_hi}
                    </span>
                  </span>
                  {t.translator && (
                    <span className="text-xs text-ink-soft">
                      Translator: {t.translator}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {/*
        The whole reading experience for a PDF-only book (contract §13.9).
        Stated plainly rather than left to be discovered: there is no
        reflowable reader, no citation, no read-aloud here yet — and "yet" is
        the operative word, because the flag flips off by itself when the book
        is pipelined and this very URL becomes the full reader. Nobody's link
        or bookmark breaks on that day.
      */}
      {book.is_pdf_only ? (
        <section id="pdf" className="mt-7 scroll-mt-4">
          <p className="rounded-2xl border border-rule bg-card p-4 text-sm text-ink-soft">
            <span className="font-semibold text-ink">
              This book is currently available as a PDF.
            </span>{" "}
            The scanned book is readable and downloadable here. Chapter-by-chapter reading,
            citations and read-aloud arrive when it goes through the pipeline — this page
            becomes the full reader then, and every link to it keeps working.
          </p>
          <div className="mt-3">
            <PdfView url={bookPdfUrl(book.code)} title={book.title_hi} expanded />
          </div>
        </section>
      ) : (
        <>
      {/* The chapter list with its own count (design 1C). A plain list on paper,
          not a card: the hero above is the page's one object, and boxing the
          contents made the chapters read as a second, competing one. */}
      <div className="mt-7 flex items-center gap-2.5 border-b border-rule pb-3">
        <h2 className="text-sm font-semibold">Chapters</h2>
        {mainChapters.length > 0 && (
          <span className="rounded-md bg-canvas px-1.5 py-0.5 text-xs font-semibold tabular-nums text-ink-soft">
            {mainChapters.length}
          </span>
        )}
      </div>
      <ol className="pt-1">
        {frontMatter.length > 0 && (
          <li className="px-3.5 pt-2 pb-1 text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
            Front matter
          </li>
        )}
        {[...frontMatter, ...mainChapters].map((ch, i) => {
          // Span, not range — the spec's row reads "8 pages", which is what a
          // reader is deciding on. The printed range stays available to anyone
          // who needs it via the reader's own page markers.
          const pages = ch.end_page - ch.start_page + 1;
          return (
            <li key={`${ch.is_front_matter}-${ch.number}`}>
              {/* Hairline inset past the number chip (spec 1C), so the rule
                  separates the titles and the numbers read as one column. */}
              {i > 0 && <div aria-hidden className="ms-14 h-px bg-rule" />}
              <Link
                href={`/books/${encodeURIComponent(book.code)}/${ch.number}`}
                className="flex items-center gap-3 rounded-[14px] px-3.5 py-3 transition-colors hover:bg-ink/[.04]"
              >
                <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-canvas text-xs font-bold tabular-nums text-ink-soft">
                  {ch.number}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    lang="hi"
                    className="hi block truncate text-sm font-medium leading-snug"
                  >
                    {ch.title_hi}
                  </span>
                  {Number.isFinite(pages) && pages > 0 && (
                    <span className="mt-0.5 block text-xs font-medium text-ink-soft">
                      {pages} {pages === 1 ? "page" : "pages"}
                    </span>
                  )}
                </span>
                <span aria-hidden className="shrink-0 text-muted">
                  <ChevronRight />
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
        </>
      )}
      </div>
      </div>
    </PageContainer>
  );
}

/** A fact chip on the tinted hero (design 1C) — translucent white, not paper. */
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-[7px] bg-white/15 px-2 py-0.5 text-xs font-semibold text-white/90">
      {children}
    </span>
  );
}
