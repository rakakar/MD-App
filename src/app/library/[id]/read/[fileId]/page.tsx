import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PdfScreen } from "@/components/library/PdfScreen";
import { Reader } from "@/components/reader/Reader";
import { ApiError, getBook, getChapter, getNode } from "@/lib/api";
import { documentHref, documentTextHref } from "@/lib/routes";
import type { LibraryFile } from "@/lib/types";

export const revalidate = 900;
export const dynamicParams = true;

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * The file, found through the folder that holds it.
 *
 * There is no endpoint for a single file (§13.1) — a file is only ever
 * returned as part of its folder — so the folder is the address and the id is
 * the row within it. That is also why the URL carries both: it makes Back a
 * fact rather than a guess, and it inherits the publish rule for free, since a
 * folder that goes unpublished takes its files' URLs down with it.
 *
 * Cross-posted files count. A `linked_item` opens and reads in place exactly
 * like a native one (§13.6), and a reader who reached it through the folder it
 * was borrowed into should be able to read it there.
 */
async function load(
  rawId: string,
  rawFileId: string
): Promise<{ file: LibraryFile; nodeId: number; nodeName: string } | null> {
  const id = parseId(rawId);
  const fileId = parseId(rawFileId);
  if (id === null || fileId === null) return null;

  let node;
  try {
    node = await getNode(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }

  const file = [...node.items, ...node.linked_items].find((f) => f.id === fileId);
  // Anything but a PDF has no reader to open it in — a recording plays in its
  // folder, a photograph opens in the gallery there.
  if (!file || file.kind !== "pdf") return null;
  return { file, nodeId: node.id, nodeName: node.name };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; fileId: string }>;
}): Promise<Metadata> {
  const { id, fileId } = await params;
  const found = await load(id, fileId).catch(() => null);
  if (!found) return { title: "Document" };
  return {
    title: `${found.file.title} · ${found.nodeName}`,
    description: found.file.description || undefined,
    alternates: { canonical: `/library/${found.nodeId}/read/${found.file.id}` },
    // A reading screen is not a landing page — it is one file of a folder that
    // has its own, and two competing entries for the same document help nobody.
    robots: { index: false, follow: true },
  };
}

const one = (raw: string | string[] | undefined): string | undefined =>
  Array.isArray(raw) ? raw[0] : raw;

/**
 * One document, on the whole screen — as pages, or as text.
 *
 * `AppShell` drops the header and the bottom nav here, matched by
 * `PDF_READER_ROUTE` — see `lib/routes.ts` for why that is the rule rather
 * than a boxed viewer inside the library page.
 *
 * **Both modes are this one route** (Compilations.md §9). `?text=1` is not a
 * different screen; it is the same file, read the other way, and keeping the
 * path identical is what keeps the document — not the book behind it — the
 * thing the reader is in. It also means the mode survives a reload and a
 * shared link, and that the way back to the pages is the URL minus a
 * parameter.
 *
 * The toggle appears only where `reading` says there is text to toggle to,
 * which is the BE's answer and not a guess from the `S-` code convention. A
 * `?text=1` on a file that has none simply reads as pages — there is nothing
 * to fail at, and nothing to 404.
 */
export default async function PdfReadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; fileId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id, fileId }, rawParams] = await Promise.all([params, searchParams]);

  const found = await load(id, fileId);
  if (!found) notFound();

  const code = found.file.reading?.code ?? null;
  if (code && one(rawParams.text) === "1") {
    const chapter = Number(one(rawParams.ch));
    return (
      <CompilationText
        code={code}
        chapter={Number.isSafeInteger(chapter) && chapter > 0 ? chapter : null}
        node={found.nodeId}
        item={found.file.id}
        folderName={found.nodeName}
      />
    );
  }

  // `?page=` from a resume card. Read on the server and handed down: this
  // route prerenders, and a client component calling `useSearchParams` under a
  // prerendered tree builds in dev and fails in production.
  const page = Number(one(rawParams.page));
  const openAt = Number.isSafeInteger(page) && page > 0 ? page : null;

  return (
    <PdfScreen
      file={found.file}
      backHref={`/library/${found.nodeId}`}
      openAt={openAt}
      textHref={code ? documentTextHref(found.nodeId, found.file.id) : undefined}
    />
  );
}

/**
 * The compilation's text, in the reader every other book already uses.
 *
 * There is deliberately **no second reader here**. `Reader` is 1500 lines of
 * paragraph rendering, definition overlays, notes, bookmarks, resume, TTS and
 * page/scroll modes, all of which a compilation is entitled to and none of
 * which is worth building twice — the same argument D2 makes on the BE for not
 * forking `Paragraph`. What it is told is only where it is (`home`), because
 * that is the one thing genuinely different about reading here.
 *
 * Falls back to the pages when the book cannot be fetched. A compilation is a
 * derived convenience and the PDF is the real object (§12): if the derived half
 * is unreachable, the reader should get the document, not an error about it.
 */
async function CompilationText({
  code,
  chapter,
  node,
  item,
  folderName,
}: {
  code: string;
  chapter: number | null;
  node: number;
  item: number;
  folderName: string;
}) {
  const book = await getBook(code).catch(() => null);
  if (!book || book.chapters.length === 0) {
    redirect(documentHref(node, item));
  }

  const number = chapter ?? book.chapters[0].number;
  const payload = await getChapter(code, number).catch(() => null);

  return (
    <Reader
      book={{
        code: book.code,
        title_hi: book.title_hi,
        book_type: book.book_type,
        cover_image: book.cover_image,
        chapters: book.chapters,
      }}
      initialChapterNumber={number}
      initialChapter={payload}
      home={{
        at: { node, item },
        // The folder, not the book. A reader who came in through the library
        // is in the library, and the book behind this text has no shelf page
        // of its own to go back to.
        backHref: `/library/${node}`,
        backLabel: `Back to ${folderName}`,
        // See `ReaderHome.note` — never the word "संकलन", which this very
        // library already uses for a provenance.
        note: "Text edition",
      }}
    />
  );
}
