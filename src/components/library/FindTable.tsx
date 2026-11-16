"use client";

import { SrName } from "@/components/ui";
import Link from "next/link";
import { Fragment, useId, useMemo, useState } from "react";
import { provenanceLabel } from "@/components/library/ProvenanceBadge";
import { formatBytes, formatDuration } from "@/components/library/format";
import { ArrowRightIcon, ChevronDown, DownloadIcon, FolderIcon } from "@/components/shell/icons";
import { KindTile } from "@/components/ui/KindTile";
import { findLibrary } from "@/lib/api";
import { FIND_PAGE, type FindState } from "@/lib/find";
import { nodeHref, type ShelfMap } from "@/lib/library";
import { contentLang } from "@/lib/script";
import type { BreadcrumbStep, LibrarySearchRow } from "@/lib/types";
import { downloadProps } from "@/lib/download";
import { formatYear, splitAlbumName } from "@/lib/albumName";
import { includesFolded, splitMarked } from "@/lib/spellingFold";

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
 *
 * **Folders arrive folded, all but the first.** A search for "parichay" hits
 * a dozen folders, one of them sixteen tracks long; open, the folders after it
 * were screens away. Folded, the results read as a list of folders to choose
 * from, and the first one is left open so a reader can see that a header
 * holds rows and opens. A tap on any header opens or folds it. The folder
 * itself is still a tap away, on the arrow at the header's end.
 *
 * **Every row says why it is here** (UX audit FD3, 16 Nov 2026). The typed
 * word is marked wherever it shows — title, folder name, the folder's year ·
 * type · people line — and a row that matched on something it does not
 * print, a topic or a tag, says so in a small tag ("Topic: अनुभव"). Without
 * that, a row found through its topic looked like a mistake, and six rows
 * called सत्र 1 looked the same.
 */
export function FindTable({
  first,
  scope,
  state,
  total,
  shelves,
  searchedAs = "",
  topicNames = {},
}: {
  first: LibrarySearchRow[];
  scope: { workspace?: string; under?: number };
  state: FindState;
  total: number;
  shelves: ShelfMap;
  /** the Devanagari the endpoint actually searched, when it rewrote the box */
  searchedAs?: string;
  /** topic code → its name, for the "Topic:" tag — the facets carry both */
  topicNames?: Record<string, string>;
}) {
  // The words to mark: what was typed and what it was searched as, word by
  // word, since the endpoint matches words rather than the whole phrase.
  const terms = useMemo(
    () =>
      [...new Set(`${state.q} ${searchedAs}`.split(/\s+/))].filter((t) => t.length >= 2),
    [state.q, searchedAs]
  );
  const [more, setMore] = useState<LibrarySearchRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // Headers the reader has tapped, by group key — each flips its folder from
  // the default (the first open, the rest folded). Reset when a new search
  // arrives, so its first folder is open again however the last one was left.
  // The Library renders this table twice (one copy hidden per layout), so
  // the ids that tie a header to its rows need a per-table prefix.
  const idBase = useId();
  const [flipped, setFlipped] = useState<ReadonlySet<string>>(new Set());
  const [flippedFor, setFlippedFor] = useState(first);
  if (flippedFor !== first) {
    setFlippedFor(first);
    setFlipped(new Set());
  }
  const toggle = (key: string) =>
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

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

  const firstKey = groups[0]?.key;
  const isFolded = (key: string) => (key !== firstKey) !== flipped.has(key);

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
            <div className="relative flex items-center gap-2.5 border-b border-rule bg-inset px-4 py-2.5 [&:not(:first-child)]:border-t">
              <FolderIcon className="h-4 w-4 shrink-0 self-start text-ink-soft max-lg:mt-0.5 lg:self-center" />
              <div className="min-w-0 flex-1 lg:flex lg:items-baseline lg:gap-2.5">
                {/* The name is the toggle, stretched over the whole header;
                    the arrow at the end sits above it and opens the folder. */}
                <button
                  type="button"
                  onClick={() => toggle(g.key)}
                  aria-expanded={!isFolded(g.key)}
                  aria-controls={`${idBase}-group-${g.key}`}
                  {...contentLang(g.folder.name)}
                  className={`${contentLang(g.folder.name).className} block max-w-full truncate text-start text-sm font-semibold after:absolute after:inset-0 lg:shrink-0`}
                >
                  <Marked text={g.folder.name} terms={terms} />
                </button>
                {g.path.length > 0 && (
                  <span lang="hi" className="hi block min-w-0 truncate text-xs text-ink-soft">
                    {g.path.map((s) => s.name).join(" / ")}
                  </span>
                )}
              </div>
              <span className="shrink-0 text-xs tabular-nums text-ink-soft">
                {g.rows.length} {g.rows.length === 1 ? "item" : "items"}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-ink-soft transition-transform ${isFolded(g.key) ? "-rotate-90" : ""}`}
              />
              <Link
                href={nodeHref(g.folder.id, shelves)}
                aria-label={`Open ${g.folder.name}`}
                title="Open folder"
                className="relative z-10 -my-1 -me-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
              >
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          )}
          <ul
            id={`${idBase}-group-${g.key}`}
            // A group with no folder has no header to open it by, so it never folds.
            hidden={!!g.folder && isFolded(g.key)}
            className="divide-y divide-rule"
          >
            {g.rows.map((r) => (
              <li key={`${r.type}-${r.id}`}>
                <Row row={r} shelves={shelves} terms={terms} topicNames={topicNames} />
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
          {failed && <p className="pb-3 text-center text-xs text-ink-soft">Couldn’t load more. Try again.</p>}
        </div>
      )}
    </div>
  );
}

/** the searched words marked in a piece of text, either spelling */
function Marked({ text, terms }: { text: string; terms: string[] }) {
  const parts = useMemo(() => splitMarked(text, terms), [text, terms]);
  return (
    <>
      {parts.map((p, i) =>
        p.hit ? (
          <mark
            key={i}
            className="rounded-sm text-ink"
            style={{ background: "color-mix(in srgb, var(--ws-color) 18%, var(--color-card))" }}
          >
            {p.text}
          </mark>
        ) : (
          p.text
        )
      )}
    </>
  );
}

const DEVANAGARI = /[\u0900-\u097F]/;
const LATIN = /[a-z]/i;

/**
 * What a row matched on, when the row does not show it — or null.
 *
 * Only what the row cannot mark for itself: the title and the facts line are
 * marked in place, so a match there needs no tag. A file carries no topics or
 * people of its own (search reaches it through its folder's), so a file whose
 * title and description both miss was found by its folder, and says so.
 */
function matchTag(
  row: LibrarySearchRow,
  terms: string[],
  facts: string,
  topicNames: Record<string, string>
): { label: string; value?: string } | null {
  if (!terms.length) return null;
  const has = (text: string) => terms.some((t) => includesFolded(text, t));
  // The endpoint matches across scripts — अनुभव finds "Anubhav Shivir" — and
  // nothing here can. A title holding a script the terms are not written in
  // may well be what matched, so it gets no tag rather than a wrong one.
  const title = row.type === "file" ? row.title : row.name;
  const otherScript = (t: string) => (DEVANAGARI.test(t) ? LATIN : DEVANAGARI).test(title);
  if (terms.every(otherScript)) return null;
  if (row.type === "file") {
    if (has(row.title)) return null;
    if (row.description && has(row.description)) return { label: "In the description" };
    return { label: "Found by its folder" };
  }
  if (has(row.name) || (facts && has(facts))) return null;
  for (const code of row.topics) {
    const name = topicNames[code] ?? code;
    if (has(name) || has(code)) return { label: "Topic", value: name };
  }
  const tag = row.tags.find(has);
  if (tag) return { label: "Tag", value: tag };
  if (row.description && has(row.description)) return { label: "In the description" };
  return null;
}

/** one line: kind · title · provenance · length · size · download */
function Row({
  row,
  shelves,
  terms,
  topicNames,
}: {
  row: LibrarySearchRow;
  shelves: ShelfMap;
  terms: string[];
  topicNames: Record<string, string>;
}) {
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
  // A folder's second line: year · type · people — what tells one सत्र 1 from
  // the next. Not language, which is the same on nearly every row. A file has
  // none of these; its folder, in the header above it, does.
  const facts =
    row.type === "folder"
      ? [formatYear(row.year) || splitAlbumName(row.name).date, row.session_type_label, row.people]
          .filter(Boolean)
          .join(" · ")
      : "";
  const tag = matchTag(row, terms, facts, topicNames);
  const phoneBits = [length, size].filter((v) => v !== "—");

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
          <Marked text={title} terms={terms} />
        </Link>
        {/* The second line. Phone: the columns first, then the folder's facts
            and the match tag. Desktop: the columns stand to the right, so the
            line is only the facts and the tag, and is not drawn without them. */}
        <span
          className={`mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-ink-soft ${
            facts || tag ? "" : "lg:hidden"
          }`}
        >
          <span className="contents lg:hidden">
            {badge && (
              <>
                <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: badge.color }} />
                {badge.label}
              </>
            )}
            {phoneBits.map((v, i) => (
              <Fragment key={v}>
                {(badge || i > 0) && <span aria-hidden>·</span>}
                <span className="tabular-nums">{v}</span>
              </Fragment>
            ))}
            {facts && (badge || phoneBits.length > 0) && <span aria-hidden>·</span>}
          </span>
          {facts && (
            <span {...contentLang(facts)} className={`${contentLang(facts).className} min-w-0`}>
              <Marked text={facts} terms={terms} />
            </span>
          )}
          {tag && (
            <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-canvas px-2 py-0.5 font-semibold">
              <span className="shrink-0">{tag.value ? `${tag.label}:` : tag.label}</span>
              {tag.value && (
                <span {...contentLang(tag.value)} className={`${contentLang(tag.value).className} truncate font-semibold`}>
                  {tag.value}
                </span>
              )}
            </span>
          )}
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
          {...downloadProps(file.url, title)}
          title="Download"
          className="relative z-10 flex h-8 w-8 items-center justify-center justify-self-end rounded-control text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
        >
          <SrName verb="Download" name={title} />
          <DownloadIcon className="h-4 w-4" />
        </a>
      ) : (
        <span />
      )}
    </div>
  );
}
