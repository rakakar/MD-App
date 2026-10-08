"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CopyIcon, ShareIcon } from "@/components/shell/icons";

/**
 * The ⋯ at the end of a file row — Open, Copy link, Share (designer's comps,
 * 8 Oct 2026), plus whatever else that kind of file has: a PDF with a text
 * edition offers its original pages.
 *
 * `relative z-10` because the rows stretch their own link over themselves;
 * this sits above it and keeps its own click.
 */
export interface RowMenuItem {
  label: string;
  href?: string;
  external?: boolean;
  onClick?: () => void;
}

export function RowMenu({
  items,
  share,
  label,
}: {
  items: RowMenuItem[];
  /** what Copy link copies and Share shares — an absolute or app-relative URL */
  share: { title: string; url: string };
  /** names the row, for the button's accessible name */
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const absolute = () => new URL(share.url, window.location.href).toString();
  const row =
    "flex min-h-10 w-full items-center gap-2.5 rounded-md px-3 text-start text-sm text-ink transition-colors hover:bg-ink/5";

  return (
    <div ref={ref} className="relative z-10">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`More for ${label}`}
        className="flex h-9 w-9 items-center justify-center rounded-control text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4.5 w-4.5" aria-hidden>
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1 w-48 rounded-card border border-rule bg-card p-1 shadow-raised"
        >
          {items.map((it) =>
            it.href ? (
              it.external ? (
                <a
                  key={it.label}
                  role="menuitem"
                  href={it.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className={row}
                >
                  {it.label}
                </a>
              ) : (
                <Link key={it.label} role="menuitem" href={it.href} onClick={() => setOpen(false)} className={row}>
                  {it.label}
                </Link>
              )
            ) : (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  it.onClick?.();
                }}
                className={row}
              >
                {it.label}
              </button>
            )
          )}
          <div aria-hidden className="mx-2 my-1 h-px bg-rule" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void navigator.clipboard?.writeText(absolute()).then(() => {
                setCopied(true);
                setTimeout(() => {
                  setCopied(false);
                  setOpen(false);
                }, 900);
              });
            }}
            className={row}
          >
            <CopyIcon className="h-4 w-4 text-ink-soft" />
            {copied ? "Copied" : "Copy link"}
          </button>
          {canShare && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void navigator.share({ title: share.title, url: absolute() }).catch(() => {});
              }}
              className={row}
            >
              <ShareIcon className="h-4 w-4 text-ink-soft" />
              Share
            </button>
          )}
        </div>
      )}
    </div>
  );
}
