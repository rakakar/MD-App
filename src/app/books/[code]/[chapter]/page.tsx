import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Reader } from "@/components/reader/Reader";
import { WorkspaceScope } from "@/components/shell/WorkspaceProvider";
import { ApiError, getBook, getBooks, getChapter } from "@/lib/api";
import { offShelfHref } from "@/lib/routes";
import type { BookDetail, ChapterPayload } from "@/lib/types";
import { contentWorkspace } from "@/lib/workspaceConfig";

export const revalidate = 900;
export const dynamicParams = true;

// Pre-render every chapter of every book (SSG/ISR — PRD §4)
export async function generateStaticParams() {
  const books = await getBooks().catch(() => []);
  const params: { code: string; chapter: string }[] = [];
  for (const b of books.slice(0, 30)) {
    const detail = await getBook(b.code).catch(() => null);
    if (!detail) continue;
    for (const ch of detail.chapters) {
      params.push({ code: b.code, chapter: String(ch.number) });
    }
  }
  return params;
}

interface Params {
  code: string;
  chapter: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { code, chapter } = await params;
  try {
    const book = await getBook(decodeURIComponent(code));
    const ch = book.chapters.find((c) => c.number === Number(chapter));
    const title = ch ? `${ch.title_hi} — ${book.title_hi}` : book.title_hi;
    return {
      title,
      description: book.description || undefined,
      alternates: {
        canonical: `/books/${encodeURIComponent(book.code)}/${chapter}`,
      },
      openGraph: {
        title,
        images: book.cover_image ? [book.cover_image] : undefined,
      },
    };
  } catch {
    return { title: "Reader" };
  }
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { code: rawCode, chapter: rawChapter } = await params;
  const code = decodeURIComponent(rawCode);
  const chapterNumber = Number(rawChapter);
  if (!Number.isInteger(chapterNumber)) notFound();

  // Both requests at once. They do not depend on each other — the chapter's
  // address is already in the URL — and asked one after the other they cost
  // two round trips to the BE (~0.65s each) on every ISR render, which is
  // the first reader of a chapter and every regeneration after it. The
  // chapter's own failure is held until the book is known to exist, so a
  // missing book still 404s for the right reason.
  const [bookResult, chapterResult] = await Promise.allSettled([
    getBook(code),
    getChapter(code, chapterNumber),
  ]);

  let book: BookDetail;
  if (bookResult.status === "fulfilled") {
    book = bookResult.value;
  } else {
    const e = bookResult.reason;
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  // A compilation is read in the library, labelled, with its pages one tap
  // away — never here as though it were a work in its own right. See
  // `offShelfHref`; the 404 is the case where its source file is gone, which
  // leaves it no honest home to be sent to.
  if (book.role === "compilation") {
    const away = offShelfHref(book, chapterNumber);
    if (!away) notFound();
    redirect(away);
  }

  // fail-soft: if the chapter fetch fails (BE hiccup), the client Reader
  // falls back to the IndexedDB copy — offline reading path (PRD §5)
  let chapter: ChapterPayload | null = null;
  if (chapterResult.status === "fulfilled") {
    chapter = withoutPlainRich(chapterResult.value);
  } else {
    const e = chapterResult.reason;
    if (e instanceof ApiError && e.status === 404) notFound();
  }

  const ws = contentWorkspace(book.workspace);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Chapter",
    name: chapter?.title_hi,
    position: chapter?.number,
    inLanguage: ws === "translations" ? "en" : "hi",
    isPartOf: {
      "@type": "Book",
      name: book.title_hi,
      author: { "@type": "Person", name: book.author },
    },
  };

  return (
    <>
      <WorkspaceScope ws={ws} />
      {chapter && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <Reader
        book={{
          code: book.code,
          title_hi: book.title_hi,
          book_type: book.book_type,
          cover_image: book.cover_image,
          page_count: book.page_count,
          chapters: book.chapters,
          translation_of: book.translation_of,
        }}
        initialChapterNumber={chapterNumber}
        initialChapter={chapter}
      />
    </>
  );
}

/**
 * The chapter as the page sends it to the reader: `text_rich` only where it
 * carries formatting.
 *
 * The BE sends both fields on every paragraph, and on almost every paragraph
 * they are the same words — `text_rich` differs only where the printed book
 * had bold or italic. The reader ignores a `text_rich` with no `<b>`/`<i>`
 * (see `formatRuns`) and treats a missing one the same way, so the identical
 * copies were dead weight, and heavy: everything passed to the reader is
 * serialized into the page a second time, after the HTML, and on MVD ch. 4
 * the duplicate text was ~120 KB of the ~600 KB page.
 */
function withoutPlainRich(chapter: ChapterPayload): ChapterPayload {
  return {
    ...chapter,
    paragraphs: chapter.paragraphs.map((p) => {
      if (!p.text_rich || p.text_rich.includes("<b>") || p.text_rich.includes("<i>")) return p;
      const rest = { ...p };
      delete rest.text_rich;
      return rest;
    }),
  };
}
