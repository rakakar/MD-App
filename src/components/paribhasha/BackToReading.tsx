"use client";

import Link from "next/link";
import { BackIcon } from "@/components/shell/icons";
import { contentLang } from "@/lib/script";
import { useReadingReturn } from "@/lib/readingReturn";

/**
 * "Back to reading", on the glossary and a word's page, after the reader
 * came here from a word in a book (see `readingReturn`). Nothing otherwise.
 */
export function BackToReading({ className = "" }: { className?: string }) {
  const back = useReadingReturn();
  if (!back) return null;
  const t = contentLang(back.title);
  return (
    <Link
      href={back.href}
      className={`inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-rule bg-card ps-3 pe-4 text-sm font-semibold ${className}`}
    >
      <BackIcon className="h-4 w-4 shrink-0" />
      <span className="shrink-0">Back to reading</span>
      {back.title && (
        <span
          lang={t.lang}
          className={`${t.lang === "hi" ? "hi-note" : ""} min-w-0 truncate font-medium text-ink-soft`}
        >
          · {back.title}
        </span>
      )}
    </Link>
  );
}
