"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { NavScope } from "@/components/shell/WorkspaceProvider";
import { CountTabs } from "@/components/ui";
import { PERSONAL_SYNCED, localBookmarks, localNotes, syncPersonal } from "@/lib/personal";
import type { LocalBookmark, LocalNote } from "@/lib/storage";

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
} {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<PersonalRows | null>(null);

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

  return { rows, reload, signedIn: !!user, loading };
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
}: {
  active: PersonalTab;
  rows: PersonalRows | null;
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

      <div className="mt-4">
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
      </div>
    </>
  );
}
