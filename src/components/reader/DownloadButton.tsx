"use client";

import { useEffect, useState } from "react";
import { DownloadIcon } from "@/components/shell/icons";
import { track } from "@/lib/analytics";
import { getChapter, getParibhashaIndex } from "@/lib/api";
import { ensureFullGlossary } from "@/lib/glossary";
import {
  getDownload,
  markDownloaded,
  putCachedChapter,
  removeDownload,
} from "@/lib/idb";
import type { BookDetail } from "@/lib/types";

type Status = "idle" | "downloading" | "done";

/**
 * Per-book offline download (PRD §5): fetch every chapter into IndexedDB;
 * the reader serves cache transparently offline. Figures are inline base64,
 * so a downloaded book is self-contained.
 */
export function DownloadButton({
  book,
  variant = "pill",
}: {
  book: BookDetail;
  /** `hero` is the 46px icon square inside the tinted book header (design 1C) */
  variant?: "pill" | "hero";
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    void getDownload(book.code).then((d) => {
      if (d) setStatus("done");
    });
  }, [book.code]);

  const download = async () => {
    setStatus("downloading");
    setProgress(0);
    try {
      for (let i = 0; i < book.chapters.length; i++) {
        const ch = book.chapters[i];
        const payload = await getChapter(book.code, ch.number);
        await putCachedChapter(book.code, ch.number, payload);
        setProgress(Math.round(((i + 1) / book.chapters.length) * 100));
      }
      await markDownloaded({
        code: book.code,
        title_hi: book.title_hi,
        chapter_count: book.chapters.length,
      });
      track("book_download_offline");
      setStatus("done");
    } catch {
      setStatus("idle");
      return;
    }

    // The dictionary comes along. "Available offline" has to mean the book
    // works on a train, and a word a reader cannot look up there is exactly
    // the gap this button is supposed to close. 143 KB against a book of
    // several MB, fetched after the chapters so it never delays them, and a
    // failure here leaves a perfectly good download alone.
    try {
      const { version } = await getParibhashaIndex();
      await ensureFullGlossary(version);
    } catch {
      // the book is downloaded either way
    }
  };

  const remove = async () => {
    await removeDownload(book.code);
    setStatus("idle");
  };

  if (variant === "hero") {
    // On the hero the button is an icon square, so its state has to be legible
    // without the words the pill uses: a tick over the arrow when the book is
    // downloaded, the running percentage while it is downloading. The label is
    // still spelled out for anyone not reading the glyph.
    const label =
      status === "done"
        ? "Downloaded — tap to remove"
        : status === "downloading"
          ? `Downloading ${progress}%`
          : "Download for offline";
    return (
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={status === "done" ? remove : download}
        disabled={status === "downloading"}
        className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-control border border-white/25 bg-white/12 text-white transition-colors hover:bg-white/20 disabled:opacity-70"
      >
        {status === "downloading" ? (
          <span className="text-xs font-bold tabular-nums">{progress}%</span>
        ) : (
          <DownloadIcon className="h-5 w-5" />
        )}
        {status === "done" && (
          <span
            aria-hidden
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-black/20"
            style={{ background: "var(--color-accent)" }}
          >
            ✓
          </span>
        )}
      </button>
    );
  }

  if (status === "done") {
    return (
      <button
        type="button"
        onClick={remove}
        className="flex items-center gap-1.5 rounded-full border border-rule bg-card px-3 py-1.5 text-xs font-medium text-ink"
        title="Downloaded for offline reading — tap to remove"
      >
        <span
          className="flex h-4 w-4 items-center justify-center rounded-full text-xs text-white"
          style={{ background: "var(--ws-color)" }}
        >
          ✓
        </span>
        Available offline
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={status === "downloading"}
      className="flex items-center gap-1.5 rounded-full border border-rule bg-card px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-60"
    >
      <DownloadIcon className="h-4 w-4" />
      {status === "downloading" ? `Downloading ${progress}%` : "Download for offline"}
    </button>
  );
}
