"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ShareIcon } from "@/components/shell/icons";
import {
  CheckRow,
  Chip,
  ChipRow,
  EmptyState,
  Sheet,
  SheetAction,
  SheetTextAction,
} from "@/components/ui";
import { localHighlights, syncPersonal, type Highlight } from "@/lib/personal";
import { parseRef, refToHref } from "@/lib/refs";
import type { HighlightColour } from "@/lib/storage";
import type { ChapterTocEntry } from "@/lib/types";

/**
 * A book's highlights and notes (design, "Highlights scrolled").
 *
 * Device-local in both states, like every other personal row in this app: the
 * list is on screen in the first paint and survives being offline, and a
 * signed-in reader additionally gets a sync that folds in what they marked on
 * another device.
 *
 * Grouped by chapter rather than listed flat. A highlight's value is almost
 * entirely where it sits in the argument — "मन के दो कार्यरूप हैं" means one
 * thing under जीवन का स्वरूप and another under प्रश्न-उत्तर — and a flat list
 * ordered by when you happened to press the button loses exactly that.
 */

/** Tailwind cannot build a class name at runtime; the three are written out. */
const FILL: Record<HighlightColour, string> = {
  amber: "bg-hl-amber",
  sage: "bg-hl-sage",
  sky: "bg-hl-sky",
};

type Mode = "all" | "notes";

export function HighlightsPanel({
  bookCode,
  chapters,
}: {
  bookCode: string;
  chapters: ChapterTocEntry[];
}) {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<Highlight[] | null>(null);
  const [mode, setMode] = useState<Mode>("all");
  const [picked, setPicked] = useState<string[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);

  const reload = useCallback(() => setRows(localHighlights(bookCode)), [bookCode]);

  useEffect(() => {
    if (loading) return;
    reload();
    if (user) void syncPersonal().then(reload);
  }, [user, loading, reload]);

  const byChapter = useMemo(() => new Map(chapters.map((c) => [String(c.number), c])), [chapters]);

  /** Every highlight tagged with the chapter its ref names, newest first. */
  const tagged = useMemo(
    () =>
      (rows ?? []).map((h) => {
        const ref = parseRef(h.canonical_ref);
        return { h, chapter: ref?.chapter ?? "", page: ref?.page ?? null };
      }),
    [rows]
  );

  const counts = useMemo(() => {
    const map = new Map<string, { highlights: number; notes: number }>();
    for (const t of tagged) {
      const row = map.get(t.chapter) ?? { highlights: 0, notes: 0 };
      row.highlights += 1;
      if (t.h.note) row.notes += 1;
      map.set(t.chapter, row);
    }
    return map;
  }, [tagged]);

  const withNotes = tagged.filter((t) => t.h.note).length;

  const shown = tagged.filter(
    (t) =>
      (mode === "all" || t.h.note) && (picked.length === 0 || picked.includes(t.chapter))
  );

  // Chapter order, not save order: the groups walk the book.
  const groups = useMemo(() => {
    const out = new Map<string, typeof shown>();
    for (const c of chapters) {
      const inChapter = shown.filter((t) => t.chapter === String(c.number));
      if (inChapter.length > 0) out.set(String(c.number), inChapter);
    }
    // Anything whose chapter this book does not list — a ref from an edition
    // that has since been repaginated. Kept rather than dropped: it is still
    // the reader's own words.
    const orphans = shown.filter((t) => !byChapter.has(t.chapter));
    if (orphans.length > 0) out.set("", orphans);
    return out;
  }, [shown, chapters, byChapter]);

  if (rows === null) return null;

  if (rows.length === 0) {
    return (
      <div className="mt-5">
        <EmptyState
          title="Nothing highlighted yet"
          hint="Press and hold any line while reading to paint it, or to write a note against it."
        />
      </div>
    );
  }

  return (
    <div className="mt-4">
      <ChipRow label="Filter highlights">
        <Chip
          label={`All ${tagged.length}`}
          selected={mode === "all"}
          variant="tint"
          onClick={() => setMode("all")}
        />
        <Chip
          label={`With Notes ${withNotes}`}
          selected={mode === "notes"}
          variant="tint"
          onClick={() => setMode("notes")}
        />
        <Chip
          label={
            picked.length > 0 ? `Chapters · ${picked.length}` : "Sort by Chapters"
          }
          selected={picked.length > 0}
          variant="tint"
          onClick={() => {
            setDraft(picked);
            setSheetOpen(true);
          }}
        />
      </ChipRow>

      {shown.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="Nothing under this filter"
            hint="Clear the chapters, or switch back to All."
          />
        </div>
      ) : (
        [...groups].map(([number, items]) => (
          <section key={number || "orphans"} className="mt-5">
            <h3 className="mb-2 text-sm font-medium text-ink-soft">
              {byChapter.has(number) ? (
                <>
                  अध्याय {number} :{" "}
                  <span lang="hi" className="hi">
                    {byChapter.get(number)?.title_hi}
                  </span>
                </>
              ) : (
                "Elsewhere in this book"
              )}
            </h3>
            <ul className="flex flex-col gap-3">
              {items.map((t) => (
                <li key={t.h.canonical_ref}>
                  <HighlightCard
                    href={refToHref(t.h.canonical_ref)}
                    highlight={t.h}
                    page={t.page}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Chapters"
        actions={<SheetTextAction onClick={() => setDraft([])}>Clear</SheetTextAction>}
        footer={
          <SheetAction
            onClick={() => {
              setPicked(draft);
              setSheetOpen(false);
            }}
          >
            Apply
          </SheetAction>
        }
      >
        <div className="px-2 py-2">
          {chapters.map((c) => {
            const n = String(c.number);
            const count = counts.get(n);
            return (
              <CheckRow
                key={n}
                label={`${c.number} · ${c.title_hi}`}
                // Chapters with nothing in them are shown greyed rather than
                // hidden: "no highlights here" is an answer to "where are my
                // highlights", not an absence.
                meta={
                  count
                    ? `${count.highlights} हाइलाइट${count.notes ? ` · ${count.notes} नोट` : ""}`
                    : "कोई हाइलाइट नहीं"
                }
                checked={draft.includes(n)}
                disabled={!count}
                onChange={(v) =>
                  setDraft((d) => (v ? [...d, n] : d.filter((x) => x !== n)))
                }
              />
            );
          })}
        </div>
      </Sheet>
    </div>
  );
}

function HighlightCard({
  href,
  highlight,
  page,
}: {
  href: string;
  highlight: Highlight;
  page: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const text = highlight.text_hi ?? "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // a browser that refuses the clipboard is not an error worth a dialog
    }
  };

  return (
    <div className="rounded-card border border-rule bg-card p-4 shadow-card">
      <Link href={href} className="block">
        {/* The passage keeps the colour it was painted in — that is the only
            thing on this screen that carries which highlight this is, and it
            is why the fills were measured against book ink rather than
            against the card. An uncoloured row is a note on a passage that
            was never painted; it gets no fill and reads as a quotation. */}
        <span
          lang="hi"
          className={`hi box-decoration-clone rounded-md text-base leading-relaxed ${
            highlight.colour ? `${FILL[highlight.colour]} px-1` : "text-ink-soft"
          }`}
        >
          {text}
        </span>
      </Link>

      {highlight.note && (
        <p className="mt-3 rounded-tile bg-inset p-3 text-sm leading-relaxed">
          <span lang="hi" className="hi">
            {highlight.note}
          </span>
        </p>
      )}

      <div className="mt-3 flex items-center gap-3 border-t border-rule pt-2">
        <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">
          {page ? `पृष्ठ ${page}` : ""}
          {page ? " · " : ""}
          {relative(highlight.created_at)}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy this passage"
          className="min-h-11 px-1 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <a
          href={href}
          aria-label="Open this passage"
          className="flex h-11 w-9 items-center justify-center text-ink-soft transition-colors hover:text-ink"
        >
          <ShareIcon className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

/**
 * "3 दिन पहले". Devanagari because the card it sits on is Devanagari — the
 * comps set this line in Hindi, and an English "3 days ago" under a Hindi
 * passage is the join showing.
 */
function relative(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const days = Math.round((then - Date.now()) / 86_400_000);
  try {
    return new Intl.RelativeTimeFormat("hi", { numeric: "auto" }).format(
      days,
      Math.abs(days) < 1 ? "day" : "day"
    );
  } catch {
    return "";
  }
}
