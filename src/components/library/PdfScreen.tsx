"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { PdfFallback } from "@/components/library/PdfFallback";
import { PdfReader } from "@/components/library/PdfReader";
import { savePdfPage } from "@/lib/personal";
import { getPdfPlace, setPdfPlace } from "@/lib/storage";
import type { LibraryFile } from "@/lib/types";

/**
 * A document, read on the whole screen.
 *
 * This is the second attempt at the shape and the first one worth keeping. A
 * PDF first opened *inside* the library page — a 75vh box in a card, under a
 * header and over a bottom nav, with five other files below it. It saved the
 * reader's place, which was the point, and it made the reading worse than the
 * browser's own viewer it replaced, which lost the argument: a place kept in a
 * document nobody wants to read in is not a feature. `routes.ts` had already
 * settled this for the book reader — reading owns the viewport — and a PDF is
 * reading.
 *
 * What lives here rather than in `PdfReader` is everything about *this file*:
 * where the place is stored, who to tell about it, and what to do when the
 * reader cannot run. The reader below knows about pages and canvases and
 * nothing else.
 */
export function PdfScreen({
  file,
  backHref,
  openAt = null,
  textHref,
}: {
  file: LibraryFile;
  /** the folder it lives in — where Back goes */
  backHref: string;
  /** a page named in the link, from a resume card */
  openAt?: number | null;
  /** the same document as text, where there is one (Compilations.md §9) */
  textHref?: string;
}) {
  const { user } = useAuth();
  const signedIn = Boolean(user);
  const key = `library-file:${file.id}`;

  const [failure, setFailure] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  // Resolved before the reader mounts, so it opens *at* the saved page rather
  // than opening at page one and jumping.
  const [start, setStart] = useState<number | null>(null);

  useEffect(() => {
    if (openAt !== null) {
      setStart(openAt); // the link wins: it is the card the reader just tapped
      return;
    }
    setStart(getPdfPlace(key)?.page ?? 1);
  }, [key, openAt]);

  const latest = useRef<number | null>(null);

  const onPage = useCallback(
    (page: number, count: number) => {
      latest.current = page;
      // Local first and every time, as everywhere else in the app: this is what
      // makes resume instant and survive being offline, signed in or not.
      setPdfPlace(key, page, { pageCount: count });
      savePdfPage(file.id, page, signedIn);
    },
    [key, file.id, signedIn]
  );

  // A closed tab is the commonest way reading ends, and the throttle inside
  // `savePdfPage` means the last few pages are usually still unsent.
  useEffect(() => {
    const flush = () => {
      if (latest.current !== null) {
        savePdfPage(file.id, latest.current, signedIn, { flush: true });
      }
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [file.id, signedIn]);

  const onSlow = useCallback(() => setSlow(true), []);
  const onFail = useCallback((detail: string) => setFailure(detail), []);

  if (failure !== null) {
    return (
      <PdfFallback
        url={file.url}
        title={file.title}
        detail={failure}
        backHref={backHref}
        textHref={textHref}
      />
    );
  }

  if (start === null) return null; // one paint, at the right page

  return (
    <>
      <PdfReader
        url={file.url}
        title={file.title}
        startPage={start}
        backHref={backHref}
        textHref={textHref}
        fileSize={file.file_size}
        // The same key the place is saved under — how a document was being
        // looked at is part of picking it up where it was left.
        stateKey={key}
        onPage={onPage}
        onSlow={onSlow}
        onFail={onFail}
      />
      {/* An offer, not a switch. The document is still loading behind this and
          usually still arrives; a reader out of patience can take the browser's
          viewer, and one who waits keeps the reader that remembers their page.
          Floated over the reader so taking the screen back costs nothing. */}
      {slow && (
        <div
          className="fixed inset-x-0 z-30 mx-auto max-w-md px-4"
          style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
        >
          <div className="rounded-2xl border border-rule bg-card p-3 shadow-lg">
            <p className="text-xs text-ink-soft">
              Taking a while — this is a large document, and the first PDF you
              open also loads the reader itself.
            </p>
            {/* Empty rather than a message: this is a choice, not a fault, so
                the fallback shows no diagnostic line under it. */}
            <button
              type="button"
              onClick={() => setFailure("")}
              className="mt-2 text-xs font-semibold underline underline-offset-2"
              style={{ color: "var(--ws-ink)" }}
            >
              Open it in your browser&apos;s viewer instead
            </button>
          </div>
        </div>
      )}
    </>
  );
}
