"use client";

import { useEffect, useRef, useState } from "react";
import { DownloadIcon, ShareIcon } from "@/components/shell/icons";
import { Sheet } from "@/components/ui/Sheet";
import { ctaPrimaryBar } from "@/components/ui";
import { track } from "@/lib/analytics";
import {
  renderSutraCard,
  SUTRA_PLATES,
  sutraCardFilename,
  type SutraPlate,
} from "@/lib/sutraCard";
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
  /**
   * Which painting. Deliberately not remembered between sheets: the choice
   * belongs to the verse being sent rather than to the reader, and a stored
   * preference would quietly make every card they ever send the same one,
   * which is the thing having several of them is meant to avoid.
   */
  const [plate, setPlate] = useState<SutraPlate>(SUTRA_PLATES[0]);
  const blobRef = useRef<Blob | null>(null);

  // Drawn when the sheet opens, not on mount: most readers never press Share,
  // and this loads a 75KB plate and two font faces to do its job.
  useEffect(() => {
    if (!open) return;
    let dead = false;
    let objectUrl: string | null = null;
    setFailed(false);

    renderSutraCard({ text, source, plate })
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
  }, [open, text, source, plate]);

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

  /* The two buttons belong to the sheet's footer, not to its body. `Sheet`
     keeps the footer outside the scroller for exactly this reason — "a sheet
     that ends in a decision must not scroll its own decision off screen" — and
     in the body they did: on a phone with Safari's own bars up, Share and Save
     sat below the fold of an 85dvh panel. */
  const buttons = (
    <div className="flex gap-3">
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
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Share sutra"
      accent={APP_ACCENT}
      footer={buttons}
    >
      {/* 44dvh, not the 55 this started at: the picker row under the preview
          is 84px the preview has to leave room for, and at 55 a 667pt or
          780pt phone scrolled the thumbnails under the footer — measured below
          at 375×667, 360×780 and 428×926 with the body not scrolling at all.
          On a tall phone the 26rem cap is what binds, so nothing changes there.

          Sized by *height*, not width, and that is the fix: at `max-w-sm` the
          card was 384×512 and on a short screen it simply pushed everything
          under it away. Driven from the height it can never do that, and 3:4
          means the width follows — 312px at the cap, which fits the narrowest
          phone this app is drawn for with room either side. The box holds its
          shape while the bitmap is still being drawn, so the sheet does not
          jump to full height the moment it arrives. */}
      {/* `Sheet` gives its body no padding of its own — every caller sets the
          comps' px-5 for itself. */}
      <div className="px-5 py-4">
        <div className="mx-auto aspect-3/4 h-[min(44dvh,26rem)] max-w-full overflow-hidden rounded-card border border-rule bg-inset">
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

        {/* The plates, all of them at once. A row rather than a carousel: five
            still fit the narrowest phone, and a choice you can see all of is made at a
            glance where one you have to scroll through is browsed. */}
        <div
          role="radiogroup"
          aria-label="Background"
          className="mt-4 flex justify-center gap-2.5"
        >
          {SUTRA_PLATES.map((p) => {
            const on = p.id === plate.id;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={p.label}
                onClick={() => setPlate(p)}
                /* The selected one is ringed in the workspace's colour rather
                   than dimming the others: several small paintings are the
                   thing being compared, and the rest greyed would be the
                   rest misrepresented. */
                className="shrink-0 rounded-tile p-0.5 transition-colors"
                style={{ background: on ? "var(--ws-color)" : "transparent" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- a
                    fixed local 3KB thumbnail at the size it was written at. */}
                <img
                  src={p.thumb}
                  alt=""
                  width={168}
                  height={224}
                  className="h-16 w-12 rounded-tile border border-rule object-cover"
                />
              </button>
            );
          })}
        </div>
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
