"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BreadcrumbLine } from "@/components/library/NodeCard";
import { FileCover } from "@/components/library/FileCover";
import { formatBytes } from "@/components/library/format";
import {
  DocumentIcon,
  DownloadIcon,
  WaveformIcon,
} from "@/components/shell/icons";
import { parseRef } from "@/lib/refs";
import { documentHref, documentTextHref } from "@/lib/routes";
import { contentLang } from "@/lib/script";
import { getLocalProgress, getPdfPlace } from "@/lib/storage";
import type { LibraryFile, LocatedFile, ReadingEdition } from "@/lib/types";

/**
 * A document that also reads as text, drawn as the thing it has become.
 *
 * **Why this is a second card rather than a badge on the first.** A PDF is an
 * object — pages, megabytes, a viewer. Once its text is through the pipeline
 * the same file is also a work: chapters, reflow, a place you left off, a
 * recording, notes. Those are not two states of one thing, they are two
 * things, and the previous version drew them identically with a small chip
 * bolted on. A reader scanning ten identical rows does not find a chip; they
 * find ten PDFs and skip the folder, which is precisely the behaviour the
 * whole programme exists to change (Compilations.md §1).
 *
 * So the two species differ in the five ways a reader actually reads a row, in
 * order of how fast each one lands: the cover, the pill, the facts line's
 * *vocabulary* — "7 chapters · reflows, font size, dark" against "PDF · 211
 * pages · 14 MB", one describing an experience and the other an object — where
 * the tap goes, and what the quiet row at the bottom holds.
 *
 * **The tap opens the text.** This reverses what this card did a week ago, and
 * the reversal is the point: §12's principle is that the fixed original stays
 * the truth and the text is derived from it — a statement about the model, not
 * about which button is larger. Kept as the second option, the better reading
 * went to the readers who needed it least, because a reader who has learned
 * that "PDF" means pinching at a page that will not reflow does not tap twice
 * to find out otherwise. The original pages stay one tap away, always, in the
 * row below and again in the reader's own header.
 *
 * **"Text edition", never "compilation".** `संकलन` is already spoken for on
 * this very screen as a provenance — whose word this is — and two meanings of
 * one word on one card is worse than either. And half of what is coming is
 * संवाद and सत्संग: they have editions, they are not books.
 */

/** Matches the tint a PDF gets everywhere else, so one document looks like itself. */
const TINT = { bg: "#E7E4F1", ink: "#4C4878" };

/**
 * Where this document was left, whichever way it was being read.
 *
 * **One row, so one place.** A file with a text edition draws only this card —
 * `PdfCard` hands over to it — so the pages place had nowhere to appear on
 * this screen at all, and a reader who came in through "Original pages" saw a
 * row that claimed to remember nothing. Both are read here and the later one
 * wins, which is the rule `ContinueDocument` settled for the rail above; the
 * two surfaces describing one file must not disagree about where it is.
 *
 * **Stated in pages either way**, as the document row beside it does and as
 * Home has always done for a book in the reflowable reader. The two modes
 * share a page axis — the text is pipelined from this very file — so the page
 * is a fact about the document rather than about one rendering of it.
 */
interface Place {
  mode: "pages" | "text";
  page: number;
  pageCount: number;
  /** text mode only, and only where there is more than one to name */
  chapter?: number;
}

function savedPlace(
  file: LibraryFile | LocatedFile,
  code: string
): { winner: Place | null; pages: number | null } {
  const pages = getPdfPlace(`library-file:${file.id}`);
  const text = getLocalProgress(code);
  const found: (Place & { updatedAt: string })[] = [];

  // Page one is where a document opens anyway; "resume" for it is a promise
  // about nothing. The same floor on both, so neither can win by being noisier.
  if (pages && pages.page > 1) {
    found.push({
      mode: "pages",
      page: pages.page,
      pageCount: pages.page_count || file.page_count || 0,
      updatedAt: pages.updated_at,
    });
  }
  if (text) {
    const page = Number(parseRef(text.canonical_ref)?.page);
    // Front matter numbers its pages in roman, which is not a page this
    // document can be opened at — such a place simply waits.
    if (Number.isSafeInteger(page) && page > 1) {
      found.push({
        mode: "text",
        page,
        pageCount: file.page_count || pages?.page_count || 0,
        chapter: text.chapter_number,
        updatedAt: text.updated_at,
      });
    }
  }

  found.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return { winner: found[0] ?? null, pages: pages && pages.page > 1 ? pages.page : null };
}

export function ReadingCard({
  file,
  reading,
}: {
  file: LibraryFile | LocatedFile;
  /** passed in rather than read off `file` so the branch is decided once, by
      the caller, and this component cannot be rendered for a file that has no
      text edition */
  reading: ReadingEdition;
}) {
  const [place, setPlace] = useState<Place | null>(null);
  /** the pages place on its own, which the way *round* the reader keeps */
  const [pagesAt, setPagesAt] = useState<number | null>(null);

  useEffect(() => {
    const { winner, pages } = savedPlace(file, reading.code);
    setPlace(winner);
    setPagesAt(pages);
    // The primitives it actually reads, not the object holding them: `file` is
    // rebuilt by the folder on every render, and an object dependency in front
    // of a setState would re-run this for ever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id, file.page_count, reading.code]);

  const base = documentHref(file.node, file.id);
  // The text, at the chapter it was left in when it was left in the text at
  // all. A one-chapter edition names no chapter and needs none — the reader's
  // own saved ref is what the reader restores from there.
  const textHref =
    place?.mode === "text" && place.chapter !== undefined && reading.chapter_count > 1
      ? documentTextHref(file.node, file.id, place.chapter)
      : `${base}?text=1`;
  /**
   * **The tap opens the text — until the reader has a later place in the
   * pages.** The rule above is about which reading someone *new* is given, and
   * it stands: a reader who has never opened this still lands in the text. It
   * was never a licence to throw away a place. Somebody forty pages into the
   * scan, tapping the row they were reading yesterday, is asking for page
   * forty, and answering with chapter one of a different rendering of it is
   * not offering them the better reading — it is losing their place and
   * calling it a principle.
   */
  const href =
    place?.mode === "pages" ? documentHref(file.node, file.id, place.page) : textHref;

  const cover = reading.cover_url || file.thumbnail_url;
  const chapters = reading.chapter_count;
  const percent = place
    ? Math.min(100, Math.round((place.page / place.pageCount) * 100))
    : 0;

  const resumeLabel = place ? "Resume reading" : "Start reading";
  const pagesHref = pagesAt === null ? base : documentHref(file.node, file.id, pagesAt);
  const where =
    place && place.pageCount > 0
      ? `Page ${place.page} of ${place.pageCount}`
      : chapters > 0
        ? `${chapters} ${chapters === 1 ? "chapter" : "chapters"}`
        : null;

  return (
    <>
    {/* **Phone** (designer's phone comps, 8 Oct 2026): the pill over the
        title, where the reader is under it, the bar across the card, then
        the one way in filled and the two ways round outlined. */}
    <div className="group relative rounded-2xl border border-rule bg-card p-4 sm:hidden">
      <div className="flex items-center gap-3.5">
        <FileCover
          src={cover}
          title={file.title}
          id={file.id}
          className="h-16 w-12 shrink-0 rounded-md shadow-[0_1px_3px_rgba(0,0,0,.18)]"
        />
        <div className="min-w-0 flex-1">
          <span
            className="inline-block rounded-md px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.04em]"
            style={{ background: TINT.ink, color: "#fff" }}
          >
            Text edition
          </span>
          <Link href={href} className="mt-1 block after:absolute after:inset-0 after:content-['']">
            <span
              {...contentLang(file.title)}
              className={`${contentLang(file.title).className} hi-tight line-clamp-2 block text-[0.9375rem] font-semibold leading-snug`}
            >
              {file.title}
            </span>
          </Link>
          <span className="mt-1 block text-xs tabular-nums text-ink-soft">
            {where && `${where} · `}reflows to your screen
          </span>
        </div>
      </div>
      {place && place.pageCount > 0 && (
        <span className="mt-3.5 block h-1 overflow-hidden rounded-full bg-canvas">
          <span
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${percent}% read`}
            className="block h-full rounded-full"
            style={{ width: `${Math.max(percent, 4)}%`, background: "var(--progress-fill)" }}
          />
        </span>
      )}
      <div className="relative z-10 mt-3.5 flex items-center gap-2">
        <Link
          href={href}
          className="inline-flex h-11 items-center whitespace-nowrap rounded-control px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--ws-color)" }}
        >
          {resumeLabel}
        </Link>
        <Link
          href={pagesHref}
          className="inline-flex h-11 items-center whitespace-nowrap rounded-control border border-rule px-3.5 text-sm font-medium text-ink transition-colors hover:bg-ink/5"
        >
          Original pages
        </Link>
        <a
          href={file.url}
          download
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Download the PDF${formatBytes(file.file_size) ? `, ${formatBytes(file.file_size)}` : ""}`}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-rule text-ink transition-colors hover:bg-ink/5"
        >
          <DownloadIcon className="h-4 w-4" />
        </a>
      </div>
    </div>

    {/*
      **One row from sm up** (designer's comp, 8 Oct 2026): the cover, the
      title with its Text edition pill over where the reader is, then the two
      ways round the reading and the one way into it, as buttons a pointer can
      find.

      The whole card is the text's link — stretched from the title — and the
      buttons sit above it with their own targets.
    */}
    <div className="group relative hidden gap-4 rounded-2xl border border-rule bg-card p-4 transition-shadow hover:shadow-md sm:flex sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        <FileCover
          src={cover}
          title={file.title}
          id={file.id}
          className="h-[5.5rem] w-[4.125rem] shrink-0 rounded-lg shadow-[0_1px_3px_rgba(0,0,0,.18)]"
        />
        <div className="min-w-0 flex-1">
          {"breadcrumb" in file && file.breadcrumb.length > 0 && (
            <BreadcrumbLine steps={file.breadcrumb} />
          )}
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link href={href} className="min-w-0 after:absolute after:inset-0 after:content-['']">
              <span
                {...contentLang(file.title)}
                className={`${contentLang(file.title).className} block truncate text-[0.9375rem] font-semibold leading-snug group-hover:underline`}
              >
                {file.title}
              </span>
            </Link>
            {/* The pill is filled and the document rows have none — a badge
                on both marks neither. */}
            <span
              className="shrink-0 rounded-md px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.04em]"
              style={{ background: TINT.ink, color: "#fff" }}
            >
              Text edition
            </span>
            {reading.has_audio && (
              <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
                <WaveformIcon className="h-3.5 w-3.5" />
                <span>Audio</span>
              </span>
            )}
          </span>

          <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
            {place && place.pageCount > 0 && (
              <span className="block h-1 w-full max-w-60 overflow-hidden rounded-full bg-canvas">
                <span
                  role="progressbar"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${percent}% read`}
                  className="block h-full rounded-full"
                  style={{ width: `${Math.max(percent, 4)}%`, background: "var(--progress-fill)" }}
                />
              </span>
            )}
            <span className="tabular-nums">
              {place && place.pageCount > 0
                ? `Page ${place.page} of ${place.pageCount}`
                : chapters > 0
                  ? `${chapters} ${chapters === 1 ? "chapter" : "chapters"}`
                  : null}
              {(place && place.pageCount > 0) || chapters > 0 ? " · " : ""}
              reflows to your screen
            </span>
          </span>
        </div>
      </div>

      {/* The scanned pages are the original, and a reader must always be able
          to reach them — OCR is sometimes wrong. */}
      <div className="relative z-10 flex shrink-0 items-center gap-1 border-t border-rule pt-3 sm:border-0 sm:pt-0">
        <Link
          href={pagesHref}
          title={`Original pages${file.page_count ? ` — ${file.page_count} pages` : ""}`}
          className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-control px-2.5 text-sm text-ink transition-colors hover:bg-ink/5 sm:px-3"
        >
          <DocumentIcon className="h-4 w-4 text-ink-soft" />
          <span>Original pages</span>
        </Link>
        <a
          href={file.url}
          download
          target="_blank"
          rel="noopener noreferrer"
          title={`Download the PDF${formatBytes(file.file_size) ? ` — ${formatBytes(file.file_size)}` : ""}`}
          className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-control px-2.5 text-sm text-ink transition-colors hover:bg-ink/5 sm:px-3"
        >
          <DownloadIcon className="h-4 w-4 text-ink-soft" />
          {/* the glyph alone on a phone, where three labelled buttons wrap */}
          <span className="sr-only sm:not-sr-only">Download</span>
        </a>
        <Link
          href={href}
          className="ms-auto inline-flex h-10 items-center whitespace-nowrap rounded-control px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:ms-2"
          style={{ background: "var(--ws-color)" }}
        >
          {resumeLabel}
        </Link>
      </div>
    </div>
    </>
  );
}
