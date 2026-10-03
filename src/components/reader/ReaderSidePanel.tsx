"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { localHighlights, localNotes, syncPersonal, type Highlight } from "@/lib/personal";
import { parseRef } from "@/lib/refs";
import type { HighlightColour, LocalNote } from "@/lib/storage";
import type { ChapterTocEntry } from "@/lib/types";

/**
 * The desktop reader's left panel: Contents, Highlights, Notes.
 *
 * On a phone these are a sheet that covers the page — there is no room for
 * both. On a desktop there is, so the panel docks beside the text and stays
 * while the reader moves through the book: pick a chapter, a highlight, a note,
 * and the page changes with the panel still open, which is how a reader
 * working through their marks actually uses it. The column moves over to make
 * room; below 1440px the margin labels give way to it (see the reader).
 *
 * The rows are device-local, like every personal row in this app, and re-read
 * whenever `revision` changes — the reader bumps it when it paints or writes.
 */

export type PanelTab = "contents" | "highlights" | "notes";

/** a highlight's colour as a mark rather than a fill — see `--color-hl-*-mark` */
const deep = (c: HighlightColour) => `var(--color-hl-${c}-mark)`;
/** what the chips call them — sage reads as green to everyone but a painter */
const COLOUR_NAME: Record<HighlightColour, string> = {
  amber: "Amber",
  sage: "Green",
  sky: "Blue",
};

/** where a passage is to be found, for Go to */
export interface PanelTarget {
  canonical_ref: string;
}

export function ReaderSidePanel({
  open,
  tab,
  onTab,
  onClose,
  bookCode,
  bookTitle,
  bookType,
  pageCount,
  chapters,
  current,
  isFrontMatter,
  chapterProgress,
  revision,
  onChapter,
  onGoToRef,
  onGoToPage,
  noteHere,
  onSaveNote,
}: {
  open: boolean;
  tab: PanelTab;
  onTab: (t: PanelTab) => void;
  onClose: () => void;
  bookCode: string;
  bookTitle: string;
  bookType: "print" | "digital";
  pageCount?: number | null;
  chapters: ChapterTocEntry[];
  current: number;
  isFrontMatter: boolean;
  /** how far through the open chapter, 0–1, for the bar under "You are here" */
  chapterProgress: number;
  /** bumped by the reader whenever a highlight or note changes */
  revision: number;
  onChapter: (n: number) => void;
  onGoToRef: (ref: string) => void;
  onGoToPage: (n: number) => void;
  /** the passage at the top of the page, for "New note on this page" */
  noteHere: { canonical_ref: string; text_hi: string } | null;
  onSaveNote: (target: { canonical_ref: string; text_hi: string }, text: string) => void;
}) {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<Highlight[]>([]);
  const [notes, setNotes] = useState<LocalNote[]>([]);
  const [synced, setSynced] = useState(0);

  useEffect(() => {
    setRows(localHighlights(bookCode));
    setNotes(
      localNotes()
        .filter((n) => n.book_code === bookCode)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    );
  }, [bookCode, revision, synced, open]);

  // A signed-in reader's other devices, folded in each time the panel opens.
  useEffect(() => {
    if (!open || loading || !user) return;
    void syncPersonal().then(() => setSynced((s) => s + 1));
  }, [open, user, loading]);

  const highlights = rows.filter((r) => r.colour);

  return (
    <aside
      aria-label="Contents, highlights and notes"
      inert={!open}
      className={`fixed bottom-0 left-0 top-16 z-30 hidden w-90 flex-col border-r border-(--reader-rule) bg-(--reader-bg) transition-transform duration-300 ease-out motion-reduce:transition-none lg:flex ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
      data-reader-chrome
    >
      <div className="flex items-center gap-2 px-4 pb-3 pt-4">
        <div
          role="tablist"
          aria-label={bookTitle}
          className="flex flex-1 items-stretch gap-1 rounded-control border border-(--reader-rule) bg-current/[0.06] p-1"
        >
          <PanelTabButton selected={tab === "contents"} onClick={() => onTab("contents")} label="Contents" />
          <PanelTabButton
            selected={tab === "highlights"}
            onClick={() => onTab("highlights")}
            label="Highlights"
            count={highlights.length || undefined}
          />
          <PanelTabButton
            selected={tab === "notes"}
            onClick={() => onTab("notes")}
            label="Notes"
            count={notes.length || undefined}
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-(--reader-ink-soft) transition-colors hover:bg-current/5"
        >
          ✕
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6">
        {tab === "contents" ? (
          <ContentsTab
            open={open}
            chapters={chapters}
            current={current}
            isFrontMatter={isFrontMatter}
            bookType={bookType}
            pageCount={pageCount}
            chapterProgress={chapterProgress}
            onChapter={onChapter}
            onGoToPage={onGoToPage}
          />
        ) : tab === "highlights" ? (
          <HighlightsTab rows={highlights} chapters={chapters} bookType={bookType} onGoToRef={onGoToRef} />
        ) : (
          <NotesTab
            notes={notes}
            colours={new Map(highlights.map((h) => [h.canonical_ref, h.colour!]))}
            bookCode={bookCode}
            bookTitle={bookTitle}
            bookType={bookType}
            noteHere={noteHere}
            onSaveNote={onSaveNote}
            onGoToRef={onGoToRef}
          />
        )}
      </div>
    </aside>
  );
}

/**
 * One tab, in the phone sheet's clothes (`TocSheet`'s TabButton): the accent
 * filled with white on the selected one, and the count as a small badge
 * beside the label rather than run into it — "Highlights·3" read as a
 * stray dot in front of the number.
 */
function PanelTabButton({
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
      className={`flex min-h-9 min-w-0 flex-auto items-center justify-center gap-1.5 rounded-control px-2 text-sm transition-colors ${
        selected ? "font-semibold text-white" : "text-(--reader-ink-soft) hover:text-(--reader-ink)"
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

// ---- Contents ----

function ContentsTab({
  open,
  chapters,
  current,
  isFrontMatter,
  bookType,
  pageCount,
  chapterProgress,
  onChapter,
  onGoToPage,
}: {
  open: boolean;
  chapters: ChapterTocEntry[];
  current: number;
  isFrontMatter: boolean;
  bookType: "print" | "digital";
  pageCount?: number | null;
  chapterProgress: number;
  onChapter: (n: number) => void;
  onGoToPage: (n: number) => void;
}) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const [page, setPage] = useState("");

  // open onto where you are, not onto chapter 1
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => activeRef.current?.scrollIntoView({ block: "nearest" }));
    return () => cancelAnimationFrame(id);
  }, [open, current]);

  const ordered = [...chapters.filter((c) => c.is_front_matter), ...chapters.filter((c) => !c.is_front_matter)];

  return (
    <>
      <ul className="space-y-1">
        {ordered.map((ch) => {
          const active = ch.is_front_matter ? isFrontMatter : !isFrontMatter && ch.number === current;
          const pageLabel =
            ch.start_page == null ? "" : bookType === "print" ? `p. ${ch.start_page}` : String(ch.start_page);
          return (
            <li key={`${ch.is_front_matter}-${ch.number}`}>
              <button
                ref={active ? activeRef : undefined}
                type="button"
                aria-current={active ? "true" : undefined}
                onClick={() => onChapter(ch.number)}
                className={`w-full rounded-card px-3 text-start transition-colors ${
                  active ? "border bg-(--reader-bg) py-3 shadow-sm" : "py-2.5 hover:bg-current/[0.04]"
                }`}
                style={active ? { borderColor: "color-mix(in srgb, var(--ws-color) 35%, var(--reader-rule))" } : undefined}
              >
                <span className="flex items-baseline gap-3">
                  <span
                    className="w-5 shrink-0 text-right text-sm font-semibold tabular-nums"
                    style={{ color: active ? "var(--ws-ink)" : "var(--reader-ink-soft)" }}
                  >
                    {ch.is_front_matter ? "" : ch.number}
                  </span>
                  <span lang="hi" className={`hi hi-tight min-w-0 flex-1 text-base ${active ? "font-semibold" : ""}`}>
                    {ch.title_hi}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-(--reader-ink-soft)">{pageLabel}</span>
                </span>
                {active && (
                  <span className="mt-2 flex items-center gap-3 pl-8">
                    <span className="h-0.5 flex-1 overflow-hidden rounded-full bg-(--reader-rule)">
                      <span
                        className="block h-full rounded-full transition-[width] duration-300"
                        style={{
                          width: `${Math.round(Math.min(1, Math.max(0.03, chapterProgress)) * 100)}%`,
                          background: "var(--ws-color)",
                        }}
                      />
                    </span>
                    <span className="shrink-0 text-xs font-semibold" style={{ color: "var(--ws-ink)" }}>
                      You are here
                    </span>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* The phone's "Go to printed page", kept with the map of the book it is
          a way into. Print editions only: a digital-first book has no printed
          page to ask for. */}
      {bookType === "print" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(page);
            if (n > 0) onGoToPage(n);
          }}
          className="mt-4 flex items-center gap-3 border-t border-(--reader-rule) px-3 pt-4"
        >
          <label htmlFor="panel-goto" className="flex-1 text-sm text-(--reader-ink-soft)">
            Go to page
          </label>
          <input
            id="panel-goto"
            inputMode="numeric"
            value={page}
            onChange={(e) => setPage(e.target.value.replace(/\D/g, ""))}
            placeholder="—"
            className="h-9 w-16 rounded-md border border-(--reader-rule) bg-transparent text-center text-sm tabular-nums outline-none focus:border-(--ws-ink)"
          />
          {pageCount ? (
            <span className="w-14 text-xs tabular-nums text-(--reader-ink-soft)">of {pageCount}</span>
          ) : null}
        </form>
      )}
    </>
  );
}

// ---- Highlights ----

/** book order: chapter (front matter first), page, paragraph, then the words */
function position(ref: string, start = 0): [number, number, number, number] {
  const p = parseRef(ref);
  const ch = !p ? 1e9 : p.chapter === "fm" ? -1 : Number(p.chapter);
  const pg = Number(p?.page);
  return [ch, Number.isFinite(pg) ? pg : 0, Number(p?.para) || 0, start];
}

function byPosition(a: [number, number, number, number], b: [number, number, number, number]) {
  for (let i = 0; i < 4; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

const rtf = typeof Intl !== "undefined" ? new Intl.RelativeTimeFormat("en", { numeric: "auto" }) : null;

/**
 * "today", "yesterday", "3 days ago" — in English, like the page beside it:
 * the phone's Contents sheet writes these places as "p. 12", and the desktop
 * says them the same way (the designer's call, 3 Oct 2026).
 */
export function when(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime()) || !rtf) return "";
  const day = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round((day(then) - day(new Date())) / 86_400_000);
  if (days > -30) return rtf.format(days, "day");
  if (days > -365) return rtf.format(Math.round(days / 30), "month");
  return rtf.format(Math.round(days / 365), "year");
}

export function pageOf(ref: string, bookType: "print" | "digital"): string {
  const p = parseRef(ref)?.page;
  if (!p) return "";
  return bookType === "print" && p === String(Number(p)) ? `p. ${p}` : p;
}

function HighlightsTab({
  rows,
  chapters,
  bookType,
  onGoToRef,
}: {
  rows: Highlight[];
  chapters: ChapterTocEntry[];
  bookType: "print" | "digital";
  onGoToRef: (ref: string) => void;
}) {
  const [filter, setFilter] = useState<HighlightColour | null>(null);
  const colours = useMemo(
    () => (["amber", "sage", "sky"] as const).filter((c) => rows.some((r) => r.colour === c)),
    [rows]
  );
  // A filter on a colour the reader has since cleared shows nothing and has
  // no chip to turn it off with.
  const active = filter && colours.includes(filter) ? filter : null;

  const groups = useMemo(() => {
    const shown = rows
      .filter((r) => !active || r.colour === active)
      .sort((a, b) => byPosition(position(a.canonical_ref, a.span?.start), position(b.canonical_ref, b.span?.start)));
    const out: { key: string; label: string; items: Highlight[] }[] = [];
    for (const r of shown) {
      const ch = parseRef(r.canonical_ref)?.chapter ?? "";
      const label = ch === "fm" ? "प्रस्तावना" : `अध्याय ${ch}`;
      const last = out.at(-1);
      if (last?.key === ch) last.items.push(r);
      else out.push({ key: ch, label, items: [r] });
    }
    return out;
  }, [rows, active]);

  if (rows.length === 0) {
    return (
      <p className="px-1 pt-2 text-sm text-(--reader-ink-soft)">
        Nothing highlighted in this book yet. Select any line to paint it.
      </p>
    );
  }

  const chip = (on: boolean) =>
    `inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors ${
      on ? "border-transparent bg-(--reader-ink) text-(--reader-bg)" : "border-(--reader-rule) hover:bg-current/5"
    }`;

  return (
    <>
      <div className="flex flex-wrap gap-2 pb-3">
        <button type="button" onClick={() => setFilter(null)} aria-pressed={!active} className={chip(!active)}>
          This book
        </button>
        {colours.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(active === c ? null : c)}
            aria-pressed={active === c}
            className={chip(active === c)}
          >
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: deep(c) }} />
            {COLOUR_NAME[c]}
          </button>
        ))}
      </div>

      {groups.map((g) => (
        <section key={g.key} className="pb-2">
          <h3 lang="hi" className="hi hi-tight px-1 pb-2 pt-1 text-xs text-(--reader-ink-soft)">
            {chapters.some((c) => String(c.number) === g.key) || g.key === "fm" ? g.label : g.key}
          </h3>
          <ul className="space-y-2.5">
            {g.items.map((h, i) => (
              <li key={`${h.canonical_ref}-${h.span?.start ?? i}`}>
                <button
                  type="button"
                  onClick={() => onGoToRef(h.canonical_ref)}
                  className="group block w-full rounded-card border border-(--reader-rule) bg-(--reader-bg) p-4 text-start shadow-sm transition-colors hover:border-(--reader-ink-soft)"
                >
                  <span className="flex gap-3">
                    <span aria-hidden className="w-0.5 shrink-0 rounded-full" style={{ background: deep(h.colour ?? "amber") }} />
                    <span lang="hi" className="hi hi-tight line-clamp-3 min-w-0 flex-1 text-sm">
                      {h.text_hi}
                    </span>
                  </span>
                  <span className="mt-3 flex items-center gap-1 text-xs text-(--reader-ink-soft)">
                    <span className="hi-tight">
                      {[pageOf(h.canonical_ref, bookType), when(h.created_at)].filter(Boolean).join(" · ")}
                    </span>
                    {h.note && (
                      <span className="font-semibold" style={{ color: "var(--ws-ink)" }}>
                        · Note
                      </span>
                    )}
                    <span className="ml-auto font-semibold transition-colors group-hover:text-(--reader-ink)">
                      Go to ↗
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

// ---- Notes ----

function NotesTab({
  notes,
  colours,
  bookCode,
  bookTitle,
  bookType,
  noteHere,
  onSaveNote,
  onGoToRef,
}: {
  notes: LocalNote[];
  colours: Map<string, HighlightColour>;
  bookCode: string;
  bookTitle: string;
  bookType: "print" | "digital";
  noteHere: { canonical_ref: string; text_hi: string } | null;
  onSaveNote: (target: { canonical_ref: string; text_hi: string }, text: string) => void;
  onGoToRef: (ref: string) => void;
}) {
  // The passage the composer is writing about — fixed when it opens, so
  // scrolling the page while typing does not move the note to another line.
  const [target, setTarget] = useState<{ canonical_ref: string; text_hi: string } | null>(null);
  const [text, setText] = useState("");

  const begin = () => {
    if (!noteHere) return;
    setTarget(noteHere);
    // One note per passage: writing on one that has a note edits it.
    setText(notes.find((n) => n.canonical_ref === noteHere.canonical_ref)?.text ?? "");
  };
  const cancel = () => {
    setTarget(null);
    setText("");
  };

  const exportNotes = () => {
    const ordered = [...notes].sort((a, b) => byPosition(position(a.canonical_ref), position(b.canonical_ref)));
    const body = [
      `# ${bookTitle}`,
      "",
      ...ordered.flatMap((n) => [
        `## ${pageOf(n.canonical_ref, bookType) || n.canonical_ref}`,
        "",
        ...(n.text_hi ? [`> ${n.text_hi.replace(/\n+/g, " ")}`, ""] : []),
        n.text,
        "",
      ]),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([body], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${bookCode}-notes.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {target ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            onSaveNote(target, text.trim());
            cancel();
          }}
          className="rounded-card border border-(--reader-rule) bg-(--reader-bg) p-4 shadow-sm"
        >
          <p className="flex gap-2.5 text-xs text-(--reader-ink-soft)">
            <span aria-hidden className="w-0.5 shrink-0 rounded-full bg-(--reader-rule)" />
            <span lang="hi" className="hi hi-tight line-clamp-2">{target.text_hi}</span>
          </p>
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                cancel();
              }
            }}
            rows={4}
            placeholder="Your note…"
            className="mt-3 w-full resize-none rounded-md border border-(--reader-rule) bg-transparent p-2.5 text-sm outline-none focus:border-(--ws-ink)"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={cancel} className="h-9 rounded-md px-3 text-sm text-(--reader-ink-soft) hover:bg-current/5">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!text.trim()}
              className="h-9 rounded-md px-4 text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: "var(--ws-color)" }}
            >
              Save note
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={begin}
          disabled={!noteHere}
          className="flex h-11 w-full items-center rounded-card border border-dashed px-4 text-sm font-semibold transition-colors hover:bg-current/[0.03] disabled:opacity-40"
          style={{ color: "var(--ws-ink)", borderColor: "color-mix(in srgb, var(--ws-color) 45%, transparent)" }}
        >
          + New note on this page
        </button>
      )}

      {notes.length === 0 ? (
        <p className="px-1 pt-4 text-sm text-(--reader-ink-soft)">
          No notes in this book yet. Write one here, or select a line and choose Note.
        </p>
      ) : (
        <>
          <ul className="mt-3 space-y-2.5">
            {notes.map((n) => {
              const colour = colours.get(n.canonical_ref);
              return (
                <li key={n.canonical_ref}>
                  <button
                    type="button"
                    onClick={() => onGoToRef(n.canonical_ref)}
                    className="block w-full rounded-card border border-(--reader-rule) bg-(--reader-bg) p-4 text-start shadow-sm transition-colors hover:border-(--reader-ink-soft)"
                  >
                    <span className="block whitespace-pre-line text-sm">{n.text}</span>
                    {n.text_hi && (
                      <span className="mt-2.5 flex gap-2.5 text-xs text-(--reader-ink-soft)">
                        <span
                          aria-hidden
                          className="w-0.5 shrink-0 rounded-full bg-(--reader-rule)"
                          style={colour ? { background: deep(colour) } : undefined}
                        />
                        <span lang="hi" className="hi hi-tight line-clamp-2">{n.text_hi}</span>
                      </span>
                    )}
                    <span className="hi-tight mt-2.5 block text-xs text-(--reader-ink-soft)">
                      {[pageOf(n.canonical_ref, bookType), when(n.updated_at)].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={exportNotes}
            className="mt-4 px-1 text-sm font-semibold text-(--reader-ink-soft) transition-colors hover:text-(--reader-ink)"
          >
            Export notes
          </button>
        </>
      )}
    </>
  );
}
