"use client";

import { useCallback, useEffect, useState } from "react";
import { track } from "./analytics";
import { isPdfSavedSync, onSavedPdfsChange, removePdf, savePdf } from "./pdfCache";
import type { LibraryFile } from "./types";

export type SavedPdfStatus = "idle" | "saving" | "saved" | "failed";

/** One library PDF's offline copy: whether it is here, and saving or removing it. */
export function useSavedPdf(file: LibraryFile, folder: string) {
  const [status, setStatus] = useState<SavedPdfStatus>("idle");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const sync = () =>
      setStatus((s) => (s === "saving" || s === "failed" ? s : isPdfSavedSync(file.id) ? "saved" : "idle"));
    sync();
    return onSavedPdfsChange(sync);
  }, [file.id]);

  const save = useCallback(() => {
    setStatus("saving");
    setProgress(0);
    void savePdf(
      {
        id: file.id,
        node: file.node,
        title: file.title,
        url: file.url,
        thumbnail_url: file.thumbnail_url,
        page_count: file.page_count ?? null,
        folder,
        bytes: file.file_size,
      },
      setProgress
    ).then((ok) => {
      setStatus(ok ? "saved" : "failed");
      if (ok) track("pdf_save_offline");
    });
  }, [file, folder]);

  const remove = useCallback(() => {
    void removePdf(file.id).then(() => setStatus("idle"));
  }, [file.id]);

  return { status, progress, save, remove };
}
