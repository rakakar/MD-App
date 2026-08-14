"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { localHighlights, syncPersonal, type Highlight } from "@/lib/personal";
import { parseRef, refToHref } from "@/lib/refs";
import type { HighlightColour } from "@/lib/storage";
import type { ChapterTocEntry } from "@/lib/types";
import { Sheet } from "./Sheet";

/**
 * Where you can go in this book, in the reader: its chapters, and the places
 * you have marked in it.
 *
 * Contents was the only tab, and reaching a highlight from inside the book
 * meant backing out to the book page — two navigations and a lost position, for
 * the one thing a reader who highlights actually comes back for. It is the same
 * pair the book page shows, in the same order, for the same reason: they are
 * two things about one book and the reader moves between them constantly.
 *
 * The list is device-local, like every personal row in this app, so a highlight
 * painted a second ago is in it before any network call resolves. A signed-in
 * reader additionally gets a sync each time the sheet opens.
 */

/** Tailwind cannot build a class name at runtime; the three are written out. */
const SWATCH: Record<HighlightColour, string> = {
  amber: "bg-hl-amber",
  sage: "bg-hl-sage",
  sky: "bg-hl-sky",
};

type Tab = "contents" | "highlights";

export function TocSheet({
  open,
  onClose,
  bookCode,
  bookTitle,
  chapters,
  current,
  bookType,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  bookCode: string;
  /** the sheet's heading — the book, not the word "book" */
  bookTitle: string;
  chapters: ChapterTocEntry[];
  current: number;
  bookType: "print" | "digital";
  onSelect: (n: number) => void;
}) {
  const { user, loading } = useAuth();
  const activeRef = useRef<HTMLAnchorElement | HTMLButtonElement>(null);
  const [tab, setTab] = useState<Tab>("contents");
  const [rows, setRows] = useState<Highlight[] | null>(null);

  const reload = useCallback(() => setRows(localHighlights(bookCode)), [bookCode]);

  // Re-read on every open, not once on mount: the reader is the thing that
  // *makes* highlights, so the list is stale the moment you paint one.
  useEffect(() => {
    if (!open || loading) return;
    reload();
    if (user) void syncPersonal().then(reload);
  }, [open, user, loading, reload]);

  // Opens on Contents each time, because that is what the button that opened it
  // is called. A sheet that reopens on the tab you left is friendlier right up
  // until the control says "Contents" and shows something else.
  useEffect(() => {
    if (open) setTab("contents");
  }, [open]);

  // open onto where you are, not onto chapter 1
  useEffect(() => {
    if (!open || tab !== "contents") return;
    const id = requestAnimationFrame(() =>
      activeRef.current?.scrollIntoView({ block: "center" })
    );
    return () => cancelAnimationFrame(id);
  }, [open, tab]);

  const frontMatter = chapters.filter((c) => c.is_front_matter);
  const main = chapters.filter((c) => !c.is_front_matter);

  const byChapter = useMemo(
    () => new Map(chapters.map((c) => [String(c.number), c])),
    [chapters]
  );

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
            className={`hi min-w-0 flex-1 text-sm leading-snug ${active ? "font-semibold" : ""}`}
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

  /**
   * A marked passage, as a link to where it sits. A plain `<Link>` rather than
   * `onSelect`: the ref names a paragraph, not just a chapter, and the reader
   * already resolves `/books/{code}/{chapter}#p-…` — which is the same door the
   * book page's own list opens, so a highlight lands in the same place from
   * either side.
   */
  const highlightRow = (h: Highlight, i: number) => {
    const ref = parseRef(h.canonical_ref);
    const chapter = ref ? byChapter.get(ref.chapter) : undefined;
    return (
      <li key={`${h.canonical_ref}-${i}`}>
        <Link
          href={refToHref(h.canonical_ref)}
          onClick={onClose}
          className="flex gap-3 px-5 py-3 transition-colors active:bg-current/5"
        >
          {/* The colour carries nothing on its own — the designer was explicit —
              so it is a mark beside the words rather than the only thing
              telling them apart. */}
          <span
            aria-hidden
            className={`mt-1 h-4 w-1 shrink-0 rounded-full ${SWATCH[h.colour ?? "amber"]}`}
          />
          <span className="min-w-0 flex-1">
            <span lang="hi" className="hi hi-tight line-clamp-2 text-sm">
              {h.text_hi}
            </span>
            {h.note && (
              <span lang="hi" className="hi hi-tight mt-1 line-clamp-1 text-xs opacity-70">
                {h.note}
              </span>
            )}
            <span className="mt-1 block text-xs text-(--reader-ink-soft)">
              {chapter ? (
                <>
                  <span lang="hi" className="hi">{chapter.title_hi}</span>
                  {ref?.page ? ` · ${bookType === "print" ? "p. " : ""}${ref.page}` : ""}
                </>
              ) : (
                h.canonical_ref
              )}
            </span>
          </span>
        </Link>
      </li>
    );
  };

  const count = rows?.length ?? 0;

  return (
    // The book's own name, not "This book". A reader who is four levels into
    // the app and two taps from the last thing they opened is being told what
    // they already know; the title says which book these chapters belong to,
    // which on a shelf of thirteen is the thing worth saying.
    <Sheet open={open} onClose={onClose} title={bookTitle}>
      {/* Sticky, so the pair stays reachable down a chapter list of forty. The
          sheet's own header is above it and does not scroll, so this only has
          to clear the top of the scroller. */}
      <div className="sticky top-0 z-10 bg-(--reader-bg) px-5 pb-2 pt-3">
        <div
          role="tablist"
          aria-label="This book"
          className="flex items-stretch gap-1 rounded-control border border-(--reader-rule) p-1"
        >
          <TabButton
            selected={tab === "contents"}
            onClick={() => setTab("contents")}
            label="Contents"
            count={main.length}
          />
          <TabButton
            selected={tab === "highlights"}
            onClick={() => setTab("highlights")}
            label="Highlights & Notes"
            count={count || undefined}
          />
        </div>
      </div>

      {tab === "contents" ? (
        // No "Front matter" heading over the first rows, as on the book page:
        // it labelled a group of one or two against a list of eighteen, and the
        // rows already say what they are.
        <ul>
          {frontMatter.map(row)}
          {main.map(row)}
        </ul>
      ) : count === 0 ? (
        <p className="px-5 pb-6 pt-4 text-sm text-(--reader-ink-soft)">
          {rows === null
            ? "Looking…"
            : "Nothing marked in this book yet. Press and hold any line to paint it, or to write a note against it."}
        </p>
      ) : (
        <ul>{rows?.map(highlightRow)}</ul>
      )}
    </Sheet>
  );
}

/**
 * One tab. Reader-tinted rather than `CountTabs`, which paints itself in the
 * app's `inset`/`card` — inside a sheet printed on the book's own paper those
 * are the wrong two colours, and on Quiet paper they are a light control on a
 * near-black panel. This is the same treatment the active chapter row already
 * uses in this file, and selection is never colour alone: the weight and
 * `aria-selected` carry it too.
 */
function TabButton({
  selected,
  onClick,
  label,
  count,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={`flex min-h-11 min-w-0 flex-auto items-center justify-center gap-2 rounded-control px-2 text-sm transition-colors ${
        selected ? "font-semibold" : "text-(--reader-ink-soft)"
      }`}
      style={
        selected
          ? {
              background: "color-mix(in srgb, var(--ws-color) 12%, transparent)",
              color: "var(--ws-ink)",
            }
          : undefined
      }
    >
      <span className="truncate">{label}</span>
      {count !== undefined && (
        <span className="shrink-0 text-xs tabular-nums opacity-70">{count}</span>
      )}
    </button>
  );
}
