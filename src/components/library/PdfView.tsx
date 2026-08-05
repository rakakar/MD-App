"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { PdfReader } from "@/components/library/PdfReader";
import { formatBytes } from "@/components/library/format";
import { DownloadIcon } from "@/components/shell/icons";
import { savePdfPage } from "@/lib/personal";
import { getPdfPlace, setPdfPlace } from "@/lib/storage";

/**
 * A PDF, read **in the app** — download offered, never forced (contract §13.4,
 * §13.9).
 *
 * This used to be an `<iframe>` and nothing else, which worked and cost the
 * library its only untracked material: a browser's built-in viewer is a
 * cross-origin black box, so a reader's place in a 390-page document could
 * never be saved. `PdfReader` is here to answer that one question, and this
 * component decides when to trust it.
 *
 * **Our reader by default, the native one as a fallback.** Not a size rule
 * deciding in advance — a rule in bytes cannot know that a 6 MB file on a
 * failing connection is the slow one and a 25 MB file on office wifi is not.
 * `PdfReader` reports failure when a document does not open in time, and this
 * puts the reader on the iframe when it does. Prediction where prediction is
 * cheap (the weight is on the button, before a byte moves), measurement where
 * it is not.
 *
 * `open` gates everything on a tap for a file inside a collection: a shivir
 * bundle holding six PDFs would otherwise start six multi-megabyte downloads
 * on a phone the moment the page opened. A PDF-only book is the page itself,
 * so it opens expanded.
 */

/**
 * Above this, the button warns before it costs anything.
 *
 * Measured rather than chosen: across the library's PDFs, time to first page
 * stays under 250 ms to 13.5 MB and jumps roughly fifteenfold at 24.9 MB. The
 * threshold sits in the empty gap between, so no file is near enough to the
 * line for a re-export to flip it. It changes what the reader is *told*, never
 * which viewer they get — that is the fallback's job, and its job alone.
 */
const HEAVY_BYTES = 20 * 1024 * 1024;

export function PdfView({
  url,
  title,
  expanded = false,
  itemId = null,
  pageCount = null,
  fileSize = null,
  openAt = null,
}: {
  url: string;
  title: string;
  /** open the viewer immediately — for a page that *is* the document */
  expanded?: boolean;
  /**
   * Open straight to this page — a resume card arriving from another screen.
   * The card already knows where the reader was, so the document opens rather
   * than waiting behind the tap that guards every other file on the page.
   */
  openAt?: number | null;
  /**
   * The library file's id. Null for a book's own PDF, which is addressed by
   * book code and has no `item:` row to save a place against — so that one
   * reads perfectly well and simply remembers nothing.
   */
  itemId?: number | null;
  pageCount?: number | null;
  fileSize?: number | null;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(expanded || openAt !== null);
  const [native, setNative] = useState(false);
  const [slow, setSlow] = useState(false);
  const [place, setPlace] = useState<number>(openAt ?? 1);
  const signedIn = Boolean(user);
  const key = itemId === null ? null : `library-file:${itemId}`;
  const heavy = (fileSize ?? 0) >= HEAVY_BYTES;

  // The saved page is read once, on the way in — re-reading it as the reader
  // scrolls would fight the scrolling. A page named in the link wins: it is
  // the same fact from the card the reader just tapped, and it is the one that
  // cannot be stale.
  useEffect(() => {
    if (!key || openAt !== null) return;
    const saved = getPdfPlace(key);
    if (saved) setPlace(saved.page);
  }, [key, openAt]);

  const latest = useRef<number | null>(null);

  const onPage = useCallback(
    (page: number, count: number) => {
      if (!key || itemId === null) return;
      latest.current = page;
      // Local first and every time, as everywhere else in the app: this is
      // what makes resume instant and survive being offline, signed in or not.
      setPdfPlace(key, page, { pageCount: count });
      savePdfPage(itemId, page, signedIn);
    },
    [key, itemId, signedIn]
  );

  // A closed tab is the commonest way reading ends, and the throttle in
  // `savePdfPage` means the last few pages are usually still unsent.
  useEffect(() => {
    if (itemId === null) return;
    const flush = () => {
      if (latest.current !== null) {
        savePdfPage(itemId, latest.current, signedIn, { flush: true });
      }
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [itemId, signedIn]);

  const onFail = useCallback(() => setNative(true), []);
  const onSlow = useCallback(() => setSlow(true), []);

  const facts = [
    pageCount ? `${pageCount} ${pageCount === 1 ? "page" : "pages"}` : null,
    formatBytes(fileSize) || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      {open ? (
        native ? (
          <NativeFallback url={url} title={title} />
        ) : (
          <>
            <PdfReader
              url={url}
              title={title}
              startPage={place}
              onPage={key ? onPage : undefined}
              onSlow={onSlow}
              onFail={onFail}
            />
            {/* An offer, not a switch. The document is still loading behind
                this and usually still arrives; a reader out of patience can
                take the browser's viewer instead, and one who waits keeps the
                reader that remembers their page. */}
            {slow && (
              <div className="mt-2 rounded-xl border border-rule bg-card p-3">
                <p className="text-xs text-ink-soft">
                  This one is taking a while — it is a large document, and the
                  first PDF you open also loads the reader itself.
                </p>
                <button
                  type="button"
                  onClick={() => setNative(true)}
                  className="mt-2 text-xs font-semibold underline underline-offset-2"
                  style={{ color: "var(--ws-ink)" }}
                >
                  Open it in your browser&apos;s viewer instead
                </button>
              </div>
            )}
          </>
        )
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-xl border border-rule bg-card px-4 py-3 text-left"
          style={{ color: "var(--ws-ink)" }}
        >
          <span className="text-sm font-semibold">
            {place > 1 ? `Resume on page ${place}` : "Read here"}
          </span>
          {/* The weight, before a byte moves. The old button downloaded 97 MB
              on whatever connection the reader happened to be on and said
              nothing at all about it. */}
          {facts && (
            <span className="mt-0.5 block text-xs font-medium text-ink-soft">
              {facts}
              {heavy && " · large file, slow on mobile data"}
            </span>
          )}
        </button>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
          style={{ color: "var(--ws-ink)" }}
        >
          Open in a new tab
        </a>
        <a
          href={url}
          download
          className="inline-flex items-center gap-1 underline underline-offset-2"
          style={{ color: "var(--ws-ink)" }}
        >
          <DownloadIcon className="h-3.5 w-3.5" />
          <span>Download</span>
        </a>
      </div>
    </div>
  );
}

/**
 * The browser's own viewer — **only where the browser actually has one.**
 *
 * An `<iframe>` pointed at a PDF is not a universal fallback. Desktop Chrome,
 * Firefox and Safari render one inline; **Chrome on Android has no inline PDF
 * viewer at all** and draws a grey placeholder with a Download button instead.
 * So the first version of this shipped a "fallback" that, on the platform most
 * of these readers use, fell back to nothing — a stub where a document should
 * be, with the app's own theme nowhere in sight.
 *
 * `navigator.pdfViewerEnabled` is the standard answer to exactly this question
 * and is what decides here. Where it says no, the honest thing is to hand the
 * file over rather than frame a placeholder: the system's PDF app opens it
 * properly, which is more than the iframe was ever going to do.
 *
 * Resolved in an effect rather than during render because the server has no
 * `navigator`, and guessing before hydration would flash the wrong one.
 */
function NativeFallback({ url, title }: { url: string; title: string }) {
  const [canFrame, setCanFrame] = useState<boolean | null>(null);

  useEffect(() => {
    setCanFrame(navigator.pdfViewerEnabled ?? false);
  }, []);

  if (canFrame === null) return null; // one paint, not two

  return (
    <div>
      {canFrame ? (
        <iframe
          src={url}
          title={title}
          className="h-[75vh] w-full rounded-xl border border-rule bg-card"
        />
      ) : (
        <div className="rounded-xl border border-rule bg-card p-4">
          <p className="text-sm font-semibold">Opening this outside the app</p>
          <p className="mt-1 text-xs text-ink-soft">
            Your browser can&apos;t show a PDF inside a page, so this one opens
            in whichever app your phone uses for documents.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
            style={{ background: "var(--ws-color)" }}
          >
            Open the document
          </a>
        </div>
      )}
      {/* Said plainly rather than left to be noticed. A reader who was promised
          their place would be kept deserves to know why this one will not keep
          it — and that the in-app reader is one reload away. */}
      <p className="mt-2 text-xs text-ink-soft">
        Read this way, your page isn&apos;t remembered and the app&apos;s theme
        doesn&apos;t apply. Reload the page to try the in-app reader again.
      </p>
    </div>
  );
}
