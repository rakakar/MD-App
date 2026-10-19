"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SearchGlyph } from "@/components/assistant/icons";
import { formatBytes, formatDuration, formatSpan } from "@/components/library/format";
import { VideoStage } from "@/components/library/VideoStage";
import { usePlayer } from "@/components/player/PlayerProvider";
import {
  CheckIcon,
  ChevronRight,
  DownloadIcon,
  ExternalLinkIcon,
  PlayIcon,
  WaveformIcon,
} from "@/components/shell/icons";
import { KindTile } from "@/components/ui";
import { getNode } from "@/lib/api";
import { downloadProps } from "@/lib/download";
import {
  STAGES,
  STAGE_TAB_LABEL,
  isExternalHref,
  levelOf,
  resourceFolderId,
  resourceTab,
  stageResources,
  stageTabs,
  type Stage,
  type StageResource,
  type StageTab,
} from "@/lib/journey";
import { journeyDocumentHref, journeyFolderHref } from "@/lib/routes";
import { contentLang } from "@/lib/script";
import { getDownloaded, getPdfPlace, getPlayhead, markDownloaded } from "@/lib/storage";
import type { LibraryFile, LibraryNode, NodeCard } from "@/lib/types";

/**
 * **One stage, opened** — the right-hand panel of the full path on a desktop
 * and a screen of its own on a phone (full path revision 19 Oct 2026).
 *
 * Four tabs. *About* is every stage's: what happens in it, and the list of
 * what it points to. *Reading*, *Audio* and *Video* are the files of the
 * library folders the stage names, listed here rather than one tap further
 * on, with where the reader is in each — and they exist only for a stage that
 * has folders of that kind, so a stage met in a camp is not shown three empty
 * tabs.
 *
 * Everything listed is the library's own: the folders are fetched live, and
 * each row opens in the app's own PDF reader, player or video stage, so the
 * reader never leaves My Journey to use what a stage offers.
 */
export function StagePanel({
  stage,
  tab,
  onTab,
  variant,
}: {
  stage: Stage;
  tab: StageTab;
  onTab: (tab: StageTab) => void;
  /** `panel` beside the list on a desktop; `screen` on its own on a phone */
  variant: "panel" | "screen";
}) {
  const tabs = stageTabs(stage);
  const active = tabs.includes(tab) ? tab : "about";
  const folders = useStageFolders(stage);
  const level = levelOf(stage);

  const eyebrow =
    variant === "panel"
      ? `Stage ${stage.id} of ${STAGES.length}${stage.en ? ` · ${stage.en}` : ""}`
      : `Level ${level.id} · Stage ${stage.id} of ${STAGES.length}`;

  const content = (
    <TabContent stage={stage} tab={active} folders={folders} onTab={onTab} />
  );

  if (variant === "screen") {
    return (
      <div>
        <p
          className="text-xs font-bold uppercase tracking-[0.09em]"
          style={{ color: "var(--ws-ink)" }}
        >
          {eyebrow}
        </p>
        <h1 lang="hi" className="hi hi-tight mt-1.5 text-3xl font-semibold">
          {stage.hi}
        </h1>
        {tabs.length > 1 && (
          <div
            role="tablist"
            aria-label="This stage"
            /* One row, as drawn; it scrolls sideways rather than wrapping on a
               phone too narrow for all four. */
            className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0"
          >
            {tabs.map((t) => (
              <PillTab key={t} tab={t} active={t === active} onSelect={onTab} />
            ))}
          </div>
        )}
        <div role="tabpanel" className="mt-5">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-hero border border-rule bg-card shadow-raised">
      <div className={`border-b border-rule px-8 pt-8 ${tabs.length > 1 ? "" : "pb-6"}`}>
        <p
          className="text-xs font-bold uppercase tracking-[0.09em]"
          style={{ color: "var(--ws-ink)" }}
        >
          {eyebrow}
        </p>
        <h2 lang="hi" className="hi hi-tight mt-1.5 text-3xl font-semibold">
          {stage.hi}
        </h2>
        {tabs.length > 1 && (
          <div role="tablist" aria-label="This stage" className="-mb-px mt-4 flex gap-7">
            {tabs.map((t) => {
              const on = t === active;
              return (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => onTab(t)}
                  className={`min-h-12 border-b-2 text-base font-semibold transition-colors ${
                    on ? "" : "border-transparent text-ink-soft hover:text-ink"
                  }`}
                  style={on ? { borderColor: "var(--ws-color)", color: "var(--ws-ink)" } : undefined}
                >
                  {STAGE_TAB_LABEL[t]}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
        {content}
      </div>
    </div>
  );
}

function PillTab({
  tab,
  active,
  onSelect,
}: {
  tab: StageTab;
  active: boolean;
  onSelect: (t: StageTab) => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => onSelect(tab)}
      className="min-h-11 shrink-0 rounded-full border bg-card px-3.5 text-sm font-semibold transition-colors sm:px-5 sm:text-base"
      style={
        active
          ? {
              borderColor: "var(--ws-color)",
              color: "var(--ws-ink)",
              background: "color-mix(in srgb, var(--ws-color) 8%, var(--color-card))",
            }
          : { borderColor: "var(--color-rule)" }
      }
    >
      {STAGE_TAB_LABEL[tab]}
    </button>
  );
}

// ---------------------------------------------------------------------------
// The stage's folders
// ---------------------------------------------------------------------------

/** Fetched once per folder per visit — switching stages and back is free. */
const folderCache = new Map<number, Promise<LibraryNode | null>>();

function loadFolder(id: number): Promise<LibraryNode | null> {
  let hit = folderCache.get(id);
  if (!hit) {
    hit = getNode(id).catch(() => null);
    folderCache.set(id, hit);
  }
  return hit;
}

/** `undefined` while loading; `null` for a folder that would not open. */
type Folders = Map<number, LibraryNode | null | undefined>;

function useStageFolders(stage: Stage): Folders {
  const ids = useMemo(
    () =>
      [...new Set(stageResources(stage).map(resourceFolderId))].filter(
        (id): id is number => id !== null
      ),
    [stage]
  );
  const [folders, setFolders] = useState<Folders>(() => new Map(ids.map((id) => [id, undefined])));

  useEffect(() => {
    let live = true;
    setFolders(new Map(ids.map((id) => [id, undefined])));
    for (const id of ids) {
      void loadFolder(id).then((node) => {
        if (live) setFolders((prev) => new Map(prev).set(id, node));
      });
    }
    return () => {
      live = false;
    };
  }, [ids]);

  return folders;
}

/** A folder's files — its own and those cross-posted into it. */
function filesOf(node: LibraryNode): LibraryFile[] {
  return [...node.items, ...node.linked_items];
}

/** One tab's worth of folders, in the order the stage names them. */
function tabFolders(stage: Stage, tab: StageTab, folders: Folders) {
  return stageResources(stage)
    .filter((r) => resourceTab(r) === tab)
    .map((r) => ({ resource: r, node: folders.get(resourceFolderId(r)!) }));
}

const KIND_FOR_TAB = { reading: "pdf", audio: "audio", video: "video" } as const;

// ---------------------------------------------------------------------------
// Tab content
// ---------------------------------------------------------------------------

function TabContent({
  stage,
  tab,
  folders,
  onTab,
}: {
  stage: Stage;
  tab: StageTab;
  folders: Folders;
  onTab: (tab: StageTab) => void;
}) {
  if (tab === "about") return <About stage={stage} folders={folders} onTab={onTab} />;
  return <Collection stage={stage} tab={tab} folders={folders} />;
}

function About({
  stage,
  folders,
  onTab,
}: {
  stage: Stage;
  folders: Folders;
  onTab: (tab: StageTab) => void;
}) {
  const resources = stageResources(stage);
  return (
    <div>
      <p className="text-base leading-relaxed sm:text-[1.0625rem]">{stage.note}</p>
      <p className="mt-2 text-sm text-ink-soft">
        {stage.duration.charAt(0).toUpperCase() + stage.duration.slice(1)}
      </p>

      {resources.length > 0 && (
        <>
          <h3 className="mt-7 text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
            Resources
          </h3>
          <ul className="mt-3 flex flex-col gap-3">
            {resources.map((r) => (
              <li key={`${r.href}|${r.title}|${r.note ?? ""}`}>
                <ResourceRow resource={r} folders={folders} onTab={onTab} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** "PDF collection · 9 PDFs · 62 MB" — what a folder holds, once it has loaded. */
function folderSummary(r: StageResource, node: LibraryNode | null | undefined): string | null {
  if (!node) return null;
  const files = filesOf(node);
  const tab = resourceTab(r);
  if (files.length === 0) {
    const n = node.children.length;
    return n > 0 ? `${n} ${n === 1 ? "folder" : "folders"}` : null;
  }
  const bytes = files.reduce((sum, f) => sum + (f.file_size ?? 0), 0);
  const seconds = files.reduce((sum, f) => sum + (f.duration_seconds ?? 0), 0);
  const n = files.length;
  if (tab === "audio") {
    return ["Audio series", `${n} ${n === 1 ? "talk" : "talks"}`, formatSpan(seconds)]
      .filter(Boolean)
      .join(" · ");
  }
  if (tab === "video") {
    return ["Video series", `${n} ${n === 1 ? "video" : "videos"}`, formatSpan(seconds)]
      .filter(Boolean)
      .join(" · ");
  }
  return ["PDF collection", `${n} ${n === 1 ? "PDF" : "PDFs"}`, formatBytes(bytes)]
    .filter(Boolean)
    .join(" · ");
}

function ResourceRow({
  resource: r,
  folders,
  onTab,
}: {
  resource: StageResource;
  folders: Folders;
  onTab: (tab: StageTab) => void;
}) {
  const tab = resourceTab(r);
  const folderId = resourceFolderId(r);
  const note =
    (folderId !== null ? folderSummary(r, folders.get(folderId)) : null) ?? r.note;
  const external = isExternalHref(r.href);
  const lang = contentLang(r.title);

  const body = (
    <>
      <KindTile kind={r.kind === "link" ? "link" : r.kind} size="lg" />
      <span className="min-w-0 flex-1">
        <span lang={lang.lang} className={`${lang.className} hi-tight block truncate text-title font-semibold`}>
          {r.title}
        </span>
        {note && <span className="mt-1 block truncate text-sm text-ink-soft">{note}</span>}
      </span>
      {external ? (
        <ExternalLinkIcon className="h-5 w-5 shrink-0 text-ink-soft" />
      ) : (
        <ChevronRight className="h-5 w-5 shrink-0 text-ink-soft" />
      )}
    </>
  );
  const row =
    "flex w-full items-center gap-4 rounded-card border border-rule bg-card p-3.5 text-start transition-colors hover:bg-canvas/40";

  // A folder opens its own tab here rather than leaving for a folder page:
  // the panel already lists it, with the reader's place in each file.
  if (tab) {
    return (
      <button type="button" onClick={() => onTab(tab)} className={row}>
        {body}
      </button>
    );
  }
  if (external) {
    return (
      <a
        href={r.href}
        target="_blank"
        rel="noopener noreferrer"
        className={row}
        aria-label={`${r.title} (opens in a new tab)`}
      >
        {body}
      </a>
    );
  }
  return (
    <Link href={r.href} className={row}>
      {body}
    </Link>
  );
}

/**
 * One tab's files — the folders of that kind, merged, with a header that
 * totals them, a way to save them all (not for video, whose files are links
 * to where the recordings are hosted), and a search over their titles.
 */
function Collection({
  stage,
  tab,
  folders,
}: {
  stage: Stage;
  tab: Exclude<StageTab, "about">;
  folders: Folders;
}) {
  const groups = tabFolders(stage, tab, folders);
  const loading = groups.some((g) => g.node === undefined);
  const kind = KIND_FOR_TAB[tab];
  const [query, setQuery] = useState("");
  const [watching, setWatching] = useState<LibraryFile | null>(null);
  /** bumped to re-read places, playheads and downloads after anything moves them */
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => setQuery(""), [stage.id, tab]);

  const all = groups.flatMap((g) =>
    g.node ? filesOf(g.node).filter((f) => f.kind === kind) : []
  );
  const subfolders = groups.flatMap((g) =>
    g.node ? g.node.children.filter((c) => c.child_count + c.item_count > 0) : []
  );

  const bytes = all.reduce((sum, f) => sum + (f.file_size ?? 0), 0);
  const seconds = all.reduce((sum, f) => sum + (f.duration_seconds ?? 0), 0);
  const n = all.length;
  const summary =
    tab === "reading"
      ? [`${n} ${n === 1 ? "PDF" : "PDFs"}`, formatBytes(bytes)]
      : tab === "audio"
        ? [`${n} ${n === 1 ? "talk" : "talks"}`, formatSpan(seconds)]
        : [`${n} ${n === 1 ? "video" : "videos"}`, formatSpan(seconds)];

  const needle = query.trim().toLowerCase();
  const match = (title: string) => !needle || title.toLowerCase().includes(needle);

  if (loading && n === 0) {
    return (
      <div className="flex flex-col gap-3" aria-busy>
        {[0, 1, 2].map((i) => (
          <span key={i} className="block h-20 animate-pulse rounded-card bg-canvas/60" />
        ))}
      </div>
    );
  }

  if (n === 0 && subfolders.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-ink-soft">
        Nothing here yet — the library has not published these files.
      </p>
    );
  }

  const downloadAll = async () => {
    markDownloaded(all.map((f) => f.id));
    refresh();
    // One after another, a beat apart: a browser handed nine saves in the same
    // instant keeps the first and drops the rest.
    for (const f of all) {
      const a = document.createElement("a");
      for (const [name, value] of Object.entries(downloadProps(f.url, f.title))) {
        a.setAttribute(name, value);
      }
      document.body.appendChild(a);
      a.click();
      a.remove();
      await new Promise((r) => setTimeout(r, 600));
    }
  };

  const multi = groups.filter((g) => g.node && filesOf(g.node).some((f) => f.kind === kind)).length > 1;

  return (
    <div>
      {n > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-base text-ink-soft">{summary.filter(Boolean).join(" · ")}</p>
          {tab !== "video" && bytes > 0 && (
            <button
              type="button"
              onClick={() => void downloadAll()}
              className="inline-flex min-h-11 items-center gap-2 rounded-control border px-4 text-sm font-semibold transition-colors hover:brightness-[0.98]"
              style={{
                color: "var(--ws-ink)",
                borderColor: "color-mix(in srgb, var(--ws-color) 35%, var(--color-card))",
                background: "color-mix(in srgb, var(--ws-color) 7%, var(--color-card))",
              }}
            >
              <DownloadIcon className="h-4 w-4" />
              Download all · {formatBytes(bytes)}
            </button>
          )}
        </div>
      )}

      {n > 1 && (
        <label className="mt-4 flex min-h-12 items-center gap-3 rounded-control border border-rule bg-card px-4 focus-within:border-ink-soft">
          <SearchGlyph className="h-5 w-5 shrink-0 text-ink-soft" />
          <span className="sr-only">Search in this collection</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search in this collection"
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-ink-soft"
          />
        </label>
      )}

      <div className="mt-3">
        {groups.map((g) => {
          if (!g.node) return null;
          const node = g.node;
          const files = filesOf(node).filter((f) => f.kind === kind && match(f.title));
          if (files.length === 0) return null;
          const name = contentLang(node.name);
          return (
            <section key={node.id} className="mt-2 first:mt-0">
              {multi && (
                <h3
                  lang={name.lang}
                  className={`${name.className} hi-tight mb-1 mt-4 text-sm font-semibold text-ink-soft`}
                >
                  {node.name}
                </h3>
              )}
              <ul className="divide-y divide-rule">
                {files.map((f) => (
                  <li key={f.id}>
                    {tab === "reading" ? (
                      <PdfRow file={f} node={node.id} tick={tick} onDownload={refresh} />
                    ) : (
                      <MediaRow
                        file={f}
                        subtitle={node.name}
                        tick={tick}
                        onWatch={(file) => setWatching(file)}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {needle && !all.some((f) => match(f.title)) && (
          <p className="mt-4 text-sm text-ink-soft">Nothing here matches “{query.trim()}”.</p>
        )}

        {subfolders.length > 0 && <Subfolders cards={subfolders} />}
      </div>

      {watching && (
        <VideoStage
          file={watching}
          onClose={() => {
            setWatching(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

/** A folder of folders — stage 6's students' writings — opens each one. */
function Subfolders({ cards }: { cards: NodeCard[] }) {
  return (
    <ul className="mt-2 flex flex-col gap-2">
      {cards.map((c) => {
        const lang = contentLang(c.name);
        return (
          <li key={c.id}>
            <Link
              href={journeyFolderHref(c.id)}
              className="flex min-h-11 items-center gap-3 rounded-card border border-rule bg-card p-3 transition-shadow hover:shadow-md"
            >
              <KindTile kind={c.kinds.length === 1 ? c.kinds[0] : "folder"} size="md" />
              <span className="min-w-0 flex-1">
                <span lang={lang.lang} className={`${lang.className} hi-tight block truncate text-sm font-semibold`}>
                  {c.name}
                </span>
                {c.item_count > 0 && (
                  <span className="mt-0.5 block text-xs text-ink-soft">
                    {c.item_count} {c.item_count === 1 ? "file" : "files"}
                  </span>
                )}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** The thin bar under a row — the accent while under way, quiet once done. */
function RowBar({ percent, done }: { percent: number; done: boolean }) {
  return (
    <span aria-hidden className="mt-2.5 block h-1 w-full max-w-sm overflow-hidden rounded-full bg-canvas">
      <span
        className="block h-full rounded-full"
        style={{
          width: `${Math.max(percent, 3)}%`,
          background: done
            ? "color-mix(in srgb, var(--color-ink-soft) 35%, var(--color-card))"
            : "var(--ws-color)",
        }}
      />
    </span>
  );
}

/** "Read" / "Read 40%" / "Played 35%" — set apart from the facts before it. */
function Status({ text, done }: { text: string; done: boolean }) {
  return (
    <>
      <span aria-hidden className="text-ink-soft">·</span>
      <span className="font-semibold" style={done ? undefined : { color: "var(--ws-ink)" }}>
        {text}
      </span>
    </>
  );
}

function PdfRow({
  file,
  node,
  tick,
  onDownload,
}: {
  file: LibraryFile;
  node: number;
  tick: number;
  onDownload: () => void;
}) {
  // Read after mount: these live on the device, and the server has no copy.
  const [state, setState] = useState<{ page: number; count: number; saved: boolean } | null>(null);
  useEffect(() => {
    const place = getPdfPlace(`library-file:${file.id}`);
    setState({
      page: place?.page ?? 0,
      count: place?.page_count || file.page_count || 0,
      saved: getDownloaded().has(file.id),
    });
  }, [file.id, file.page_count, tick]);

  const started = state && state.page > 1 && state.count > 0;
  const percent = started ? Math.min(100, Math.round((state.page / state.count) * 100)) : null;
  const done = percent !== null && percent >= 100;
  const href = journeyDocumentHref(node, file.id, started ? state.page : undefined);
  const facts = [
    file.page_count ? `${file.page_count} ${file.page_count === 1 ? "page" : "pages"}` : null,
    formatBytes(file.file_size) || null,
  ].filter(Boolean);
  const title = contentLang(file.title);

  return (
    <div className="relative flex items-center gap-4 py-3.5">
      <span
        aria-hidden
        className="flex h-[4.25rem] w-[3.25rem] shrink-0 overflow-hidden rounded-md border border-rule bg-card shadow-card"
        style={
          file.thumbnail_url
            ? undefined
            : {
                backgroundImage:
                  "repeating-linear-gradient(180deg, transparent 0 7px, var(--color-rule) 7px 8px)",
              }
        }
      >
        {file.thumbnail_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={file.thumbnail_url} alt="" loading="lazy" className="h-full w-full object-cover" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        {/* The whole row opens the document; the download keeps its own tap. */}
        <Link
          href={href}
          lang={title.lang}
          className={`${title.className} hi-tight block truncate text-title font-semibold after:absolute after:inset-0 hover:underline`}
        >
          {file.title}
        </Link>
        <span className="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-sm text-ink-soft">
          {facts.length > 0 && <span className="tabular-nums">{facts.join(" · ")}</span>}
          {percent !== null && <Status text={done ? "Read" : `Read ${percent}%`} done={done} />}
        </span>
        {percent !== null && <RowBar percent={percent} done={done} />}
      </span>
      {state?.saved ? (
        <span
          title="Downloaded on this device"
          className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{
            background: "color-mix(in srgb, var(--color-ws-translations) 14%, var(--color-card))",
            color: "var(--color-ws-translations)",
          }}
        >
          <CheckIcon className="h-4.5 w-4.5" />
          <span className="sr-only">Downloaded</span>
        </span>
      ) : (
        <a
          {...downloadProps(file.url, file.title)}
          onClick={() => {
            markDownloaded([file.id]);
            // After the browser has the link — re-rendering first would swap
            // this anchor for the check before its own default action ran.
            setTimeout(onDownload, 0);
          }}
          aria-label={`Download ${file.title}`}
          title="Download PDF"
          className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-ink/[.04] hover:text-ink"
        >
          <DownloadIcon className="h-5 w-5" />
        </a>
      )}
    </div>
  );
}

/** Under this, nobody left off; within this of the end, it is finished. */
const MIN_PLAYED_MS = 5_000;
const DONE_TAIL_MS = 15_000;

function MediaRow({
  file,
  subtitle,
  tick,
  onWatch,
}: {
  file: LibraryFile;
  /** the folder's name, for the player's second line */
  subtitle: string;
  tick: number;
  onWatch: (file: LibraryFile) => void;
}) {
  const player = usePlayer();
  const key = `library-file:${file.id}`;
  const [positionMs, setPositionMs] = useState(0);
  useEffect(() => {
    setPositionMs(getPlayhead(key) ?? 0);
  }, [key, tick]);

  const audio = file.kind === "audio";
  const durationMs = (file.duration_seconds ?? 0) * 1000;
  const started = positionMs >= MIN_PLAYED_MS && durationMs > 0;
  const done = started && positionMs >= durationMs - DONE_TAIL_MS;
  const percent = started ? Math.min(100, Math.round((positionMs / durationMs) * 100)) : null;
  const length = audio ? formatSpan(file.duration_seconds) : formatDuration(file.duration_seconds);
  const title = contentLang(file.title);

  const play = () => {
    if (!audio) {
      onWatch(file);
      return;
    }
    player.playTrack(
      {
        id: key,
        title: file.title,
        subtitle: subtitle || undefined,
        url: file.url,
        durationMs: durationMs || undefined,
        coverImage: file.thumbnail_url ?? null,
        resumeKey: key,
      },
      { startMs: started && !done ? positionMs : 0 }
    );
  };

  return (
    <button
      type="button"
      onClick={play}
      className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-4 rounded-tile px-2 py-3.5 text-start transition-colors hover:bg-canvas/40"
      aria-label={`${done ? "Play again" : started ? "Resume" : "Play"} ${file.title}`}
    >
      <span
        aria-hidden
        className={`flex h-14 shrink-0 items-center justify-center rounded-tile ${
          audio ? "w-14 bg-kind-audio text-kind-audio-ink" : "w-[4.75rem] bg-kind-video text-kind-video-ink"
        }`}
      >
        {audio ? (
          <WaveformIcon className="h-5 w-5" />
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round">
            <path d="M8 5.5v13l10-6.5-10-6.5Z" />
          </svg>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span lang={title.lang} className={`${title.className} hi-tight block truncate text-title font-semibold`}>
          {file.title}
        </span>
        <span className="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-sm text-ink-soft">
          {length && <span className="tabular-nums">{length}</span>}
          {percent !== null && (
            <Status text={done ? "Finished" : `Played ${percent}%`} done={done} />
          )}
        </span>
        {percent !== null && <RowBar percent={percent} done={done} />}
      </span>
      <span
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        style={{
          background: "color-mix(in srgb, var(--ws-color) 10%, var(--color-card))",
          color: "var(--ws-ink)",
        }}
      >
        <PlayIcon className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}
