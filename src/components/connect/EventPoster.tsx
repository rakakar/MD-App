"use client";

import { useState } from "react";
import { DownloadIcon, ImageIcon } from "@/components/shell/icons";

/**
 * The organiser's poster, and the button that saves it.
 *
 * A poster is **optional** — the API sends an absolute URL or null — and this
 * draws the empty state the comps draw rather than collapsing, because on this
 * screen the poster is the first thing and a detail page that begins with the
 * category chip reads as a different design. It is a dashed frame saying whose
 * artwork is missing, not an error.
 *
 * **Downloading it is not `<a download>`.** The file is served from another
 * origin, and a cross-origin `download` attribute is ignored — the browser
 * navigates to the image instead of saving it, which on a phone means leaving
 * the app to look at the picture that was already on screen. So it is fetched
 * into a blob and saved from a same-origin object URL, and if that is refused
 * (no CORS header on the bucket) it opens in a new tab, which is at least the
 * thing the reader can then long-press.
 *
 * `<img>` rather than `next/image`: the host is a media bucket whose domain is
 * configuration, and an optimiser that has not been told about it fails the
 * whole render rather than the one picture.
 */
export function EventPoster({ src, title }: { src: string | null; title: string }) {
  const [busy, setBusy] = useState(false);

  if (!src) {
    return (
      <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-card border border-dashed border-rule bg-inset/60 px-6 text-center">
        <span aria-hidden className="text-muted">
          <ImageIcon className="h-8 w-8" />
        </span>
        <p className="text-sm text-ink-soft">Event poster — supplied by the organiser</p>
      </div>
    );
  }

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch(src, { mode: "cors" });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      // The bucket's own filename, which carries the right extension; the
      // title would not, and a poster saved as "अष्टम त्रि-वर्षीय" with no
      // suffix opens in nothing.
      a.download = src.split("/").pop()?.split("?")[0] || "poster.jpg";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch {
      window.open(src, "_blank", "noopener,noreferrer");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-card border border-rule bg-inset">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`Poster for ${title}`}
        className="block w-full"
        loading="lazy"
        decoding="async"
      />
      <button
        type="button"
        onClick={save}
        disabled={busy}
        aria-label="Download poster"
        className="absolute bottom-3 end-3 flex h-12 w-12 items-center justify-center rounded-full bg-ink/75 text-on-accent shadow-raised backdrop-blur transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        <DownloadIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
