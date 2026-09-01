"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { NavScope } from "@/components/shell/WorkspaceProvider";
import { Chip, ChipRow, CountTabs } from "@/components/ui";
import { getBooks } from "@/lib/api";
import { PERSONAL_SYNCED, localBookmarks, localNotes, syncPersonal } from "@/lib/personal";
import type { LocalBookmark, LocalNote } from "@/lib/storage";
import type { BookSummary } from "@/lib/types";

/**
 * **Highlights and Notes, under one heading.**
 *
 * They were two tabs in My Journey's bar — "Saved" and "Notes" — and that was
 * the reader's own act split down the middle by our storage. Selecting a
 * passage offers two things (paint it, or write against it), and a note is
 * written *against a passage*: the same sentence, kept the same afternoon, for
 * the same reason. Asking which of two tabs it went into is a question about
 * our tables, not about their reading. One heading, two tabs, and the counts
 * on the tabs say what is behind each.
 *
 * It also buys back a slot. The journey bar was the only four-slot workspace
 * on a phone, and the two it spent here were the two most alike.
 *
 * **Deliberately two routes rather than one page with state.** `/me/bookmarks`
 * and `/me/notes` both already existed, both are worth linking to, and the
 * back button between the two lists is a thing readers press. This is exactly
 * the book page's arrangement — `CountTabs` is a row of links there too — so
 * the two Highlights-and-Notes bars in the app work the same way.
 */

export type PersonalTab = "highlights" | "notes";

export interface PersonalRows {
  bookmarks: LocalBookmark[];
  notes: LocalNote[];
}

/** `book_code` → the book's own title, for the filter's chips. */
export type BookTitles = Map<string, string>;

/**
 * Both lists, loaded once.
 *
 * The tab bar counts what is on the other tab, so a page that loaded only its
 * own rows would draw one true count beside one it had to guess. Reading both
 * costs nothing — the local store answers synchronously, and it is the same
 * single `syncPersonal()` behind them.
 *
 * Local-first in both states, like every personal row in this app: on screen
 * in the first paint, intact offline, and a signed-in reader additionally gets
 * the sync that folds in what they marked on another device.
 */
export function usePersonalRows(): {
  rows: PersonalRows | null;
  reload: () => void;
  signedIn: boolean;
  loading: boolean;
  /** what the filter chips are named after; empty until the shelf answers */
  titles: BookTitles;
} {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<PersonalRows | null>(null);
  const [titles, setTitles] = useState<BookTitles>(new Map());

  const reload = useCallback(
    () => setRows({ bookmarks: localBookmarks(), notes: localNotes() }),
    []
  );

  useEffect(() => {
    if (loading) return;
    reload();
    if (user) void syncPersonal().then(reload);
  }, [user, loading, reload]);

  // A sync started by another screen — the reader was in the book a moment
  // ago — lands in the same store this list is drawn from. Without this the
  // new rows sit there unseen until a reload.
  useEffect(() => {
    window.addEventListener(PERSONAL_SYNCED, reload);
    return () => window.removeEventListener(PERSONAL_SYNCED, reload);
  }, [reload]);

  /**
   * The shelf, for names to put on the filter's chips.
   *
   * A saved row carries a `book_code` and nothing else about the book, so the
   * chips would otherwise read "JVEP" and "MAND". Asked for once, across every
   * workspace — a reader's highlights are their own and pay no attention to
   * which shelf a book sits on, which is the same reason the Reading rail on
   * this screen asks for "all".
   *
   * Failing is not fatal: `bookTitle` falls back to the code, so an offline
   * reader gets a filter that works and is merely less well labelled. The same
   * call `ContinueReading` makes, and the browser will have cached it.
   */
  useEffect(() => {
    let live = true;
    getBooks()
      .then((books: BookSummary[]) => {
        if (live) setTitles(new Map(books.map((b) => [b.code, b.title_hi])));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  return { rows, reload, signedIn: !!user, loading, titles };
}

/** The book's own name where the shelf has been read, its code until then. */
export function bookTitle(code: string, titles: BookTitles): string {
  return titles.get(code) ?? code;
}

/**
 * The books a reader actually has something saved in, in the order the rows
 * put them — newest first, because that is the order the store keeps and the
 * book someone just marked is the one they are most likely to want.
 *
 * Built from the rows rather than from the shelf: a filter offering all
 * thirteen books when eleven of them hold nothing is a control that mostly
 * does nothing when pressed.
 */
export function booksInRows(rows: (LocalBookmark | LocalNote)[]): string[] {
  const seen: string[] = [];
  for (const r of rows) if (r.book_code && !seen.includes(r.book_code)) seen.push(r.book_code);
  return seen;
}

/**
 * The heading, the sync line and the two tabs — identical on both routes.
 *
 * Rendered by each page rather than by a shared `layout.tsx`: a layout would
 * have to load the rows a second time to count them, and the two loaders would
 * disagree for as long as one of them had finished and the other had not.
 */
export function PersonalHeader({
  active,
  rows,
  titles,
  book,
  onBook,
}: {
  active: PersonalTab;
  rows: PersonalRows | null;
  titles: BookTitles;
  /** the book being filtered to, or `null` for all of them */
  book: string | null;
  onBook: (code: string | null) => void;
}) {
  const { user, loading } = useAuth();
  const anything = rows !== null && rows.bookmarks.length + rows.notes.length > 0;

  return (
    <>
      {/* Notes is not a tab of its own in the bar any more, so it has nothing
          the nav can match on the URL. It says which tab it belongs under. */}
      {active === "notes" && <NavScope href="/me/bookmarks" />}

      <h1 className="font-display text-2xl font-medium">Highlights &amp; Notes</h1>
      {!loading && !user && anything && (
        <p className="mt-1 text-xs text-ink-soft">
          Saved on this device ·{" "}
          <Link
            href={`/login?next=${active === "notes" ? "/me/notes" : "/me/bookmarks"}`}
            className="underline"
          >
            Sign in to sync
          </Link>
        </p>
      )}

      {/* **The tabs and the book filter pin under the app bar, as one box.**

          Both lists run long — a reader with a year of highlights scrolls a
          long way — and these are the two controls that decide what is in
          front of them: which list, and which book. Either one scrolling away
          from the rows it governs is the same complaint, so they pin together.

          **One sticky box holding both, not two stacked ones.** A second
          sticky element would have to be offset by the first one's height, and
          that height is not a constant — the tabs grow with the app text-size
          setting, and the filter row is absent entirely below two books. One
          box measures itself.

          The air above the bar is padding inside the sticky box rather than a
          larger `top`, for the reason Connect's search row gives: pushing the
          offset down opens a band that belongs to neither the app bar nor this
          row, and the list scrolls up through it in the clear. Opaque
          `bg-surface`, because this stops directly under a bar that is already
          blurring what passes behind it. */}
      <div className="sticky top-(--app-header-h) z-30 -mx-4 mt-2 bg-surface px-4 pb-2 pt-2 sm:mx-0 sm:px-0 lg:top-0">
        <CountTabs
          label="Highlights and notes"
          surface="page"
          value={active}
          tabs={[
            {
              value: "highlights",
              label: "Highlights",
              count: rows?.bookmarks.length,
              href: "/me/bookmarks",
            },
            {
              value: "notes",
              label: "Notes",
              count: rows?.notes.length,
              href: "/me/notes",
            },
          ]}
        />
        <BookFilter
          rows={active === "notes" ? rows?.notes : rows?.bookmarks}
          titles={titles}
          book={book}
          onBook={onBook}
        />
      </div>
    </>
  );
}

/**
 * **Which book — the one axis a list of saved passages has.**
 *
 * A highlight's own screen already answers *where in this book*: the book's
 * Highlights & Notes tab groups them by chapter, with a sheet for narrowing to
 * one. What this cross-book list cannot answer without a control is the
 * question it exists to raise — *which of my books is this from* — and a
 * reader who wants what they marked in one book was reading past everything
 * they marked in the other twelve.
 *
 * **Chips, not a sheet.** The book page uses a sheet for its chapters because
 * there are dozens; here there are only ever as many books as the reader has
 * actually marked something in, which is a handful. `tint` rather than `solid`
 * is the row's own rule — something is always selected here, and a row of
 * solid fills would read as several filters at once rather than one position.
 *
 * Drawn from the rows, so it never offers a book with nothing behind it, and
 * absent entirely below two books: a filter that can only say "all" or "the
 * only one there is" is furniture.
 */
function BookFilter({
  rows,
  titles,
  book,
  onBook,
}: {
  rows: (LocalBookmark | LocalNote)[] | undefined;
  titles: BookTitles;
  book: string | null;
  onBook: (code: string | null) => void;
}) {
  const codes = booksInRows(rows ?? []);
  if (codes.length < 2) return null;
  return (
    /* `mt-2` rather than `mt-3`: this sits inside the pinned box now, and the
       gap between the tabs and the chips is height the reader pays for on
       every screen of the list rather than once at the top of the page. */
    <div className="mt-2">
      <ChipRow label="Filter by book">
        <Chip label="All books" selected={book === null} variant="tint" onClick={() => onBook(null)} />
        {codes.map((code) => (
          <Chip
            key={code}
            label={bookTitle(code, titles)}
            selected={book === code}
            variant="tint"
            onClick={() => onBook(book === code ? null : code)}
          />
        ))}
      </ChipRow>
    </div>
  );
}
