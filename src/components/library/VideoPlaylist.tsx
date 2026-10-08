"use client";

import { useCallback, useEffect, useState } from "react";
import { VideoStage } from "@/components/library/VideoStage";
import { videoSource } from "@/components/library/VideoView";
import { MediaRows } from "@/components/library/MediaRows";
import { PLAY_ALL } from "@/components/library/folderActions";
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

  // The hero's Play all starts the first part.
  useEffect(() => {
    const onPlayAll = () => files[0] && setOpen(files[0]);
    window.addEventListener(PLAY_ALL, onPlayAll);
    return () => window.removeEventListener(PLAY_ALL, onPlayAll);
  }, [files]);

  return (
    <>
      <MediaRows
        verb="watched"
        items={files.map((file) => {
          const src = videoSource(file.url);
          const posterId = src?.host === "youtube" ? src.id : null;
          const watched = seen[file.id] ?? 0;
          return {
            key: file.id,
            title: file.title,
            description: file.description,
            durationSeconds: file.duration_seconds,
            art: posterId ? (
              // poster from YouTube's image CDN; the player itself is the
              // IFrame API, which is what the PRD requires
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`https://i.ytimg.com/vi/${posterId}/hqdefault.jpg`}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : null,
            onPlay: () => setOpen(file),
            percent: file.duration_seconds ? Math.min(100, (watched / file.duration_seconds) * 100) : 0,
            menu: [{ label: "Open", onClick: () => setOpen(file) }],
            share: { title: file.title, url: file.url },
          };
        })}
      />
      {open && <VideoStage file={open} onClose={() => setOpen(null)} />}
    </>
  );
}
