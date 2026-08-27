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

  let book: BookDetail;
  try {
    book = await getBook(code);
  } catch (e) {
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
  try {
    chapter = await getChapter(code, chapterNumber);
  } catch (e) {
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
