"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckIcon, CloseIcon } from "@/components/shell/icons";
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
/**
 * The picker's state, shared by the phone's sheet and the desktop tray: the
 * draft (applied only on Done), and the shelf grouped into its series.
 */
function useBookPicker(open: boolean, shelf: BookSummary[], scope: string[]) {
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
  // Every book ticked is the same search as none — send it as none.
  const everything = draft.length === shelf.length;
  return { draft, setDraft, groups, all, everything, toggle, toggleGroup };
}

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
  const { draft, setDraft, groups, all, everything, toggle, toggleGroup } = useBookPicker(open, shelf, scope);
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

/**
 * The same choice on desktop (desktop revision, 30 Sep 2026): a tray standing
 * on the box rather than a sheet rising from the floor of a wide window. A row
 * per series, its books as chips, so all of them are in view at once without
 * a scroll — eight titles fit where the sheet needed a screenful.
 *
 * Still a draft until Done; × and Escape leave the search as it was.
 */
export function BookPickerTray({
  shelf,
  scope,
  onClose,
  onDraft,
  onApply,
}: {
  shelf: BookSummary[];
  scope: string[];
  onClose: () => void;
  /** the ticks as they change, before Done — for the pill in the box */
  onDraft?: (codes: string[]) => void;
  onApply: (codes: string[]) => void;
}) {
  const { draft, setDraft, groups, all, everything, toggle } = useBookPicker(true, shelf, scope);
  useEffect(() => {
    onDraft?.(draft);
  }, [draft, onDraft]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // A click anywhere else puts it away, as a menu would — except on the
    // pill that opened it, which toggles it itself.
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element;
      if (ref.current?.contains(t) || t.closest?.("[data-book-picker-toggle]")) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [onClose]);

  const chosen = everything ? shelf.length : draft.length;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Search in"
      className="assistant-fade-in overflow-hidden rounded-card border border-rule bg-card shadow-raised"
    >
      <div className="flex items-center gap-3 px-4 pt-3">
        <p className="w-20 shrink-0 text-sm font-semibold text-ink-soft">Search in</p>
        <div className="min-w-0 flex-1">
          <Chip label="All books" on={all} onClick={() => setDraft([])} />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close without changing"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-rule bg-card"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-[50vh] overflow-y-auto px-4 pb-3">
        {groups.map((g) => (
          <div key={g.key} role="group" aria-label={g.name} className="mt-3 flex items-start gap-3">
            <p className="flex min-h-11 w-20 shrink-0 items-center text-sm font-semibold text-ink-soft">
              {g.name}
            </p>
            <div className="flex min-w-0 flex-1 flex-wrap gap-2">
              {g.books.map((b) => (
                <Chip key={b.code} label={b.title_hi} hindi on={draft.includes(b.code)} onClick={() => toggle(b.code)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-rule px-4 py-3">
        <p className="text-sm text-ink-soft">
          {all ? `All ${shelf.length} books` : `${chosen} of ${shelf.length} books selected`}
        </p>
        <button
          type="button"
          onClick={() => {
            onApply(everything ? [] : draft);
            onClose();
          }}
          className="inline-flex min-h-11 items-center rounded-control px-5 text-sm font-semibold text-white"
          style={{ background: WORKSPACES.connect.color }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

/** A book, or "All books", in the tray — Connect's teal when chosen, as the pill in the box is. */
function Chip({
  label,
  on,
  onClick,
  hindi = false,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
  hindi?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      data-ws
      className={`inline-flex min-h-11 items-center rounded-full border px-3.5 text-sm transition-colors ${
        on ? "font-semibold" : "border-rule bg-card text-ink hover:bg-inset"
      }`}
      style={{
        ["--ws-color" as string]: "var(--color-ws-connect)",
        ...(on
          ? {
              color: "var(--ws-ink)",
              borderColor: "color-mix(in srgb, var(--ws-color) 55%, var(--color-card))",
              background: "color-mix(in srgb, var(--ws-color) 12%, var(--color-card))",
            }
          : {}),
      }}
    >
      <span lang={hindi ? "hi" : undefined} className={hindi ? "hi-note" : ""}>
        {label}
      </span>
    </button>
  );
}
