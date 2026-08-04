"use client";

import { useEffect, useRef } from "react";
import type { ChapterTocEntry } from "@/lib/types";
import { Sheet } from "./Sheet";

/**
 * Chapter list, in the reader. Previously the only way to change chapter was
 * to back out to the book page and come in again — two navigations and a lost
 * scroll position for something a reader does constantly.
 */
export function TocSheet({
  open,
  onClose,
  chapters,
  current,
  bookType,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  chapters: ChapterTocEntry[];
  current: number;
  bookType: "print" | "digital";
  onSelect: (n: number) => void;
}) {
  const activeRef = useRef<HTMLAnchorElement | HTMLButtonElement>(null);

  // open onto where you are, not onto chapter 1
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() =>
      activeRef.current?.scrollIntoView({ block: "center" })
    );
    return () => cancelAnimationFrame(id);
  }, [open]);

  const frontMatter = chapters.filter((c) => c.is_front_matter);
  const main = chapters.filter((c) => !c.is_front_matter);

  const row = (ch: ChapterTocEntry) => {
    const active = ch.number === current && !ch.is_front_matter;
    return (
      <li key={`${ch.is_front_matter}-${ch.number}`}>
        <button
          ref={active ? (activeRef as React.Ref<HTMLButtonElement>) : undefined}
          type="button"
          aria-current={active ? "true" : undefined}
          onClick={() => {
            onSelect(ch.number);
            onClose();
          }}
          className="flex w-full items-baseline gap-3 px-5 py-3 text-start transition-colors active:bg-current/5"
          style={
            active
              ? { background: "color-mix(in srgb, var(--ws-color) 10%, transparent)" }
              : undefined
          }
        >
          <span
            className="w-6 shrink-0 text-right text-sm font-semibold tabular-nums"
            style={{ color: active ? "var(--ws-ink)" : "var(--reader-ink-soft)" }}
          >
            {ch.number}
          </span>
          <span
            lang="hi"
            className={`hi min-w-0 flex-1 text-[15px] leading-snug ${active ? "font-semibold" : ""}`}
          >
            {ch.title_hi}
          </span>
          <span className="shrink-0 text-xs tabular-nums text-(--reader-ink-soft)">
            {bookType === "print" ? `p. ${ch.start_page}` : ch.start_page}
          </span>
        </button>
      </li>
    );
  };

  return (
    <Sheet open={open} onClose={onClose} title="Contents">
      <ul>
        {frontMatter.length > 0 && (
          <>
            <li className="px-5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-(--reader-ink-soft)">
              Front matter
            </li>
            {frontMatter.map(row)}
          </>
        )}
        {main.map(row)}
      </ul>
    </Sheet>
  );
}
