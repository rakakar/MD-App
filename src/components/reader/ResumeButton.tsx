"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PlayIcon } from "@/components/shell/icons";
import { localProgressFor } from "@/lib/personal";
import { parseRef, refToHref } from "@/lib/refs";

export interface Resume {
  href: string;
  /** printed page from the canonical ref; "" when the ref carries none */
  page: string;
  /** how far into the book that page sits, or null without a page count */
  percent: number | null;
}

/**
 * The saved position for a book, read from the device.
 *
 * Client-side because the position lives on the device — a signed-out reader
 * has one too, and the book page itself is statically rendered for everyone.
 * `null` until the effect runs, so callers render their "never opened" state
 * first and are corrected within a frame rather than showing nothing.
 *
 * The percentage is the printed page against the book's page count, which is
 * the only progress signal that exists: the BE stores a resume position, not a
 * completion figure. So it means "how far into the book this page sits", not
 * "how much has been read" — near enough for a bar, and the reason the label
 * beside it names the page rather than leaving the bar to speak alone.
 */
export function useResume(bookCode: string, pageCount?: number | null): Resume | null {
  const [resume, setResume] = useState<Resume | null>(null);

  useEffect(() => {
    const p = localProgressFor(bookCode);
    if (!p) return;
    const ref = parseRef(p.canonical_ref);
    const page = Number(ref?.page);
    setResume({
      href: refToHref(p.canonical_ref),
      page: ref?.page ?? "",
      percent:
        Number.isFinite(page) && pageCount
          ? Math.min(100, (page / pageCount) * 100)
          : null,
    });
  }, [bookCode, pageCount]);

  return resume;
}

/**
 * The book hero's primary action (design 1C): "Resume · page N" once there is
 * a saved position, "Start reading" before that.
 *
 * White on the tinted hero rather than the workspace fill — on a hero already
 * saturated with the book's own colour, a terracotta pill competes with the
 * surface instead of sitting on it.
 */
export function ResumeButton({
  bookCode,
  firstChapterHref,
  resume,
}: {
  bookCode: string;
  firstChapterHref: string | null;
  /** pass the hook's value when the hero already reads it; omitted = read here */
  resume?: Resume | null;
}) {
  const own = useResume(bookCode);
  const r = resume !== undefined ? resume : own;

  const href = r?.href ?? firstChapterHref;
  if (!href) return null;

  return (
    <Link
      href={href}
      className="flex h-[46px] flex-1 items-center justify-center gap-2 rounded-[14px] bg-white px-4 text-[14.5px] font-semibold text-ink shadow-[0_8px_18px_-8px_rgba(0,0,0,.5)] transition-transform active:scale-[.98]"
    >
      <PlayIcon className="h-4 w-4" />
      {r ? (
        <>
          Resume{r.page && <> · page {r.page}</>}
        </>
      ) : (
        "Start reading"
      )}
    </Link>
  );
}
