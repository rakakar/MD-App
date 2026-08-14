"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { FileCover } from "@/components/library/FileCover";
import { getBook, findLibrary } from "@/lib/api";
import { chapterLine } from "@/lib/chapter";
import { EMPTY_FIND } from "@/lib/find";
import { itemIdFromResumeKey, localProgress, syncPersonal } from "@/lib/personal";
import { parseRef } from "@/lib/refs";
import { documentHref, documentTextHref } from "@/lib/routes";
import { contentLang } from "@/lib/script";
import { getPdfPlaces, readingHomeFor } from "@/lib/storage";

/**
 * **Continue reading** — the documents half of the same promise the recordings
 * already kept.
 *
 * A shivir transcript runs to 257 pages and a संवाद to 390. Until the reader
 * could report a page there was nothing to put on a card here, which is why
 * this shelf was the one place in the app a reader came back to and started
 * from the top.
 *
 * **One rail per section, and this is the library's.** Home and Read carry the
 * shelf's books; Audio/Video carries the recordings; this carries the tree's
 * documents — read as pages or as text, both of them library documents and
 * neither of them a book on a shelf. The alternative, a single mixed rail on
 * Home, was considered and dropped: this library holds 199 items against
 * fourteen books, so ten minutes of browsing documents would push a
 * half-finished book of Nagraj ji's off the one strip of the app that exists
 * to lead back to it.
 *
 * **One card per document, whichever way it was read.** A text edition and its
 * pages are two modes of one file, not two things, and until now they wrote
 * into two stores keyed differently — the pages against `library-file:<id>`,
 * the text against a book code — so a reader who used both had the same
 * document waiting for them twice, in two tabs, at two unrelated positions.
 * They are reconciled here rather than in the stores, because the stores are
 * right: a paragraph and a page are different facts and folding them would
 * lose one. What a reader wants is the *later* of the two, in the mode they
 * left it in, and that is a question about presentation.
 *
 * **Drawn from the device first**, exactly as `ContinueReading` and
 * `ContinueAv` are — the places are already in localStorage, so a card is on
 * screen in the first paint rather than after a round trip, and it survives
 * being offline whether or not there is an account behind it. Signing in adds
 * a sync that folds in what was read elsewhere; it does not change where this
 * reads from.
 *
 * A place knows a page and, if this device is the one that opened the file,
 * how many pages there are. It never knows the document's *name* — so that,
 * the folder it lives in and any missing page count come from one library
 * call, the same `library/search/` the shelf itself is built on and usually
 * already cached.
 */

/** A document is not resumed on page one — that is where it opens anyway. */
const MIN_PAGE = 2;

/**
 * Under this many pages, a saved place is noise. "Page 3 of 5" on a letter
 * tells a reader nothing they did not already know, and the library is mostly
 * letters and charts; the documents this row exists for run to hundreds.
 *
 * Deliberately a page count and not a file size. Size decides how a document is
 * *opened* (see `PdfView`); length is what decides whether coming back to it is
 * a thing a person does. The library's single best candidate here is 220 pages
 * and half a megabyte.
 */
const MIN_PAGES = 30;

/** How near the end counts as finished; resuming there is worse than not. */
const DONE_TAIL = 2;

/**
 * A saved place, before the library has said what it belongs to.
 *
 * **Both modes carry a page**, and that is what lets one rule filter them and
 * one bar draw them. A text edition is pipelined from the very file it sits
 * next to, so its paragraphs carry that file's page numbers — `S-A` is 52 PDF
 * pages and a book of 52, its one chapter spanning 1–52. Not the claim D4
 * warns off: a compilation's page 40 is still not page 40 of the original work
 * it selects from, and nothing here says otherwise.
 */
interface Candidate {
  itemId: number;
  mode: "pages" | "text";
  page: number;
  updatedAt: string;
  /** text mode only — where the reader was, in the unit that reader speaks */
  chapter?: number;
  /** text mode only — what `books/{code}/…` takes */
  code?: string;
}

interface ResumeRow extends Candidate {
  title: string;
  /** the folder it lives in — "भाग 3" names nothing alone */
  subtitle: string;
  pageCount: number;
  nodeId: number;
  cover: string | null;
  /** text mode only, and only once the edition's TOC has been read */
  chapterTitle: string | null;
  /** text mode only — one heading over the whole document names no position */
  chapterCount: number;
}

export function ContinueDocument({ limit = 4 }: { limit?: number }) {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<ResumeRow[]>([]);

  const render = useCallback(async () => {
    // The pages a reader turned, and the text they scrolled — gathered
    // separately because they are stored separately, and reconciled below.
    const candidates: Candidate[] = [];

    for (const place of getPdfPlaces()) {
      const itemId = itemIdFromResumeKey(place.key);
      if (itemId === null) continue;
      candidates.push({
        itemId,
        mode: "pages",
        page: place.page,
        updatedAt: place.updated_at,
      });
    }

    for (const p of localProgress()) {
      // A reading home is what says this book is really a library document.
      // Every other row in that store is a book on the shelf and resumes on
      // Home, which is the other half of this same rule.
      const home = readingHomeFor(p.book_code);
      if (!home) continue;
      const page = Number(parseRef(p.canonical_ref)?.page);
      // Front matter numbers its pages in roman ("fm.iii.2"), which is not a
      // page this document can be opened at. Such a row simply waits until the
      // reader is somewhere the two modes can both name.
      if (!Number.isSafeInteger(page) || page < 1) continue;
      candidates.push({
        itemId: home.item,
        mode: "text",
        page,
        updatedAt: p.updated_at,
        chapter: p.chapter_number,
        code: p.book_code,
      });
    }

    if (candidates.length === 0) {
      setRows([]);
      return;
    }

    // One document, one card: the later of the two modes wins it. Sorted
    // newest-first once, so the first candidate seen for an item is its
    // freshest and the rail is already in the order a reader expects.
    candidates.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const best = new Map<number, Candidate>();
    for (const c of candidates) {
      if (!best.has(c.itemId)) best.set(c.itemId, c);
    }

    // One call names every place at once. Asked for unconditionally rather than
    // only for the unnamed ones: a place carries no title even on the device
    // that made it, so unlike a playhead there is never a case this can skip.
    const found = await findLibrary({
      workspace: "originals",
      state: { ...EMPTY_FIND, selection: { kind: ["pdf"] } },
      limit: 100,
    }).catch(() => null);

    const built: ResumeRow[] = [];
    for (const row of found?.results ?? []) {
      if (row.type !== "file" || row.kind !== "pdf") continue;
      const c = best.get(row.id);
      if (!c) continue;

      // The listing's count is the authority — it is the file's own, while a
      // place only knows what some device saw when it last opened it.
      const pageCount = row.page_count ?? 0;
      if (!pageCount || pageCount < MIN_PAGES) continue;
      if (c.page < MIN_PAGE) continue;
      if (c.page >= pageCount - DONE_TAIL) continue;
      // A text place whose edition the library no longer offers is stale —
      // the pipeline output was withdrawn and there is nothing to resume into.
      if (c.mode === "text" && !row.reading) continue;

      built.push({
        ...c,
        title: row.title,
        subtitle: row.breadcrumb.at(-1)?.name ?? "",
        pageCount,
        nodeId: row.node,
        // The edition's own cover where a manager has given it one, else the
        // document's first page. `FileCover` turns a third answer — neither —
        // into a title card rather than the grey icon this shelf started with.
        cover: row.reading?.cover_url || row.thumbnail_url,
        chapterTitle: null,
        chapterCount: row.reading?.chapter_count ?? 0,
      });
    }

    built.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const top = built.slice(0, limit);
    setRows(top);

    // The chapter's name, for the cards that speak in chapters. It lives in the
    // edition's TOC, which the library listing does not carry, so it arrives a
    // beat after the cards do: the card is on screen and tappable first, and
    // gains the name when it comes. A failed call costs nothing but the name.
    const named = await Promise.all(
      top.map(async (r) => {
        if (r.mode !== "text" || !r.code || r.chapterCount <= 1) return r;
        const detail = await getBook(r.code).catch(() => null);
        const entry = detail?.chapters?.find((ch) => ch.number === r.chapter);
        return entry?.title_hi ? { ...r, chapterTitle: entry.title_hi } : r;
      })
    );
    setRows(named);
  }, [limit]);

  useEffect(() => {
    if (loading) return;
    void render();
    // The pull is what brings another device's reading down into the local
    // places; re-rendering after it is what puts it on screen.
    if (user) void syncPersonal().then(render);
  }, [user, loading, render]);

  if (rows.length === 0) return null;

  return (
    <section aria-label="Continue reading" className="mt-5">
      <h2 className="mb-2.5 text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
        Continue reading
      </h2>
      {/* A bleeding, snapping rail, as on the Audio/Video tab: the card wanted
          is nearly always the first, and stacking four would push the
          collections a reader came for off the bottom of a phone. */}
      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scroll-pl-4 sm:mx-0 sm:px-0 sm:scroll-pl-0">
        {rows.map((row) => (
          <li
            key={row.itemId}
            className="w-[15.5rem] shrink-0 snap-start sm:w-[19rem]"
          >
            <ResumeCard row={row} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ResumeCard({ row }: { row: ResumeRow }) {
  const percent = Math.min(100, (row.page / row.pageCount) * 100);
  // Straight into the document at the place it was left, in the mode it was
  // left in — not to the folder holding it. The card's whole promise is that
  // the reader is one tap from where they stopped, and a folder page with the
  // document somewhere down it is two taps and a scroll.
  const href =
    row.mode === "text"
      ? documentTextHref(row.nodeId, row.itemId, row.chapter)
      : documentHref(row.nodeId, row.itemId, row.page);

  return (
    <Link
      href={href}
      className="flex h-full w-full items-start gap-3 rounded-card border border-rule bg-card p-3.5 text-left transition-shadow hover:shadow-md"
    >
      {/* Portrait, and the same silhouette the shelf below uses: these are
          scans of printed pages, and a cover is what tells one document from
          another at arm's length — which a row of identical "PDF" squares
          never did. */}
      <FileCover
        src={row.cover}
        title={row.title}
        id={row.itemId}
        className="h-[3.5rem] w-[2.625rem] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,.18)]"
      />
      <span className="min-w-0 flex-1">
        {row.subtitle && (
          <span
            {...contentLang(row.subtitle)}
            className={`${contentLang(row.subtitle).className} hi-tight block truncate text-sm text-ink-soft`}
          >
            {row.subtitle}
          </span>
        )}
        <span
          {...contentLang(row.title)}
          className={`${contentLang(row.title).className} hi-tight mt-0.5 block truncate text-title font-bold`}
        >
          {row.title}
        </span>
        {/* Where in the text they were, in the unit that reader is actually
            given — the reflowable reader numbers chapters, not pages. Absent
            on a one-chapter edition like `S-A`, where "Chapter 1" is the title
            again and names no position, and absent on the pages, which say
            where they are on the line below. */}
        {row.mode === "text" && row.chapterCount > 1 && row.chapter !== undefined && (
          <span
            lang="hi"
            className="hi mt-0.5 block truncate text-xs font-medium text-ink-soft"
          >
            {chapterLine(String(row.chapter), row.chapterTitle)}
          </span>
        )}
        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-canvas">
          <span
            role="progressbar"
            aria-valuenow={Math.round(percent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${Math.round(percent)}% read`}
            className="block h-full rounded-full"
            style={{
              width: `${Math.round(percent)}%`,
              background: "linear-gradient(90deg, var(--color-accent), var(--ws-color))",
            }}
          />
        </span>
        {/* The printed page, and only that.

            This said a bare percentage for one release, then the page *and* a
            percentage on the right, on the reasoning that Home says both. The
            designer's card says one thing: the page a reader is on, out of the
            pages there are. The bar above it is already the percentage drawn —
            printing the same fact twice, once as a figure and once as a
            length, is what made this card busier than the thing it describes.

            The page is honest on a text edition too: it is pipelined from the
            very file beside it and carries its pages. */}
        <span className="mt-1.5 block truncate text-sm font-medium tabular-nums text-ink-soft">
          Page {row.page} of {row.pageCount}
        </span>
      </span>
    </Link>
  );
}
