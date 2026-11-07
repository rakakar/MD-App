"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  localHighlights,
  localNotes,
  syncPersonal,
  unpaintSpan,
  unsaveBookmark,
  unsaveNote,
  type Highlight,
} from "@/lib/personal";
import type { LocalNote } from "@/lib/storage";
import type { ChapterTocEntry } from "@/lib/types";
import { chapterName } from "@/lib/labels";
import { chapterLabelOf } from "./ReaderSidePanel";
import { HighlightCard, NoteCard } from "./SavedPassageCard";
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

type Tab = "contents" | "highlights" | "notes";

export function TocSheet({
  open,
  onClose,
  bookCode,
  bookTitle,
  chapters,
  current,
  bookType,
  onSelect,
  onSelectRef,
  onChanged,
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
  /** a highlight or note was picked: the reader takes the page there */
  onSelectRef: (ref: string) => void;
  /** one was deleted here — the page repaints */
  onChanged: () => void;
}) {
  const { user, loading } = useAuth();
  const activeRef = useRef<HTMLAnchorElement | HTMLButtonElement>(null);
  const [tab, setTab] = useState<Tab>("contents");
  const [rows, setRows] = useState<Highlight[] | null>(null);
  const [notes, setNotes] = useState<LocalNote[] | null>(null);

  // The same two lists the desktop panel and My Journey show: painted
  // passages, and notes — newest first, as My Journey has them.
  const reload = useCallback(() => {
    setRows(localHighlights(bookCode).filter((h) => h.colour));
    setNotes(
      localNotes()
        .filter((n) => n.book_code === bookCode)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
    );
  }, [bookCode]);

  const signedIn = !!user;
  const removeHighlight = (h: Highlight) => {
    if (h.span) unpaintSpan(h.canonical_ref, h.span, signedIn);
    else unsaveBookmark(h.canonical_ref, signedIn);
    reload();
    onChanged();
  };
  const removeNote = (ref: string) => {
    unsaveNote(ref, signedIn);
    reload();
    onChanged();
  };
  const go = (ref: string) => {
    onSelectRef(ref);
    onClose();
  };

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
            className="w-6 shrink-0 text-right text-base font-semibold tabular-nums"
            style={{ color: active ? "var(--ws-ink)" : "var(--reader-ink-soft)" }}
          >
            {ch.is_front_matter ? "" : ch.number}
          </span>
          {/* 18px, from 14 — the designer's call, 26 Sep 2026: a chapter's
              name is what the reader is scanning this list for, and at 14px
              Devanagari it was the smallest thing on the sheet. `hi-tight`
              because `.hi` outranks leading utilities, and a name that wraps
              at the body's 1.85 reads as two entries. */}
          <span
            lang={ch.is_front_matter ? undefined : "hi"}
            className={`hi hi-tight min-w-0 flex-1 text-lg ${active ? "font-semibold" : ""}`}
          >
            {chapterName(ch)}
          </span>
          <span className="shrink-0 text-sm tabular-nums text-(--reader-ink-soft)">
            {ch.start_page == null ? "" : bookType === "print" ? `p. ${ch.start_page}` : ch.start_page}
          </span>
        </button>
      </li>
    );
  };

  const hCount = rows?.length ?? 0;
  const nCount = notes?.length ?? 0;

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
          className="flex items-stretch gap-1 rounded-control border border-(--reader-rule) bg-current/[0.06] p-1"
        >
          <TabButton
            selected={tab === "contents"}
            onClick={() => setTab("contents")}
            label="Chapters"
            count={main.length}
          />
          <TabButton
            selected={tab === "highlights"}
            onClick={() => setTab("highlights")}
            label="Highlights"
            count={hCount || undefined}
          />
          <TabButton
            selected={tab === "notes"}
            onClick={() => setTab("notes")}
            label="Notes"
            count={nCount || undefined}
          />
        </div>
      </div>

      {tab === "contents" ? (
        // No "Front matter" heading over the first rows, as on the book page:
        // it labelled a group of one or two against a list of eighteen, and the
        // rows already say what they are.
        <ul className="toc-sheet">
          {frontMatter.map(row)}
          {main.map(row)}
        </ul>
      ) : tab === "highlights" ? (
        hCount === 0 ? (
          <p className="px-5 pb-6 pt-4 text-sm text-(--reader-ink-soft)">
            {rows === null ? "Looking…" : "Nothing highlighted yet. Press and hold any line, then pick a colour."}
          </p>
        ) : (
          <ul className="flex flex-col gap-3 px-5 pb-6 pt-2">
            {rows?.map((h, i) => (
              <li key={`${h.canonical_ref}-${h.span?.start ?? i}`}>
                <HighlightCard
                  canonicalRef={h.canonical_ref}
                  text={h.text_hi}
                  colour={h.colour}
                  createdAt={h.created_at}
                  chapterLabel={chapterLabelOf(h.canonical_ref, chapters)}
                  onGo={() => go(h.canonical_ref)}
                  onDelete={() => removeHighlight(h)}
                />
              </li>
            ))}
          </ul>
        )
      ) : nCount === 0 ? (
        <p className="px-5 pb-6 pt-4 text-sm text-(--reader-ink-soft)">
          {notes === null ? "Looking…" : "No notes yet. Press and hold any line and choose Note."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3 px-5 pb-6 pt-2">
          {notes?.map((n) => (
            <li key={n.canonical_ref}>
              <NoteCard
                canonicalRef={n.canonical_ref}
                note={n.text}
                passage={n.text_hi}
                createdAt={n.created_at}
                chapterLabel={chapterLabelOf(n.canonical_ref, chapters)}
                onGo={() => go(n.canonical_ref)}
                onDelete={() => removeNote(n.canonical_ref)}
              />
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

/**
 * One tab. Drawn here rather than with `CountTabs`, because the track has to
 * be the book's paper — `inset`/`card` are the app's, and on Quiet paper they
 * are a light control on a near-black panel. The *selected* look is the app's
 * one selected look, though: the accent filled, white on it, which holds on
 * either surface because there the accent is the background. Selection is
 * never colour alone — the weight and `aria-selected` carry it too.
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
        selected ? "font-semibold text-white" : "text-(--reader-ink-soft)"
      }`}
      style={selected ? { background: "var(--ws-color)" } : undefined}
    >
      <span className="truncate">{label}</span>
      {count !== undefined && (
        <span
          className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs tabular-nums ${
            selected ? "bg-white/20" : "opacity-70"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
