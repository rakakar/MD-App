"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BreadcrumbLine } from "@/components/library/NodeCard";
import { ProvenanceBadge } from "@/components/library/ProvenanceBadge";
import { ReadingCard } from "@/components/library/ReadingCard";
import { RowMenu } from "@/components/library/RowMenu";
import { LARGE_BYTES, downloadFiles } from "@/components/library/folderActions";
import { formatBytes } from "@/components/library/format";
import { CheckIcon, DownloadIcon } from "@/components/shell/icons";
import { KindTile } from "@/components/ui/KindTile";
import { contentLang } from "@/lib/script";
import { getPdfPlace } from "@/lib/storage";
import type { LibraryFile, LocatedFile, Provenance } from "@/lib/types";

type File = LibraryFile | LocatedFile;

/**
 * **A folder's PDFs** (designer's comps, 8 Oct 2026): the ones with a text
 * edition as reading cards first, then the rest as one ruled list a reader can
 * pick from.
 *
 * Each row is one line — a checkbox, the first page in its file tile, the title, pages, size,
 * download and ⋯ — and ticking rows raises a bar with what they come to and
 * one Download for all of them. Large files say so before a byte moves.
 */
export function PdfRows({
  files,
  folderProvenance,
}: {
  files: File[];
  folderProvenance?: Provenance;
}) {
  const reading = files.filter((f) => f.reading);
  const plain = files.filter((f) => !f.reading);
  const [picked, setPicked] = useState<Set<number>>(new Set());

  // A file that left the list (the folder search narrowed it away) is not
  // still quietly picked.
  const chosen = useMemo(() => plain.filter((f) => picked.has(f.id)), [plain, picked]);
  const bytes = chosen.reduce((n, f) => n + (f.file_size ?? 0), 0);

  const toggle = (id: number) =>
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      {reading.length > 0 && (
        <ul className="flex flex-col gap-3">
          {reading.map((f) => (
            <li key={f.id}>
              <ReadingCard file={f} reading={f.reading!} />
            </li>
          ))}
        </ul>
      )}

      {plain.length > 0 && (
        <>
          {chosen.length > 0 && (
            <div
              role="toolbar"
              aria-label="Selected files"
              className={`${reading.length > 0 ? "mt-5" : ""} mb-3 inline-flex items-center gap-1 rounded-control bg-ink p-1 ps-3.5 text-sm text-card`}
            >
              <span className="me-2 tabular-nums">{chosen.length} selected</span>
              <button
                type="button"
                onClick={() => downloadFiles(chosen)}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-card/15 px-3 font-semibold transition-colors hover:bg-card/25"
              >
                <DownloadIcon className="h-4 w-4" />
                Download
                {bytes > 0 && <span className="tabular-nums opacity-80">{formatBytes(bytes)}</span>}
              </button>
              <button
                type="button"
                onClick={() => setPicked(new Set())}
                className="h-8 rounded-md px-3 font-medium opacity-80 transition-opacity hover:opacity-100"
              >
                Clear
              </button>
            </div>
          )}
          {/* Not `overflow-hidden`, which clipped the last rows' ⋯ menus; the
              end rows round their own fill instead. */}
          <ul
            className={`${reading.length > 0 && chosen.length === 0 ? "mt-5" : ""} divide-y divide-rule rounded-2xl border border-rule bg-card [&>li:first-child>*]:rounded-t-2xl [&>li:last-child>*]:rounded-b-2xl`}
          >
            {plain.map((f) => (
              <li key={f.id}>
                <PdfRow
                  file={f}
                  picked={picked.has(f.id)}
                  onPick={() => toggle(f.id)}
                  folderProvenance={folderProvenance}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function PdfRow({
  file,
  picked,
  onPick,
  folderProvenance,
}: {
  file: File;
  picked: boolean;
  onPick: () => void;
  folderProvenance?: Provenance;
}) {
  const [resume, setResume] = useState<number | null>(null);
  useEffect(() => {
    const saved = getPdfPlace(`library-file:${file.id}`);
    // Page one is where it opens anyway — "resume" there promises nothing.
    if (saved && saved.page > 1) setResume(saved.page);
  }, [file.id]);

  const readHref = `/library/${file.node}/read/${file.id}`;
  const href = resume ? `${readHref}?page=${resume}` : readHref;
  const large = (file.file_size ?? 0) >= LARGE_BYTES;
  const pages = file.page_count ? `${file.page_count} pp` : "";
  // Spelt out on a phone, where it is a line of words rather than a column.
  const pagesWord = file.page_count ? `${file.page_count} pages` : "";
  const size = formatBytes(file.file_size);
  const t = contentLang(file.title);

  return (
    <div
      className="group relative flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-ink/[.03] sm:gap-4 sm:px-4"
      style={picked ? { background: "color-mix(in srgb, var(--ws-color) 6%, transparent)" } : undefined}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={picked}
        aria-label={`Select ${file.title}`}
        onClick={onPick}
        /* Desktop only: the phone comps (8 Oct 2026) draw no picking — a phone
           saves a folder with Download all at the list's foot. */
        className="relative z-10 hidden h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors sm:flex"
        style={
          picked
            ? { background: "var(--ws-color)", borderColor: "var(--ws-color)", color: "white" }
            : { borderColor: "var(--color-ink-soft)", opacity: 0.6 }
        }
      >
        {picked && <CheckIcon className="h-3.5 w-3.5" />}
      </button>

      {/* The document's own first page in the app's file tile, as the list had
          it before the ruled rows (designer's call, 8 Oct 2026) — smaller than a
          folder's tile, because a file is the smaller thing. */}
      <KindTile kind="pdf" cover={file.thumbnail_url} size="md" />

      <span className="min-w-0 flex-1">
        {"breadcrumb" in file && file.breadcrumb.length > 0 && <BreadcrumbLine steps={file.breadcrumb} />}
        <Link
          href={href}
          {...t}
          className={`${t.className} hi-tight line-clamp-2 block text-sm font-medium after:absolute after:inset-0 group-hover:underline sm:line-clamp-none sm:truncate sm:text-base`}
        >
          {file.title}
        </Link>
        {/* Phone: the columns, under the title. */}
        <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-ink-soft tabular-nums sm:hidden">
          {[pagesWord, size].filter(Boolean).join(" · ")}
          {large && <LargeTag />}
        </span>
        {(resume || file.provenance !== folderProvenance) && (
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
            {resume && (
              <span className="font-semibold tabular-nums" style={{ color: "var(--ws-ink)" }}>
                Resume on page {resume}
              </span>
            )}
            {file.provenance !== folderProvenance && <ProvenanceBadge provenance={file.provenance} />}
          </span>
        )}
      </span>

      <span className="hidden w-20 shrink-0 text-right text-sm tabular-nums text-ink-soft sm:block">{pages}</span>
      <span className="hidden w-32 shrink-0 items-center justify-end gap-2 text-sm tabular-nums text-ink-soft sm:flex">
        {large && <LargeTag />}
        {size}
      </span>
      <a
        href={file.url}
        download=""
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Download ${file.title}`}
        title={size ? `Download · ${size}` : "Download"}
        className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
      >
        <DownloadIcon className="h-4 w-4" />
      </a>
      <div className="hidden sm:block">
        <RowMenu
          label={file.title}
          items={[{ label: "Open", href }]}
          share={{ title: file.title, url: readHref }}
        />
      </div>
    </div>
  );
}

/** before a byte moves: on mobile data this is a decision, not a tap */
function LargeTag() {
  return (
    <span
      title="Large file — slow to open on mobile data"
      className="rounded px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.06em]"
      style={{ background: "color-mix(in srgb, var(--color-hl-amber) 85%, transparent)", color: "var(--color-kind-audio-ink)" }}
    >
      Large
    </span>
  );
}
