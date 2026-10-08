"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { provenanceLabel } from "@/components/library/ProvenanceBadge";
import { formatBytes, formatDuration } from "@/components/library/format";
import { DownloadIcon, FolderIcon } from "@/components/shell/icons";
import { KindTile } from "@/components/ui/KindTile";
import { findLibrary } from "@/lib/api";
import { FIND_PAGE, type FindState } from "@/lib/find";
import { nodeHref, type ShelfMap } from "@/lib/library";
import { contentLang } from "@/lib/script";
import type { BreadcrumbStep, LibrarySearchRow } from "@/lib/types";

/**
 * **A find's results, grouped by folder** (designer's comps, 8 Oct 2026).
 *
 * Every row used to carry its own path above its title, and down a page of
 * results that path repeated — six photographs from one sammelan folder
 * printed the same five-step address six times. So the folder becomes a
 * header, shown once, and each row is the kind, the title, whose word it is,
 * its length and size, and a download.
 *
 * On a desktop that is one line, with length and size in columns a reader can
 * run an eye down. On a phone the facts go under the title, and the header
 * puts the path under the folder's name rather than beside it.
 *
 * Groups keep the order their first hit arrived in, so the best match's folder
 * still leads; within a group, rows keep their rank. Later pages fold into the
 * groups they belong to rather than opening a second "photos" header further
 * down.
 */
export function FindTable({
  first,
  scope,
  state,
  total,
  shelves,
}: {
  first: LibrarySearchRow[];
  scope: { workspace?: string; under?: number };
  state: FindState;
  total: number;
  shelves: ShelfMap;
}) {
  const [more, setMore] = useState<LibrarySearchRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const rows = useMemo(() => [...first, ...more], [first, more]);
  const remaining = total - rows.length;

  const groups = useMemo(() => {
    const out: { key: string; folder: BreadcrumbStep | null; path: BreadcrumbStep[]; rows: LibrarySearchRow[] }[] = [];
    const at = new Map<string, number>();
    for (const r of rows) {
      // A file's breadcrumb ends in its own folder; a folder's ends in its
      // parent. Either way the last step is the folder it is listed in.
      const folder = r.breadcrumb.at(-1) ?? null;
      const key = folder ? String(folder.id) : "top";
      const i = at.get(key);
      if (i === undefined) {
        at.set(key, out.length);
        out.push({ key, folder, path: r.breadcrumb.slice(0, -1), rows: [r] });
      } else out[i].rows.push(r);
    }
    return out;
  }, [rows]);

  async function loadMore() {
    setBusy(true);
    setFailed(false);
    try {
      const page = await findLibrary({ ...scope, state, limit: FIND_PAGE, offset: rows.length });
      setMore((m) => [...m, ...page.results]);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-rule bg-card">
      {groups.map((g) => (
        <Fragment key={g.key}>
          {g.folder && (
            <div className="flex items-center gap-2.5 border-b border-rule bg-inset px-4 py-2.5 [&:not(:first-child)]:border-t">
              <FolderIcon className="h-4 w-4 shrink-0 self-start text-ink-soft max-lg:mt-0.5 lg:self-center" />
              <div className="min-w-0 flex-1 lg:flex lg:items-baseline lg:gap-2.5">
                <Link
                  href={nodeHref(g.folder.id, shelves)}
                  {...contentLang(g.folder.name)}
                  className={`${contentLang(g.folder.name).className} block truncate text-sm font-semibold hover:underline lg:shrink-0`}
                >
                  {g.folder.name}
                </Link>
                {g.path.length > 0 && (
                  <span lang="hi" className="hi block min-w-0 truncate text-xs text-ink-soft">
                    {g.path.map((s) => s.name).join(" / ")}
                  </span>
                )}
              </div>
              <span className="shrink-0 text-xs tabular-nums text-ink-soft">
                {g.rows.length} {g.rows.length === 1 ? "item" : "items"}
              </span>
            </div>
          )}
          <ul className="divide-y divide-rule">
            {g.rows.map((r) => (
              <li key={`${r.type}-${r.id}`}>
                <Row row={r} shelves={shelves} />
              </li>
            ))}
          </ul>
        </Fragment>
      ))}

      {remaining > 0 && (
        <div className="border-t border-rule">
          <button
            type="button"
            onClick={loadMore}
            disabled={busy}
            className="w-full px-4 py-3 text-xs font-semibold transition-colors hover:bg-ink/[.03] disabled:opacity-60"
            style={{ color: "var(--ws-ink)" }}
          >
            <span>{busy ? "Loading…" : "Show more"}</span>
            {!busy && <span className="ms-1 tabular-nums opacity-70">{remaining}</span>}
          </button>
          {failed && <p className="pb-3 text-center text-xs text-ink-soft">Couldn&apos;t load more. Try again.</p>}
        </div>
      )}
    </div>
  );
}

/** one line: kind · title · provenance · length · size · download */
function Row({ row, shelves }: { row: LibrarySearchRow; shelves: ShelfMap }) {
  const file = row.type === "file" ? row : null;
  const title = file ? file.title : row.type === "folder" ? row.name : "";
  const href = file ? nodeHref(file.node, shelves) : nodeHref(row.id, shelves);
  const badge = provenanceLabel(row.provenance);
  const length = file
    ? file.duration_seconds
      ? formatDuration(file.duration_seconds)
      : file.page_count
        ? `${file.page_count} pp`
        : "—"
    : "—";
  const size = file ? formatBytes(file.file_size) || "—" : "—";

  return (
    // The whole row opens the item — the title's link is stretched over it —
    // while the download stays its own target above that.
    <div className="relative grid grid-cols-[2.25rem_minmax(0,1fr)_2.5rem] items-center gap-x-3 px-4 py-2.5 transition-colors hover:bg-ink/[.03] lg:grid-cols-[2.25rem_minmax(0,1fr)_8rem_4.5rem_5rem_2.5rem]">
      <KindTile kind={file ? file.kind : "folder"} size="sm" />
      <span className="min-w-0">
        <Link
          href={href}
          {...contentLang(title)}
          className={`${contentLang(title).className} line-clamp-2 text-sm font-medium after:absolute after:inset-0 lg:line-clamp-none lg:block lg:truncate`}
        >
          {title}
        </Link>
        {/* Phone: the columns, as one line under the title. */}
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-soft lg:hidden">
          {badge && (
            <>
              <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: badge.color }} />
              {badge.label}
            </>
          )}
          {[length, size]
            .filter((v) => v !== "—")
            .map((v, i) => (
              <Fragment key={v}>
                {(badge || i > 0) && <span aria-hidden>·</span>}
                <span className="tabular-nums">{v}</span>
              </Fragment>
            ))}
        </span>
      </span>
      <span className="hidden items-center gap-1.5 text-xs text-ink-soft lg:flex">
        {badge && (
          <>
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: badge.color }} />
            {badge.label}
          </>
        )}
      </span>
      <span className="hidden text-right text-xs tabular-nums text-ink-soft lg:block">{length}</span>
      <span className="hidden text-right text-xs tabular-nums text-ink-soft lg:block">{size}</span>
      {file?.url ? (
        <a
          href={file.url}
          download
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Download ${title}`}
          title="Download"
          className="relative z-10 flex h-8 w-8 items-center justify-center justify-self-end rounded-control text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
        >
          <DownloadIcon className="h-4 w-4" />
        </a>
      ) : (
        <span />
      )}
    </div>
  );
}
