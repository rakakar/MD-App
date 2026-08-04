import Link from "next/link";
import { BreadcrumbLine } from "@/components/library/NodeCard";
import { ProvenanceBadge } from "@/components/library/ProvenanceBadge";
import { KIND_LABEL, cardSummary, fileFacts } from "@/components/library/format";
import { nodeHref, type ShelfMap } from "@/lib/library";
import { contentLang } from "@/lib/script";
import type { LibrarySearchRow } from "@/lib/types";

/**
 * One hit from the catalogue, with its path above it.
 *
 * **The path is the row, not decoration.** A search result is by definition
 * somewhere the reader was not, and "सत्र 1" is the same two words in every
 * shivir the library holds — a hit the reader cannot place is not a hit
 * (contract §13.8, U2). A folder's breadcrumb stops at its parent and a file's
 * includes its own folder, which is also where the file's link goes: there is
 * no page for a single file, and its folder is where it plays.
 *
 * Folders and files share one row because the response mixes them, and `type`
 * exists only there for that reason. What tells them apart to a reader is the
 * little kind badge — Folder, or Audio / PDF / Image — rather than the shape
 * of the row, because both answer the same question: where is this thing?
 */
export function FindRow({
  row,
  shelves = {},
}: {
  row: LibrarySearchRow;
  /** roots that are really a shelf, so a hit links at its canonical URL */
  shelves?: ShelfMap;
}) {
  const href = row.type === "folder" ? nodeHref(row.id, shelves) : nodeHref(row.node, shelves);
  const title = row.type === "folder" ? row.name : row.title;
  const facts =
    row.type === "folder"
      ? [row.year, row.place, cardSummary(row)].filter(Boolean).join(" · ")
      : fileFacts(row);

  return (
    <Link
      href={href}
      className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-black/[.03]"
    >
      {row.breadcrumb.length > 0 && <BreadcrumbLine steps={row.breadcrumb} />}
      <span
        {...contentLang(title)}
        className={`${contentLang(title).className} text-[15px] font-medium leading-snug`}
      >
        {title}
      </span>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
        <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-semibold">
          {row.type === "folder" ? "Folder" : KIND_LABEL[row.kind]}
        </span>
        <ProvenanceBadge provenance={row.provenance} />
        {/* year · place · people · language — the manager's words, so the
            script decides the face rather than this row assuming Hindi */}
        <span {...contentLang(facts)}>{facts}</span>
      </span>
    </Link>
  );
}
