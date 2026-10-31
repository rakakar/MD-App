"use client";

import { useCallback, useEffect, useState } from "react";
import { listSavedAudio, removeAllAudio, removeAudio, type SavedAudio } from "./audioCache";
import { chapterBytesByBook, listDownloads, removeDownload, type DownloadRecord } from "./idb";
import { refreshDownloaded } from "./offline";
import { catchUpDownloads, offlinePagesBytes, removeBookPages } from "./offlinePages";
import { listSavedPdfs, onSavedPdfsChange, removePdf, type SavedPdf } from "./pdfCache";

/**
 * Everything saved on this device — books, library PDFs and chapter audio —
 * with what each weighs and how to remove it. The Downloads page reads all of
 * it; Profile and Settings read only the totals.
 */
export function useDownloads() {
  const [books, setBooks] = useState<DownloadRecord[]>([]);
  const [bookBytes, setBookBytes] = useState<Record<string, number>>({});
  const [sharedBytes, setSharedBytes] = useState(0);
  const [pdfs, setPdfs] = useState<SavedPdf[]>([]);
  const [audio, setAudio] = useState<SavedAudio[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadBooks = useCallback(async () => {
    const [list, text, pages] = await Promise.all([
      listDownloads(),
      chapterBytesByBook(),
      offlinePagesBytes(),
    ]);
    // a book's size is its text plus the pages saved to show it
    const sizes = { ...text };
    for (const [code, n] of Object.entries(pages.byBook)) sizes[code] = (sizes[code] ?? 0) + n;
    setBooks(list.sort((a, b) => b.saved_at - a.saved_at));
    setBookBytes(sizes);
    setSharedBytes(pages.shared);
  }, []);

  const loadPdfs = useCallback(() => listSavedPdfs().then(setPdfs), []);
  const loadAudio = useCallback(() => listSavedAudio().then(setAudio), []);

  useEffect(() => {
    let live = true;
    void Promise.all([loadBooks(), loadPdfs(), loadAudio()]).finally(() => live && setLoaded(true));
    // Books downloaded before their pages were saved with them catch up here
    // as well as on app start (ServiceWorker.tsx); the sizes then include them.
    void catchUpDownloads().then(() => {
      if (live) void loadBooks();
    });
    const off = onSavedPdfsChange(() => void loadPdfs());
    return () => {
      live = false;
      off();
    };
  }, [loadBooks, loadPdfs, loadAudio]);

  const booksBytes =
    books.reduce((n, b) => n + (bookBytes[b.code] ?? 0), 0) + (books.length ? sharedBytes : 0);
  const pdfBytes = pdfs.reduce((n, p) => n + p.bytes, 0);
  const audioBytes = audio.reduce((n, a) => n + a.bytes, 0);

  const removeBook = useCallback(
    async (code: string) => {
      await removeDownload(code)
        .then(async () => removeBookPages(code, (await listDownloads()).length))
        .catch(() => undefined);
      await loadBooks();
      void refreshDownloaded();
    },
    [loadBooks]
  );

  return {
    loaded,
    books,
    bookBytes,
    pdfs,
    audio,
    booksBytes,
    pdfBytes,
    audioBytes,
    used: booksBytes + pdfBytes + audioBytes,
    removeBook,
    removePdf: useCallback(async (id: number) => {
      await removePdf(id);
      await loadPdfs();
    }, [loadPdfs]),
    removeAudio: useCallback(async (url: string) => {
      await removeAudio(url);
      await loadAudio();
    }, [loadAudio]),
    removeAllAudio: useCallback(async () => {
      await removeAllAudio();
      setAudio([]);
    }, []),
  };
}

/** "3 books · 2 PDFs · 12 audio" — what Profile says under Downloads */
export function downloadsSummary(d: { books: unknown[]; pdfs: unknown[]; audio: unknown[] }): string {
  const parts: string[] = [];
  if (d.books.length) parts.push(`${d.books.length} ${d.books.length === 1 ? "book" : "books"}`);
  if (d.pdfs.length) parts.push(`${d.pdfs.length} ${d.pdfs.length === 1 ? "PDF" : "PDFs"}`);
  if (d.audio.length) parts.push(`${d.audio.length} audio`);
  return parts.join(" · ");
}
