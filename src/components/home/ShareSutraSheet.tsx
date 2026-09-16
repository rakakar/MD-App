"use client";

import { useEffect, useRef, useState } from "react";
import { DownloadIcon, ShareIcon } from "@/components/shell/icons";
import { Sheet } from "@/components/ui/Sheet";
import { ctaPrimaryBar } from "@/components/ui";
import { track } from "@/lib/analytics";
import { renderSutraCard, sutraCardFilename } from "@/lib/sutraCard";
import { APP_ACCENT } from "@/lib/workspaceConfig";

/**
 * **Share sutra** — the sheet the card's Share button opens.
 *
 * Share used to hand the OS a line of text. A verse pasted as text arrives in a
 * chat stripped of the book it came from and of any sense that it was given
 * rather than typed; as a picture it arrives whole, and it is the form these
 * actually travel in. So the button now opens a preview of what will be sent,
 * and the reader chooses where it goes.
 *
 * The preview is not a mock-up of the file. It *is* the file — the same bitmap
 * the canvas produced, shown as an object URL — so what is on screen and what
 * lands in the chat cannot disagree.
 */
export function ShareSutraSheet({
  open,
  onClose,
  text,
  source,
  citation,
  date,
}: {
  open: boolean;
  onClose: () => void;
  text: string;
  source: string;
  /**
   * The verse as the app has always written it out — `citationText`. Kept as
   * the payload for a browser that cannot share a file, so that path is
   * unchanged from before this sheet existed rather than reinvented here.
   */
  citation: string;
  /** the verse's own date, which is what the saved file is named after */
  date: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const blobRef = useRef<Blob | null>(null);

  // Drawn when the sheet opens, not on mount: most readers never press Share,
  // and this loads a 75KB plate and two font faces to do its job.
  useEffect(() => {
    if (!open) return;
    let dead = false;
    let objectUrl: string | null = null;
    setFailed(false);

    renderSutraCard({ text, source })
      .then((blob) => {
        if (dead) return;
        blobRef.current = blob;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!dead) setFailed(true);
      });

    return () => {
      dead = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
      blobRef.current = null;
    };
  }, [open, text, source]);

  const file = () =>
    blobRef.current
      ? new File([blobRef.current], sutraCardFilename(date), { type: "image/png" })
      : null;

  const share = async () => {
    const f = file();
    if (!f) return;
    track("sutra_share");
    try {
      if (navigator.canShare?.({ files: [f] })) {
        await navigator.share({ files: [f] });
        return;
      }
      // No file sharing here — a desktop browser, usually. Fall back to the
      // text share the card had before this sheet existed rather than to
      // nothing.
      if (navigator.share) {
        await navigator.share({ text: citation });
        return;
      }
      await navigator.clipboard.writeText(citation);
    } catch {
      // cancelled, which is not an error and is not worth a dialog
    }
  };

  const download = async () => {
    const f = file();
    if (!f || !url) return;
    track("sutra_card_download");
    // **On iOS an `<a download>` does not save anything.** The attribute is
    // there and the click does nothing useful — in a standalone PWA least of
    // all. Save to Photos lives in the share sheet, so on iOS that *is* the
    // download, and sending the reader there is the honest version of this
    // button rather than a control that silently fails.
    if (IS_IOS && navigator.canShare?.({ files: [f] })) {
      try {
        await navigator.share({ files: [f] });
      } catch {
        // cancelled
      }
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = sutraCardFilename(date);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Share sutra" accent={APP_ACCENT}>
      {/* 3:4, held whatever the card is doing, so the sheet does not jump to
          its full height the moment the bitmap arrives. */}
      <div className="mx-auto aspect-3/4 w-full max-w-sm overflow-hidden rounded-card border border-rule bg-inset">
        {url ? (
          /* eslint-disable-next-line @next/next/no-img-element -- an object URL
             for a bitmap this browser just drew: there is nothing for a loader
             to optimise and next/image cannot take a blob. */
          <img
            src={url}
            alt={`${text} — ${source}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-sm text-muted"
            role="status"
          >
            {failed ? "Could not draw the card" : "Preparing…"}
          </div>
        )}
      </div>

      <div className="mt-5 flex gap-3 pb-1">
        <button
          type="button"
          onClick={share}
          disabled={!url}
          className={`${ctaPrimaryBar} flex-1 disabled:opacity-50`}
          style={{ background: "var(--ws-color)" }}
        >
          <ShareIcon className="h-4 w-4" />
          Share
        </button>
        <button
          type="button"
          onClick={download}
          disabled={!url}
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-control border border-rule bg-card px-4 text-sm font-semibold text-ink transition-colors disabled:opacity-50"
        >
          <DownloadIcon className="h-4 w-4" />
          {IS_IOS ? "Save" : "Download"}
        </button>
      </div>
    </Sheet>
  );
}

/**
 * A user-agent test, and there is no better one available: nothing in the
 * platform reports whether `<a download>` will actually write a file, and on
 * iOS it does not. Worst case the sniff is wrong and the reader gets a share
 * sheet with Save to Photos in it, which is where they were going anyway.
 */
const IS_IOS =
  typeof navigator !== "undefined" &&
  (/iP(hone|ad|od)/.test(navigator.userAgent) ||
    // iPadOS reports itself as a Mac; the touch points are the giveaway.
    (/Mac/.test(navigator.userAgent) && navigator.maxTouchPoints > 1));
