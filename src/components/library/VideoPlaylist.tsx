"use client";

import { useCallback, useEffect, useState } from "react";
import { BreadcrumbLine } from "@/components/library/NodeCard";
import { VideoView, videoSource } from "@/components/library/VideoView";
import { formatDuration } from "@/components/library/format";
import { CloseIcon, PlayIcon } from "@/components/shell/icons";
import { contentLang } from "@/lib/script";
import { getPlayhead } from "@/lib/storage";
import type { LibraryFile, LocatedFile } from "@/lib/types";

type Row = LibraryFile | LocatedFile;

/**
 * A collection's videos as a playlist — **a list to choose from, and one
 * screen to watch on**.
 *
 * The grid of 16:9 cards this replaced spent a screen and a half on posters
 * that are all the same man at the same sammelan, and pushed the titles, which
 * are the only thing telling fourteen parts apart, to the foot of each tile. A
 * row is a small poster, its length, and the title beside it — the shape every
 * catalogue of recordings a reader has ever used already has.
 *
 * **Tapping a row opens the video full screen.** Playing it in place looked
 * cheaper and was worse: a 16:9 player inside a list is small on the screen
 * where watching actually happens, it pushes the rest of the list down the
 * moment it appears, and it leaves two things — a list and a player — asking
 * for the same attention. Full screen is one thing at a time, and it is what
 * the reader asked for by tapping.
 *
 * **Closing it is what updates the bar underneath.** The playhead is written by
 * `useKeepPlace` on the way out, and the bars are re-read after the player has
 * gone: an effect on the open file runs after the child's teardown, so what the
 * list shows is where the reader actually stopped rather than where they were a
 * poll ago.
 */
export function VideoPlaylist({ files }: { files: Row[] }) {
  const [open, setOpen] = useState<Row | null>(null);
  /** file id → seconds watched, read from the local playheads */
  const [seen, setSeen] = useState<Record<number, number>>({});

  const readProgress = useCallback(() => {
    const next: Record<number, number> = {};
    for (const file of files) {
      const ms = getPlayhead(`library-file:${file.id}`);
      if (ms) next[file.id] = ms / 1000;
    }
    setSeen(next);
  }, [files]);

  // On mount — the playheads are localStorage, which the server does not have,
  // so the bars can only be drawn once the client is running — and again every
  // time the player closes.
  useEffect(() => {
    readProgress();
  }, [readProgress, open]);

  return (
    <>
      {/* The row carries 4px of padding for its hover shape to sit in, and the
          page 16 — so the list's own edge, the thumbnail, lands at 20 from the
          screen and 20 under the hero. `-mt-1` takes the first row's padding
          back out of the section's 20 rather than adding to it. */}
      <ul className="-mt-1 flex flex-col gap-1">
        {files.map((file) => (
          <li key={file.id}>
            <PlaylistRow
              file={file}
              watched={seen[file.id] ?? 0}
              onOpen={() => setOpen(file)}
            />
          </li>
        ))}
      </ul>
      {open && <VideoStage file={open} onClose={() => setOpen(null)} />}
    </>
  );
}

/**
 * One line — poster, length, title.
 *
 * Three facts, and only three, because those are the three this app actually
 * has. A YouTube row also carries a channel, a view count and an age; the BE
 * knows none of them for a library file, and a row that invented somewhere to
 * put them would be a row with three holes in it.
 *
 * The bar under the poster is the exception worth having: the playhead is kept
 * for every video already, so "you are eleven minutes into this one" is a fact
 * this app *does* hold — and it is the one a reader coming back to a
 * fourteen-part shivir most wants to read off the list.
 */
function PlaylistRow({
  file,
  watched,
  onOpen,
}: {
  file: Row;
  /** seconds of it already watched, from the local playhead */
  watched: number;
  onOpen: () => void;
}) {
  const t = contentLang(file.title);
  const src = videoSource(file.url);
  const posterId = src?.host === "youtube" ? src.id : null;
  const length = formatDuration(file.duration_seconds);
  const percent = file.duration_seconds
    ? Math.min(100, (watched / file.duration_seconds) * 100)
    : 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Play ${file.title}`}
      className="group flex w-full items-start gap-3 rounded-card p-1 text-start transition-colors hover:bg-ink/[.04]"
    >
      <span className="relative aspect-video w-[38%] max-w-[10.5rem] shrink-0 overflow-hidden rounded-lg bg-black">
        {posterId && (
          // poster from YouTube's image CDN; the player itself is the IFrame
          // API, which is what the PRD requires
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://i.ytimg.com/vi/${posterId}/hqdefault.jpg`}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
          />
        )}
        <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white">
            <PlayIcon className="h-4 w-4" />
          </span>
        </span>
        {length && (
          <span className="absolute bottom-1 end-1 rounded bg-black/80 px-1.5 py-1 text-xs font-semibold leading-none tabular-nums text-white">
            {length}
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1 py-0.5">
        {"breadcrumb" in file && file.breadcrumb.length > 0 && (
          <BreadcrumbLine steps={file.breadcrumb} />
        )}
        <span
          {...t}
          className={`${t.className} hi-tight line-clamp-2 text-sm font-semibold group-hover:underline`}
        >
          {file.title}
        </span>
        {file.description && (
          <span
            {...contentLang(file.description)}
            className={`${contentLang(file.description).className} mt-1 line-clamp-1 text-xs text-ink-soft`}
          >
            {file.description}
          </span>
        )}
        {/*
          Under the title, with the figure said out loud.

          It was a hairline across the foot of the poster, YouTube's own
          placement — and at 160px wide over a photograph of a man in a white
          shawl it was not a thing anyone would notice unless they were looking
          for it. Out here it has the row's own width, a track to be read
          against, and the one number that makes it worth drawing: a reader
          scanning fourteen parts for the one they are halfway through can now
          do it without opening any of them.
        */}
        {percent > 1 && (
          <span className="mt-1.5 flex items-center gap-2">
            <span
              aria-hidden
              className="h-1 flex-1 overflow-hidden rounded-full bg-ink/10"
            >
              <span
                className="block h-full rounded-full bg-(--ws-ink)"
                style={{ width: `${percent}%` }}
              />
            </span>
            <span className="shrink-0 text-xs font-medium tabular-nums text-ink-soft">
              {Math.round(percent)}% watched
            </span>
          </span>
        )}
      </span>
    </button>
  );
}

/**
 * The video, full screen — the photo viewer's shell around a player.
 *
 * Deliberately the same object as `Lightbox`: a black field, the title and a
 * close button along the top, Escape and the page frozen behind it. Tapping a
 * photograph and tapping a recording should not open two different kinds of
 * full screen.
 */
function VideoStage({ file, onClose }: { file: Row; onClose: () => void }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const t = contentLang(file.title);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={file.title}
      className="fixed inset-0 z-50 flex flex-col bg-black/95 pt-[env(safe-area-inset-top)]"
    >
      <div className="flex items-start gap-3 p-3 text-white">
        <p {...t} className={`${t.className} hi-tight min-w-0 flex-1 text-sm font-semibold`}>
          {file.title}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close video"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-white/10 text-white"
        >
          <CloseIcon />
        </button>
      </div>
      {/* Centred in what is left, at its own ratio: a 16:9 recording stretched
          to a phone's 19.5:9 portrait screen would be either cropped or
          letterboxed twice over. */}
      <div className="flex flex-1 items-center justify-center px-3 pb-[env(safe-area-inset-bottom)]">
        <div className="w-full">
          <VideoView file={file} layout="full" />
        </div>
      </div>
    </div>
  );
}
