"use client";

import { ViewToggle, useCollectionView } from "@/components/library/CollectionLayout";
import { RowMenu, type RowMenuItem } from "@/components/library/RowMenu";
import { parseMediaTitle } from "@/components/library/folderActions";
import { formatDuration } from "@/components/library/format";
import { PlayIcon } from "@/components/shell/icons";
import { contentLang } from "@/lib/script";

/**
 * **A folder's recordings, as a list or a grid** (designer's comps, 8 Oct
 * 2026) — one component for videos and audio, which are the same object here:
 * a picture, which part it is, what it is about, how long, and a way to play.
 *
 * The list is the default: the parts of one sammelan share one face, and what
 * tells them apart is the subject, which a list row gives the width to. The
 * grid is there for the reader who finds by picture.
 *
 * Titles named "Series - Part 3 | subject | theme" are split into those three,
 * so "Part 3" is a small accent line and the subject is the title; any other
 * name is shown whole.
 */
export interface MediaItem {
  key: string | number;
  title: string;
  description?: string | null;
  durationSeconds?: number | null;
  /** the picture — a poster, the portrait or a glyph, already sized to fill */
  art: React.ReactNode;
  onPlay: () => void;
  /** this one is playing now */
  active?: boolean;
  /** 0–100 watched or listened, from the local playhead */
  percent?: number;
  menu: RowMenuItem[];
  share: { title: string; url: string };
}

export function MediaRows({ items, verb }: { items: MediaItem[]; verb: "watched" | "listened" }) {
  const [view, setView] = useCollectionView("list");

  return (
    <>
      <div className="mb-3 flex">
        <ViewToggle view={view} onView={setView} />
      </div>
      {view === "grid" ? (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-3">
          {items.map((it) => (
            <li key={it.key}>
              <GridCard item={it} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-rule rounded-2xl border border-rule bg-card [&>li:first-child>*]:rounded-t-2xl [&>li:last-child>*]:rounded-b-2xl">
          {/* Not `overflow-hidden`: it clipped the last rows' ⋯ menus at the
              list's foot. The end rows round their own hover and picked fill
              instead, which is all the clip was for. */}
          {items.map((it) => (
            <li key={it.key}>
              <ListRow item={it} verb={verb} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ListRow({ item, verb }: { item: MediaItem; verb: string }) {
  const { part, title, subtitle } = parseMediaTitle(item.title);
  const sub = subtitle ?? item.description ?? undefined;
  const t = contentLang(title);
  const length = formatDuration(item.durationSeconds);

  return (
    <div className="group relative flex items-center gap-3 px-3 py-3 transition-colors hover:bg-ink/[.03] sm:gap-4 sm:px-4">
      <span className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-black sm:w-32">
        {item.art}
        <span className="absolute inset-0 flex items-center justify-center">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition-transform group-hover:scale-110"
            style={
              item.active
                ? { background: "var(--ws-color)", color: "white" }
                : { background: "rgb(255 255 255 / 0.92)", color: "var(--ws-ink)" }
            }
          >
            <PlayIcon className="ms-0.5 h-3.5 w-3.5" />
          </span>
        </span>
        {/* Phone: the length rides the picture, where the row has no column for it. */}
        {length && (
          <span className="absolute bottom-1 end-1 rounded bg-black/80 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-white sm:hidden">
            {length}
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        {part && (
          <span className="block text-xs font-semibold" style={{ color: "var(--ws-ink)" }}>
            {part}
          </span>
        )}
        <button
          type="button"
          onClick={item.onPlay}
          aria-label={`Play ${item.title}`}
          {...t}
          className={`${t.className} hi-tight line-clamp-2 text-start text-sm font-semibold after:absolute after:inset-0 group-hover:underline sm:text-base`}
        >
          {title}
        </button>
        {sub && (
          <span
            {...contentLang(sub)}
            className={`${contentLang(sub).className} mt-0.5 line-clamp-1 block text-xs text-ink-soft sm:text-sm`}
          >
            {sub}
          </span>
        )}
        {(item.percent ?? 0) > 1 && (
          <span className="mt-1.5 flex items-center gap-2">
            <span aria-hidden className="h-1 max-w-48 flex-1 overflow-hidden rounded-full bg-ink/10">
              <span className="block h-full rounded-full bg-(--ws-ink)" style={{ width: `${item.percent}%` }} />
            </span>
            <span className="shrink-0 text-xs font-medium tabular-nums text-ink-soft">
              {Math.round(item.percent ?? 0)}% {verb}
            </span>
          </span>
        )}
      </span>

      {length && (
        <span className="hidden shrink-0 text-sm tabular-nums text-ink-soft sm:block">{length}</span>
      )}
      <RowMenu items={item.menu} share={item.share} label={title} />
    </div>
  );
}

function GridCard({ item }: { item: MediaItem }) {
  const { part, title } = parseMediaTitle(item.title);
  const t = contentLang(title);
  const length = formatDuration(item.durationSeconds);
  return (
    <button
      type="button"
      onClick={item.onPlay}
      aria-label={`Play ${item.title}`}
      className="group block w-full text-start"
    >
      <span className="relative block aspect-video overflow-hidden rounded-card bg-black">
        {item.art}
        <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90" style={{ color: "var(--ws-ink)" }}>
            <PlayIcon className="ms-0.5 h-4.5 w-4.5" />
          </span>
        </span>
        {length && (
          <span className="absolute bottom-2 end-2 rounded-md bg-black/75 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-white">
            {length}
          </span>
        )}
        {(item.percent ?? 0) > 1 && (
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-white/30">
            <span className="block h-full" style={{ width: `${item.percent}%`, background: "var(--ws-color)" }} />
          </span>
        )}
      </span>
      {part && (
        <span className="mt-2.5 block text-xs font-semibold" style={{ color: "var(--ws-ink)" }}>
          {part}
        </span>
      )}
      <span {...t} className={`${t.className} hi-tight ${part ? "mt-0.5" : "mt-2.5"} line-clamp-2 block text-sm font-medium group-hover:underline`}>
        {title}
      </span>
    </button>
  );
}
