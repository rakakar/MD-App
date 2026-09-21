"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckIcon } from "@/components/shell/icons";
import { Sheet, SheetAction, SheetTextAction } from "@/components/ui";
import { getBookGenres } from "@/lib/api";
import type { BookGenre, BookSummary } from "@/lib/types";
import { WORKSPACES } from "@/lib/workspaceConfig";

let genres: Promise<BookGenre[]> | null = null;

/**
 * Which books Book search and Research look in — a checklist in a sheet, grouped by series.
 *
 * Replaced a sideways-scrolling row of chips above the box (19 Sep): twelve
 * Hindi titles in one row hid ten of them off the edge, and a reader looking
 * for one had to hunt for it by swiping. Here every title is a full row,
 * and the works sit in the series readers already think in — Darshan, Vaad,
 * Shastra, Parichay — each of which can be taken whole with one tap.
 *
 * The series are the BE's own genres (`book-genres/`), in its order and with
 * its names, so a manager filing a new book puts it in the right group with no
 * change here. A book not yet filed lands under "Other" rather than vanishing.
 *
 * Choices are a draft until Done: closing the sheet any other way leaves the
 * search as it was, which is what a reader backing out of a sheet expects.
 */
export function BookPickerSheet({
  open,
  shelf,
  scope,
  onClose,
  onApply,
}: {
  open: boolean;
  shelf: BookSummary[];
  /** the books chosen now; empty means all of them */
  scope: string[];
  onClose: () => void;
  onApply: (codes: string[]) => void;
}) {
  const [draft, setDraft] = useState<string[]>(scope);
  const [series, setSeries] = useState<BookGenre[]>([]);

  useEffect(() => {
    if (open) setDraft(scope);
  }, [open, scope]);

  useEffect(() => {
    genres ??= getBookGenres().catch(() => {
      genres = null;
      return [];
    });
    let alive = true;
    void genres.then((g) => alive && setSeries(g));
    return () => {
      alive = false;
    };
  }, []);

  const groups = useMemo(() => {
    const known = [...series].sort((a, b) => a.ordering - b.ordering);
    const out = known
      .map((g) => ({ key: g.code, name: g.name, books: shelf.filter((b) => b.genre === g.code) }))
      .filter((g) => g.books.length > 0);
    const filed = new Set(out.flatMap((g) => g.books.map((b) => b.code)));
    const rest = shelf.filter((b) => !filed.has(b.code));
    if (rest.length) out.push({ key: "other", name: out.length ? "Other" : "Books", books: rest });
    return out;
  }, [series, shelf]);

  const all = draft.length === 0;
  const toggle = (code: string) =>
    setDraft((d) => (d.includes(code) ? d.filter((c) => c !== code) : [...d, code]));
  const toggleGroup = (codes: string[]) =>
    setDraft((d) => {
      const whole = codes.every((c) => d.includes(c));
      return whole ? d.filter((c) => !codes.includes(c)) : [...new Set([...d, ...codes])];
    });

  // Every book ticked is the same search as none — say so, and send it as none.
  const everything = draft.length === shelf.length;
  const done = all || everything ? "Search all books" : `Search ${draft.length === 1 ? "1 book" : `${draft.length} books`}`;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Search in"
      subtitle="Book search and Research look only in the books you choose"
      accent={WORKSPACES.connect.color}
      actions={draft.length > 0 ? <SheetTextAction onClick={() => setDraft([])}>Clear</SheetTextAction> : undefined}
      footer={
        <SheetAction
          onClick={() => {
            onApply(everything ? [] : draft);
            onClose();
          }}
        >
          {done}
        </SheetAction>
      }
    >
      <div className="px-5 pb-4 pt-2">
        <Row label="All books" checked={all} onClick={() => setDraft([])} radio />

        {groups.map((g) => {
          const codes = g.books.map((b) => b.code);
          const whole = codes.every((c) => draft.includes(c));
          return (
            <section key={g.key} className="mt-5" aria-label={g.name}>
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">{g.name}</h3>
                <span aria-hidden className="h-px flex-1 bg-rule" />
                {codes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(codes)}
                    aria-pressed={whole}
                    className="inline-flex min-h-11 items-center text-sm font-semibold"
                    style={{ color: "var(--ws-ink)" }}
                  >
                    {whole ? "Clear these" : `All ${g.name}`}
                  </button>
                )}
              </div>
              <ul>
                {g.books.map((b) => (
                  <li key={b.code}>
                    <Row
                      label={b.title_hi}
                      hindi
                      checked={draft.includes(b.code)}
                      onClick={() => toggle(b.code)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </Sheet>
  );
}

/**
 * One choice. A tick in a box for a book — several can be on — and a round
 * mark for "All books", which is either-or with the rest. The tick is what
 * says it is chosen; the fill beside it only repeats it.
 */
function Row({
  label,
  checked,
  onClick,
  hindi = false,
  radio = false,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
  hindi?: boolean;
  radio?: boolean;
}) {
  return (
    <button
      type="button"
      role={radio ? "radio" : "checkbox"}
      aria-checked={checked}
      onClick={onClick}
      className="flex min-h-13 w-full items-center gap-3 border-b border-rule py-2 text-left last:border-b-0"
    >
      <span
        aria-hidden
        className={`flex h-6 w-6 shrink-0 items-center justify-center border-2 text-white transition-colors ${
          radio ? "rounded-full" : "rounded-md"
        }`}
        style={
          checked
            ? { background: "var(--ws-color)", borderColor: "var(--ws-color)" }
            : { borderColor: "var(--color-muted)" }
        }
      >
        {checked && <CheckIcon className="h-4 w-4" />}
      </span>
      <span
        lang={hindi ? "hi" : undefined}
        className={`${hindi ? "hi-note" : ""} min-w-0 flex-1 text-lg ${checked ? "font-semibold" : ""}`}
      >
        {label}
      </span>
    </button>
  );
}
