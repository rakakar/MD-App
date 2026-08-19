import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BookHeroActions } from "@/components/books/BookHeroActions";
import { BookTabs } from "@/components/books/BookTabs";
import { PdfView } from "@/components/library/PdfView";
import { CoverTile } from "@/components/shelf/CoverTile";
import { WorkspaceScope } from "@/components/shell/WorkspaceProvider";
import {
  CollectionHero,
  HeroAction,
  HeroPill,
  ListRow,
  PageContainer,
  RowGroup,
  RowNumber,
  ShareButton,
} from "@/components/ui";
import { ApiError, bookPdfUrl, getBook, getBookGenres, getBooks } from "@/lib/api";
import { offShelfHref } from "@/lib/routes";
import { bookHue } from "@/lib/bookHue";
import { genreLabel } from "@/lib/labels";
import { contentLang } from "@/lib/script";
import {
  WORKSPACES,
  contentWorkspace,
  libraryTabLabel,
  type ContentWorkspaceId,
} from "@/lib/workspaceConfig";

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

/**
 * Where a book's back pill goes, and what it says.
 *
 * Every workspace sends the reader to the page they could actually have
 * picked this book from, named the way that page names itself — which is
 * three different answers, because the three shelves are three different
 * shapes:
 *
 * - **Originals** keeps the shared Read shelf. That is where a reader chose
 *   this book, and it holds twelve more of the same in one grid.
 * - **Translations** has a Home of its own, and its own workspace name on it.
 * - **Resources** is a file library whose books have no shelf of their own —
 *   `/books?ws=resources` is a 307 to `/resources`, and that page's Books tab
 *   is off (`SHOW_FORMAT_TOGGLE`). So it goes to the library itself, under
 *   the name its own nav gives it: "Student Materials", not "Resources",
 *   because that is the heading the reader lands on.
 *
 * Written as a lookup rather than a ternary chain: the wrong answer here is
 * silent — a pill that reads "Books" and lands the reader on a shelf that has
 * never listed the book they were just holding.
 */
function backLink(ws: ContentWorkspaceId): { href: string; label: string } {
  if (ws === "originals") return { href: "/books", label: "Books" };
  if (ws === "translations") {
    return { href: WORKSPACES.translations.home, label: WORKSPACES.translations.name };
  }
  return { href: WORKSPACES.resources.home, label: libraryTabLabel("resources") };
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

  /**
   * Where "Translations" goes — **the Translations shelf, always**.
   *
   * Not the translation itself, even where there is only one of it. The button
   * is a door into the other workspace rather than a link to one book: a
   * reader who wants this book in English wants the English shelf, where the
   * next one they read is also standing, and where the chrome tells them which
   * workspace they are now in. Opening the single edition directly was one tap
   * shorter and left them somewhere they had not asked to be, with no sense of
   * what else was there.
   *
   * The shelf is `/books?ws=translations` — the same address the Translations
   * workspace's own Read tab points at.
   */
  const translationsHref = book.translations.length > 0 ? "/books?ws=translations" : null;

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
        back={backLink(ws)}
        /* Every way out of this page in one place, as on a collection's hero:
           the other language, and the link to here.

           The two are mutually exclusive and always have been — §12's "no
           chains" means an original may have translations and a translation
           never does — so this row holds at most one of them and the pair
           never competes for the width.

           "See original" was a link in a bordered band under the description,
           which put the one control a reader of a translation reaches for
           below the fold on a phone, behind a sentence telling them something
           the workspace chrome had already said twice. */
        topRight={
          <div className="flex items-center gap-2">
            {translationsHref && <HeroPill href={translationsHref}>Translations</HeroPill>}
            {book.translation_of && (
              <HeroPill href={`/books/${encodeURIComponent(book.translation_of)}`}>
                See original
              </HeroPill>
            )}
            <ShareButton title={book.title_hi} />
          </div>
        }
        thumb={<CoverTile book={book} size="lg" />}
        title={book.title_hi}
        meta={
          <>
            {/* The author gets the line to himself, and the book's dimensions
                get the next one. As one run — "ए. नागराज · 18 chapters · 178
                pages" — a name and two measurements were separated by the same
                dot and read as three facts of one kind. `hi-tight` keeps the
                two lines a line apart rather than a paragraph apart. */}
            <span
              {...contentLang(book.author)}
              className={`${contentLang(book.author).className} hi-tight block`}
            >
              {book.author}
            </span>
            {(mainChapters.length > 0 || book.page_count) && (
              <span className="block">
                {mainChapters.length > 0 &&
                  `${mainChapters.length} ${mainChapters.length === 1 ? "chapter" : "chapters"}`}
                {mainChapters.length > 0 && book.page_count ? " · " : ""}
                {book.page_count ? `${book.page_count} pages` : ""}
              </span>
            )}
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
      <BookTabs
        bookCode={book.code}
        chapters={book.chapters}
        chapterCount={mainChapters.length}
        chaptersHref={`/books/${encodeURIComponent(book.code)}`}
        highlightsHref={`/books/${encodeURIComponent(book.code)}?tab=highlights`}
        tab={tab}
      >
        <div className="mt-2">
          {/* No "Front matter" heading over the first rows. It labelled a group
              of one or two against a list of eighteen, and the rows already say
              what they are — a front-matter row is called "Front-matters" and
              numbered 0. A heading for a section nobody was going to mistake
              cost the list its start. */}
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
      </BookTabs>
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
