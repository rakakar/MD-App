"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BreadcrumbLine } from "@/components/library/NodeCard";
import { FileCover } from "@/components/library/FileCover";
import { formatBytes } from "@/components/library/format";
import {
  ChevronRight,
  DocumentIcon,
  DownloadIcon,
  HeadphonesIcon,
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

  return (
    // `relative` so the primary link can stretch across the card; the quiet
    // links at the bottom lift themselves clear with `z-10`.
    <div className="group relative rounded-2xl border border-rule bg-card p-4 transition-shadow hover:shadow-md">
      {"breadcrumb" in file && file.breadcrumb.length > 0 && (
        <BreadcrumbLine steps={file.breadcrumb} />
      )}

      <div className="flex items-start gap-3.5">
        {/* Portrait, with a spine's worth of shadow: that silhouette is what
            says "book" before a single word is read, and it is the signal that
            survives being scanned at arm's length — which is how a folder of
            ten is actually read. The document card's frame is squarer for the
            same reason, from the other side. */}
        <FileCover
          src={cover}
          title={file.title}
          id={file.id}
          className="h-[5.5rem] w-[4.125rem] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,.18)]"
        />

        <div className="min-w-0 flex-1">
          <Link
            href={href}
            className="after:absolute after:inset-0 after:content-['']"
          >
            <span
              {...contentLang(file.title)}
              className={`${contentLang(file.title).className} block text-[0.9375rem] font-semibold leading-snug group-hover:underline`}
            >
              {file.title}
            </span>
          </Link>

          {/* The pill is filled and the document card has none — asymmetric on
              purpose. A badge on both marks neither; a badge on the better one
              is the whole signal. */}
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className="rounded-full px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.04em]"
              style={{ background: TINT.ink, color: "#fff" }}
            >
              Text edition
            </span>
            {reading.has_audio && (
              <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
                <HeadphonesIcon className="h-3.5 w-3.5" />
                <span>Audio</span>
              </span>
            )}
          </span>

          {/* The vocabulary of an experience, where the document card gives the
              vocabulary of a file — "PDF · 133 pages · 12 MB" against this.
              That contrast is the fastest of the five signals for anyone who
              reads the row rather than scanning it.

              One promise and not three. Font size and theme were in this line
              and took it onto a second row on every phone, which is a real
              cost paid for two settings nobody chooses a document by. Reflow
              is the one that decides whether this is worth opening — it is the
              whole of §1 — and the other two are found in the reader itself
              within seconds of arriving. */}
          <span className="mt-1 block text-xs text-ink-soft">
            {chapters > 0 && (
              <span className="tabular-nums">
                {chapters} {chapters === 1 ? "chapter" : "chapters"} ·{" "}
              </span>
            )}
            reflows to your screen
          </span>

          {file.description && (
            <span
              {...contentLang(file.description)}
              className={`${contentLang(file.description).className} mt-1 block text-xs text-ink-soft`}
            >
              {file.description}
            </span>
          )}
        </div>

        <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5" />
      </div>

      {/* The same bar and the same sentence the document row beside it uses.
          Two rows in one folder, both saying where the reader is, and neither
          of them inventing its own vocabulary for it. */}
      {place && place.pageCount > 0 && (
        <div className="mt-3">
          <span className="block h-1.5 overflow-hidden rounded-full bg-canvas">
            <span
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${percent}% read`}
              className="block h-full rounded-full"
              style={{
                // A floor, so the bar reads as a bar rather than as a stray
                // dot — the exact page is spelled out underneath, so nothing
                // here is doing the lying. Same reasoning as `PdfCard`.
                width: `${Math.max(percent, 4)}%`,
                background: "linear-gradient(90deg, var(--color-accent), var(--ws-color))",
              }}
            />
          </span>
          <span
            className="mt-1.5 block text-xs font-semibold tabular-nums"
            style={{ color: "var(--ws-ink)" }}
          >
            Resume on page {place.page} of {place.pageCount}
          </span>
        </div>
      )}

      {/* Icons without words, unlike the document card's spelled-out row. Both
          of these are ways *round* the reading, and on this card that is a
          smaller thing than it is on a plain PDF — but never a hidden one: the
          scanned pages are the original and a reader must always be able to
          reach them, particularly since OCR is sometimes wrong. */}
      <div className="relative z-10 mt-3 flex items-center gap-3 border-t border-rule pt-2.5">
        <Link
          // At the page they were on there, when there is one. This link is
          // the *only* way the pages place can be reached from this screen —
          // a file with a text edition never draws the document card that
          // would otherwise carry it — so dropping the page here would be
          // quietly throwing it away.
          href={pagesAt === null ? base : documentHref(file.node, file.id, pagesAt)}
          title={`Original pages${file.page_count ? ` — ${file.page_count} pages` : ""}`}
          aria-label="Read the original pages"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-ink-soft transition-colors hover:bg-ink/[.04] hover:text-ink"
        >
          <DocumentIcon className="h-3.5 w-3.5" />
          <span>Original pages</span>
        </Link>
        <a
          href={file.url}
          download
          title={`Download the PDF${formatBytes(file.file_size) ? ` — ${formatBytes(file.file_size)}` : ""}`}
          aria-label="Download the PDF"
          className="inline-flex items-center rounded-lg px-2 py-1 text-ink-soft transition-colors hover:bg-ink/[.04] hover:text-ink"
        >
          <DownloadIcon className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
