"use client";

import { useState } from "react";
import type { ResourceDocument } from "@/lib/types";

/**
 * One file in the Resources library — served as the file it is.
 *
 * A document has no chapters, no paragraphs and no canonical ref, so it never
 * routes into the book reader; opening it means opening the file. `kind`
 * decides how: a PDF gets a viewer, audio gets a player, an image is shown,
 * and anything else is handed over as a download.
 *
 * The preview opens in place rather than on its own route. On a phone the
 * whole point of this screen is scanning a folder, and bouncing out to a
 * viewer per row loses your place in it.
 */
export function DocumentRow({ doc }: { doc: ResourceDocument }) {
  const [open, setOpen] = useState(false);
  const previewable = doc.kind === "pdf" || doc.kind === "audio" || doc.kind === "image";

  const meta = [
    doc.kind_label,
    doc.page_count ? `${doc.page_count} pages` : null,
    doc.duration_seconds ? formatDuration(doc.duration_seconds) : null,
    doc.file_size ? formatBytes(doc.file_size) : null,
    doc.author || null,
  ].filter(Boolean);

  const body = (
    <>
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
        style={{ background: "var(--ws-color)" }}
        aria-hidden
      >
        <KindIcon kind={doc.kind} />
      </span>
      <span className="min-w-0 flex-1">
        <span lang="hi" className="hi block text-[15px] font-medium leading-snug">
          {doc.title}
        </span>
        <span className="mt-0.5 block text-xs text-ink-soft">{meta.join(" · ")}</span>
        {doc.description && (
          <span lang="hi" className="hi mt-1 block text-xs text-ink-soft">
            {doc.description}
          </span>
        )}
      </span>
    </>
  );

  // Nothing sensible to preview: hand the file straight over. `url` is always
  // present on a published document, so this link is never dead — it may point
  // at our media host or at wherever the file still lives mid-migration, and
  // both are opened exactly the same way.
  if (!previewable) {
    return (
      <li>
        <a
          href={doc.url}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-black/[.03]"
        >
          {body}
          <span className="shrink-0 self-center text-xs font-medium" style={{ color: "var(--ws-ink)" }}>
            <span lang="hi" className="hi">डाउनलोड</span>
          </span>
        </a>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[.03]"
      >
        {body}
        <span className="shrink-0 self-center text-xs font-medium" style={{ color: "var(--ws-ink)" }}>
          <span lang="hi" className="hi">{open ? "बंद करें" : "खोलें"}</span>
        </span>
      </button>

      {open && (
        <div className="border-t border-rule px-4 py-3">
          {doc.kind === "pdf" && (
            <>
              {/*
                An embedded PDF is a mobile browser's weakest spot — some hand
                it to a plugin, some render a blank box. The frame is the happy
                path; the link below it is the one that always works, so it is
                stated rather than hidden behind a failure.
              */}
              <iframe
                src={doc.url}
                title={doc.title}
                className="h-[70vh] w-full rounded-xl border border-rule bg-white"
              />
              <OpenElsewhere url={doc.url} />
            </>
          )}

          {doc.kind === "audio" && (
            <>
              {/* preload="none" — a folder of recordings should cost nothing
                  until one is actually played */}
              <audio src={doc.url} controls preload="none" className="w-full" />
              <OpenElsewhere url={doc.url} />
            </>
          )}

          {doc.kind === "image" && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={doc.url}
                alt={doc.title}
                className="max-h-[70vh] w-full rounded-xl border border-rule object-contain"
                loading="lazy"
              />
              <OpenElsewhere url={doc.url} />
            </>
          )}
        </div>
      )}
    </li>
  );
}

function OpenElsewhere({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-block text-xs font-medium underline underline-offset-2"
      style={{ color: "var(--ws-ink)" }}
    >
      <span lang="hi" className="hi">नए टैब में खोलें</span> · Open in a new tab
    </a>
  );
}

function KindIcon({ kind }: { kind: ResourceDocument["kind"] }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-5 w-5",
  };
  switch (kind) {
    case "audio":
      return (
        <svg {...common}>
          <path d="M9 18V5l10-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="16" cy="16" r="3" />
        </svg>
      );
    case "image":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="8.5" cy="9.5" r="1.5" />
          <path d="m21 16-5-5-9 9" />
        </svg>
      );
    case "pdf":
      return (
        <svg {...common}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6M9 17h4" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5" />
        </svg>
      );
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}
