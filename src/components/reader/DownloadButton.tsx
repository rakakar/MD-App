"use client";

import { useState } from "react";
import { CheckIcon, DownloadIcon } from "@/components/shell/icons";
import { HERO_PILL } from "@/components/ui/CollectionHero";
import { track } from "@/lib/analytics";
import { getChapter, getParibhashaIndex } from "@/lib/api";
import { ensureFullGlossary } from "@/lib/glossary";
import {
  listDownloads,
  markDownloaded,
  putCachedChapter,
  removeDownload,
} from "@/lib/idb";
import { keepDownloads, refreshDownloaded, useDownloadedBooks } from "@/lib/offline";
import {
  SHELL_PATHS,
  bookPagePaths,
  removeBookPages,
  saveBookPages,
} from "@/lib/offlinePages";
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
  /** `hero` is the 46px icon square inside the tinted book header (design 1C);
   *  `heroPill` the labelled one in the desktop hero's action row */
  variant?: "pill" | "hero" | "heroPill";
}) {
  // Whether the book is saved comes from the shared list, not this button's
  // own memory: the hero renders a phone and a desktop copy, and Downloads can
  // remove the book too, so every copy has to agree on what is on the device.
  const saved = useDownloadedBooks().has(book.code);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const status: Status = busy ? "downloading" : saved ? "done" : "idle";

  const download = async () => {
    if (busy) return;
    setBusy(true);
    setProgress(0);
    void keepDownloads();
    try {
      // Every step counts the same: a chapter's text, then each page that
      // shows it (the book's, each chapter's, the app's own way in). The
      // page count is taken from the same lists saveBookPages saves, so the
      // bar cannot run past 100% when they change. Pages are the slower half
      // (the first also brings the build files), so the bar moves on through
      // them rather than parking at a fixed mark.
      const numbers = book.chapters.map((c) => c.number);
      const steps =
        numbers.length + bookPagePaths(book.code, numbers).length + SHELL_PATHS.length;
      const show = (done: number) => setProgress(Math.min(99, Math.round((done / steps) * 100)));
      for (let i = 0; i < book.chapters.length; i++) {
        const ch = book.chapters[i];
        const payload = await getChapter(book.code, ch.number);
        await putCachedChapter(book.code, ch.number, payload);
        show(i + 1);
      }
      // The pages too, or the text could only be read in chapters already
      // visited online (lib/offlinePages). Best effort per page.
      await saveBookPages(book.code, numbers, {
        onEach: (done) => show(numbers.length + done),
      });
      setProgress(100);
      await markDownloaded({
        code: book.code,
        title_hi: book.title_hi,
        chapter_count: book.chapters.length,
        cover_image: book.cover_image,
      });
      await refreshDownloaded();
      track("book_download_offline");
    } catch {
      return;
    } finally {
      setBusy(false);
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
    // One stray tap on a ticked button should not throw away a book that took
    // a minute to save, so removing asks first, as Downloads does.
    if (!window.confirm(`Remove "${book.title_hi}" from this device? It will need a connection to read again.`)) return;
    await removeDownload(book.code);
    await removeBookPages(book.code, (await listDownloads()).length).catch(() => undefined);
    await refreshDownloaded();
  };

  if (variant === "heroPill") {
    // The desktop book hero's row, where the buttons carry words. "Offline"
    // rather than "Download": what it does is keep the book readable with no
    // connection, not hand over a file.
    const label =
      status === "done"
        ? "Saved for offline reading — press to remove"
        : status === "downloading"
          ? `Saving for offline reading, ${progress}%`
          : "Save for offline reading";
    return (
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={status === "done" ? remove : download}
        disabled={status === "downloading"}
        className={`${HERO_PILL} disabled:opacity-70`}
      >
        {status === "done" ? <CheckIcon className="h-4 w-4" /> : <DownloadIcon className="h-4 w-4" />}
        {status === "downloading" ? <span className="tabular-nums">{progress}%</span> : "Offline"}
      </button>
    );
  }

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
