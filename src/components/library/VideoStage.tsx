"use client";

import { useEffect } from "react";
import { VideoView } from "@/components/library/VideoView";
import { CloseIcon } from "@/components/shell/icons";
import { contentLang } from "@/lib/script";
import type { LibraryFile } from "@/lib/types";

/**
 * The video, full screen — the photo viewer's shell around a player.
 *
 * Deliberately the same object as `Lightbox`: a black field, the title and a
 * close button along the top, Escape and the page frozen behind it. Tapping a
 * photograph and tapping a recording should not open two different kinds of
 * full screen.
 */
export function VideoStage({ file, onClose }: { file: LibraryFile; onClose: () => void }) {
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
