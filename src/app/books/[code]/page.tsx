import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookHeroActions } from "@/components/books/BookHeroActions";
import { HighlightsPanel } from "@/components/books/HighlightsPanel";
import { PdfView } from "@/components/library/PdfView";
import { CoverTile } from "@/components/shelf/CoverTile";
import { WorkspaceScope } from "@/components/shell/WorkspaceProvider";
import {
  CollectionHero,
  CountTabs,
  HeroAction,
  ListRow,
  PageContainer,
  RowGroup,
  RowNumber,
  SectionHeading,
  ShareButton,
} from "@/components/ui";
import { ApiError, bookPdfUrl, getBook, getBookGenres, getBooks } from "@/lib/api";
import { offShelfHref } from "@/lib/routes";
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
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { code } = await params;
  // Anything that is not the highlights tab is the chapter list, including a
  // stale or hand-typed value: the chapters are what this page is for, and a
  // bad query string should not be able to show a reader an empty screen.
  const tab = (await searchParams).tab === "highlights" ? "highlights" : "chapters";
  let book;
  try {
    book = await getBook(decodeURIComponent(code));
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  // A compilation has no shelf page — it is a library file that reads well
  // (Compilations.md D5), and this hero, with its genre and its "part of the
  // collection" framing, is the wrong thing to say about somebody's selection.
  if (book.role === "compilation") {
    const away = offShelfHref(book);
    if (!away) notFound();
    redirect(away);
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
      {/* The book's own hero, on the shared CollectionHero (design 1C and the
          finished Book preview). Still the cover's colour rather than the
          workspace accent: the comps draw an orange book on an orange panel and
          a purple album on a purple one, which is the same rule `bookHue`
          already keeps — a hue per thing, so one book feels unlike the next
          when they are otherwise identical rows of Devanagari on one paper. */}
      <CollectionHero
        tone={hue.to}
        back={{ href: "/books", label: "Books" }}
        topRight={<ShareButton title={book.title_hi} />}
        thumb={<CoverTile book={book} size="lg" />}
        title={book.title_hi}
        meta={
          <>
            <span {...contentLang(book.author)}>{book.author}</span>
            {mainChapters.length > 0 && (
              <span>
                {" · "}
                {mainChapters.length} {mainChapters.length === 1 ? "chapter" : "chapters"}
              </span>
            )}
            {book.page_count ? ` · ${book.page_count} pages` : ""}
            {/*
              On a translation the author is still A. Nagraj — the words are
              his, the rendering is not. Naming the translator right under him
              is what keeps the page from crediting him with someone else's
              English.
            */}
            {book.translation_of && book.translator && (
              <span className="mt-1 block">
                Translator: <span className="font-semibold text-white">{book.translator}</span>
                {book.language_label && <span> · {book.language_label}</span>}
              </span>
            )}
          </>
        }
        /* Fact chips (design 1C). Each is a fact the BE actually carries —
           nothing here is decorative, so a missing chip means a missing fact
           rather than a hidden one. PDF-only comes first because it changes
           what this page even is (§13.9): a reader who expects the reflowable
           reader should learn that from the chip, not from its absence. */
        chips={[
          ...(book.is_pdf_only ? ["PDF-only"] : []),
          ...(book.translation_of ? [] : ["Original"]),
          ...(genreChip ? [genreChip] : []),
          ...(book.edition ? [book.edition] : []),
          ...(book.publication_year ? [String(book.publication_year)] : []),
        ]}
        actions={
          book.is_pdf_only ? (
            /*
              A PDF-only book has no chapters to resume into and nothing to
              cache for offline reading, so the whole action row is replaced
              rather than disabled: Resume would point at a chapter that does
              not exist, and the offline download would fetch an empty table of
              contents.
            */
            <div className="flex sm:max-w-sm">
              <HeroAction href="#pdf" tone={hue.to}>
                Read the PDF
              </HeroAction>
            </div>
          ) : (
            <BookHeroActions
              book={book}
              firstChapterHref={
                firstChapter
                  ? `/books/${encodeURIComponent(book.code)}/${firstChapter.number}`
                  : null
              }
            />
          )
        }
      />

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
            <PdfView url={bookPdfUrl(book.code)} title={book.title_hi} />
          </div>
        </section>
      ) : (
        <>
      {/* Chapters and Highlights as two tabs over one panel (the finished
          Book preview), not two places to go. They are two things about the
          same book and the reader moves between them constantly — a highlight
          is read, then followed back into its chapter — so a second route with
          its own hero would have been the same page twice.

          The tab is a real URL so it survives reload and sharing, and the
          counts are on it because "2" is the reason to look. */}
      <div className="mt-7">
        <CountTabs
          label="This book"
          value={tab}
          tabs={[
            {
              value: "chapters",
              label: "Chapters",
              count: mainChapters.length,
              href: `/books/${encodeURIComponent(book.code)}`,
            },
            {
              value: "highlights",
              label: "Highlights & Notes",
              href: `/books/${encodeURIComponent(book.code)}?tab=highlights`,
            },
          ]}
        />
      </div>

      {tab === "highlights" ? (
        <HighlightsPanel bookCode={book.code} chapters={book.chapters} />
      ) : (
        <div className="mt-2">
          {frontMatter.length > 0 && (
            <p className="px-1 pb-1 pt-3 text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
              Front matter
            </p>
          )}
          <RowGroup>
            {[...frontMatter, ...mainChapters].map((ch) => {
              // Span, not range — the row reads "8 pages", which is what a
              // reader is deciding on. The printed range stays available to
              // anyone who needs it via the reader's own page markers.
              const pages = ch.end_page - ch.start_page + 1;
              return (
                <li key={`${ch.is_front_matter}-${ch.number}`}>
                  <ListRow
                    href={`/books/${encodeURIComponent(book.code)}/${ch.number}`}
                    leading={<RowNumber>{ch.number}</RowNumber>}
                    title={ch.title_hi}
                    meta={
                      Number.isFinite(pages) && pages > 0
                        ? `${pages} ${pages === 1 ? "page" : "pages"}`
                        : undefined
                    }
                  />
                </li>
              );
            })}
          </RowGroup>
        </div>
      )}
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
