"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type CSSProperties } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ChevronRight } from "@/components/shell/icons";
import type { Highlight } from "@/lib/personal";
import { parseRef, refToHref } from "@/lib/refs";
import { signInHref } from "@/lib/routes";
import type { TranslationRef } from "@/lib/types";

/**
 * The book page's right-hand column on desktop (Book preview, desktop revision
 * 29 Sep 2026): this book's highlights and notes, then its translations.
 *
 * On a phone the highlights are the second tab over the chapter list; on
 * desktop there is room to keep them in view beside it, so the tab bar goes and
 * the latest three sit here with a way through to the rest.
 */
export function BookAside({
  rows,
  translations,
}: {
  /** this book's highlights, or null while the local store is being read */
  rows: Highlight[] | null;
  translations: TranslationRef[];
}) {
  return (
    // `gap-8`, not the cards' own 20px: each card has its heading above it now,
    // and a heading needs the air above it to read as the start of a section.
    <aside className="hidden flex-col gap-8 lg:flex">
      <HighlightsCard rows={rows} />
      {translations.length > 0 && <TranslationsCard translations={translations} />}
    </aside>
  );
}

const CARD = "rounded-hero border border-rule bg-card p-5 shadow-card";

/**
 * The same heading the chapter list wears, outside its card rather than in
 * it — so the three cards on the page start on one line, under three headings
 * that also start on one line (designer's note, 30 Sep 2026).
 */
const HEADING = "mb-4 flex items-center text-xl font-semibold";

type Filter = "all" | "highlights" | "notes";

/** How many cards the column shows before "View all". */
const SHOWN = 3;

function HighlightsCard({ rows }: { rows: Highlight[] | null }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [filter, setFilter] = useState<Filter>("all");

  const newest = useMemo(
    () => [...(rows ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [rows]
  );
  const notes = newest.filter((h) => h.note).length;
  const shown = newest
    .filter((h) => (filter === "all" ? true : filter === "notes" ? !!h.note : !h.note))
    .slice(0, SHOWN);

  return (
    <section aria-labelledby="book-highlights">
      <h2 id="book-highlights" className={HEADING}>
        Highlights &amp; Notes
      </h2>
      <div className={CARD}>

      {rows === null ? null : newest.length === 0 ? (
        <>
          <p className="text-sm leading-relaxed text-ink-soft">
            {user
              ? "Nothing highlighted yet. Press and hold any line while reading to highlight it, or to write a note against it."
              : "Highlight passages and keep notes on this book while you read. Sign in and they sync between your phone and desktop."}
          </p>
          {!user && (
            <Link
              href={signInHref(pathname)}
              className="mt-4 inline-flex min-h-11 items-center rounded-control border px-4 text-sm font-semibold transition hover:brightness-95"
              style={{
                color: "var(--ws-ink)",
                background: "color-mix(in srgb, var(--ws-color) 8%, var(--color-card))",
                borderColor: "color-mix(in srgb, var(--ws-color) 30%, var(--color-card))",
              }}
            >
              Sign in
            </Link>
          )}
        </>
      ) : (
        <>
          <div
            role="radiogroup"
            aria-label="Show"
            className="flex gap-1 rounded-control border border-rule bg-inset p-1"
          >
            {(
              [
                ["all", "All", newest.length],
                ["highlights", "Highlights", newest.length - notes],
                ["notes", "Notes", notes],
              ] as const
            ).map(([value, label, count]) => {
              const on = filter === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setFilter(value)}
                  className={`flex min-h-11 min-w-0 flex-auto items-center justify-center gap-1 rounded-control px-2 text-sm transition-colors ${
                    on ? "bg-card font-semibold shadow-card" : "text-ink-soft"
                  }`}
                  style={on ? { color: "var(--ws-ink)" } : undefined}
                >
                  {label}
                  <span className="text-xs tabular-nums">{count}</span>
                </button>
              );
            })}
          </div>

          {shown.length === 0 ? (
            <p className="mt-4 text-sm text-ink-soft">None of these yet.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {shown.map((h) => (
                <li key={`${h.canonical_ref}:${h.span?.start ?? "all"}`}>
                  <HighlightRow highlight={h} />
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/me/bookmarks"
            className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold hover:underline"
            style={{ color: "var(--ws-ink)" }}
          >
            View all in My journey →
          </Link>
        </>
      )}
      </div>
    </section>
  );
}

/**
 * One highlight, small: the note if there is one, the passage under a stripe
 * of the colour it was painted in, and where and when.
 */
function HighlightRow({ highlight: h }: { highlight: Highlight }) {
  const ref = parseRef(h.canonical_ref);
  const where = [
    ref && ref.chapter !== "fm" ? `अध्याय ${ref.chapter}` : null,
    ref?.page ? `पृष्ठ ${ref.page}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  // The fills are pale enough to sit under text; as a 3px stripe on white they
  // vanish, so the stripe is the same colour taken a few steps darker.
  const stripe = h.colour
    ? `color-mix(in srgb, var(--color-hl-${h.colour}), #000 28%)`
    : "var(--color-rule)";

  return (
    <Link
      href={refToHref(h.canonical_ref)}
      className="block rounded-card border border-rule p-3.5 transition-shadow hover:shadow-card"
    >
      {h.note && (
        <p lang="hi" className="hi hi-tight mb-2 text-sm text-ink">
          {h.note}
        </p>
      )}
      <p
        lang="hi"
        className="hi line-clamp-3 border-s-[3px] ps-3 text-sm text-ink-soft"
        style={{ borderColor: stripe } as CSSProperties}
      >
        {h.text_hi}
      </p>
      <p className="mt-2.5 flex items-baseline justify-between gap-3 text-xs text-ink-soft">
        <span lang="hi">{where}</span>
        <span className="shrink-0">{ago(h.created_at)}</span>
      </p>
    </Link>
  );
}

/** "Today", "3 days ago", "1 week ago", "2 months ago". */
function ago(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const days = Math.round((then - Date.now()) / 86_400_000);
  const fmt = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const a = Math.abs(days);
  const s =
    a < 7 ? fmt.format(days, "day") : a < 30 ? fmt.format(Math.round(days / 7), "week") : fmt.format(Math.round(days / 30), "month");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const TRANSLATIONS = { "--ws-color": "var(--color-ws-translations)" } as CSSProperties;

function TranslationsCard({ translations }: { translations: TranslationRef[] }) {
  return (
    <section aria-labelledby="book-translations">
      <div className="mb-4">
        <h2 id="book-translations" className="text-xl font-semibold">
          Translations
        </h2>
        <p className="mt-0.5 text-xs text-ink-soft">in Translations workspace</p>
      </div>
      <ul className={`${CARD} flex flex-col gap-2.5`}>
        {translations.map((t) => (
          <li key={t.code}>
            <Link
              href={`/books/${encodeURIComponent(t.code)}`}
              className="flex min-h-14 items-center gap-3 rounded-card border border-rule px-3.5 py-2.5 transition-shadow hover:shadow-card"
            >
              <span
                aria-hidden
                data-ws
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-xs font-bold uppercase"
                style={{
                  ...TRANSLATIONS,
                  color: "var(--ws-ink)",
                  background: "color-mix(in srgb, var(--ws-color) 12%, var(--color-card))",
                }}
              >
                {t.language.slice(0, 2)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {t.language_label.replace(/\s*\(.*\)\s*$/, "") || t.language}
                </span>
                <span className="block truncate text-xs text-ink-soft">
                  {t.translator ? `Student translation · ${t.translator}` : "Student translation"}
                </span>
              </span>
              <span aria-hidden className="shrink-0 text-muted">
                <ChevronRight />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
