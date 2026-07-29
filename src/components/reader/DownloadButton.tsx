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
export function DownloadButton({ book }: { book: BookDetail }) {
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

  if (status === "done") {
    return (
      <button
        type="button"
        onClick={remove}
        className="flex items-center gap-1.5 rounded-full border border-rule bg-white px-3 py-1.5 text-xs font-medium text-ink"
        title="Downloaded for offline reading — tap to remove"
      >
        <span
          className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] text-white"
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
      className="flex items-center gap-1.5 rounded-full border border-rule bg-white px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-60"
    >
      <DownloadIcon className="h-4 w-4" />
      {status === "downloading" ? `Downloading ${progress}%` : "Download for offline"}
    </button>
  );
}
