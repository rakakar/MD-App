"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountSecurity } from "@/components/auth/AccountSecurity";
import { useAuth } from "@/components/auth/AuthProvider";
import { NotificationSetting } from "@/components/push/NotificationSetting";
import { DisplayControls } from "@/components/shell/DisplaySheet";
import { AppAccent } from "@/components/shell/WorkspaceProvider";
import { useDisplay } from "@/components/shell/DisplayProvider";
import { PageContainer, SectionHeading, ctaPrimary } from "@/components/ui";
import { applyConsent } from "@/lib/analytics";
import {
  formatBytes,
  listSavedAudio,
  removeAllAudio,
  removeAudio,
  type SavedAudio,
} from "@/lib/audioCache";
import { listDownloads, removeDownload, type DownloadRecord } from "@/lib/idb";
import { getPrefs, setPrefs, type Prefs } from "@/lib/storage";

export default function SettingsPage() {
  const { user, loading, logout } = useAuth();
  const { reset } = useDisplay();
  const [prefs, setPrefsState] = useState<Prefs | null>(null);
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [audio, setAudio] = useState<SavedAudio[]>([]);

  useEffect(() => {
    setPrefsState(getPrefs());
    void listDownloads().then(setDownloads);
    void listSavedAudio().then(setAudio);
  }, []);

  const update = (patch: Partial<Prefs>) => {
    setPrefsState(setPrefs(patch));
    if (patch.consent !== undefined) applyConsent(patch.consent === "granted");
  };

  if (!prefs) return null;

  return (
    // The one screen on the recessed canvas (design 3B): the darker warm
    // ground makes the white grouped cards read as raised inset lists.
    <AppAccent>
    <div className="min-h-full bg-canvas">
    <PageContainer>
      <h1 className="font-display text-2xl font-medium">Settings</h1>

      <SectionHeading>Account</SectionHeading>
      <div className="rounded-2xl border border-rule bg-card p-4">
        {loading ? null : user ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {(user.name as string) || (user.email as string) || ""}
              </p>
              <p className="text-xs text-ink-soft">Bookmarks, notes and progress sync to this account.</p>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-rule px-4 text-sm"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-ink-soft">Reading as guest — saved on this device only.</p>
            <Link
              href="/login?next=/settings"
              className={ctaPrimary}
              style={{ background: "var(--ws-color)" }}
            >
              Sign in
            </Link>
          </div>
        )}
      </div>
      {!loading && user && <AccountSecurity />}

      {/* Second, under Account. Account stays first because it is identity and
          one row tall; Appearance is here because it is the most-visited
          setting on this screen — and the same controls the "Aa" button in the
          header opens, laid out flat instead of in a sheet, because a settings
          screen hiding its settings behind another tap is a menu, not a
          screen. */}
      <SectionHeading>Appearance</SectionHeading>
      <div className="rounded-2xl border border-rule bg-card p-4">
        <DisplayControls />
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-rule text-sm font-medium"
        >
          Reset to defaults
        </button>
      </div>

      <SectionHeading>Reading</SectionHeading>
      <div className="rounded-2xl  border border-rule bg-card p-4">
        <p className="text-sm font-medium">Reading mode</p>
        <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Reading mode">
          {([
            [null, "Automatic"],
            ["page", "Pages"],
            ["scroll", "Scroll"],
          ] as const).map(([m, label]) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={prefs.readingMode === m}
              onClick={() => update({ readingMode: m })}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 text-xs ${
                prefs.readingMode === m
                  ? "border-transparent font-semibold text-white"
                  : "border-rule"
              }`}
              style={prefs.readingMode === m ? { background: "var(--ws-color)" } : undefined}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Renders its own heading, or nothing at all — this browser may have no
          push to offer, and a heading over an empty space explains nothing. */}
      <NotificationSetting />

      <SectionHeading>Offline downloads</SectionHeading>
      <div className="rounded-2xl border border-rule bg-card">
        {downloads.length === 0 ? (
          <p className="p-4 text-sm text-ink-soft">
            No books downloaded. Use “Download for offline” on any book page.
          </p>
        ) : (
          <ul className="divide-y divide-rule">
            {downloads.map((d) => (
              <li key={d.code} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p lang="hi" className="hi truncate text-sm font-medium">{d.title_hi}</p>
                  <p className="text-xs text-ink-soft">{d.chapter_count} chapters</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void removeDownload(d.code).then(() => listDownloads().then(setDownloads))
                  }
                  className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-rule px-4 text-xs"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Audio is listed apart from the books, and per chapter, because it is a
          different order of size: a saved chapter is tens of megabytes where a
          whole downloaded book's text is a few. A reader who is short of space
          needs to see which chapters, and how much each one costs. */}
      <SectionHeading>Saved audio</SectionHeading>
      <div className="rounded-2xl border border-rule bg-card">
        {audio.length === 0 ? (
          <p className="p-4 text-sm text-ink-soft">
            No chapters saved for offline listening. Open a chapter’s audio mode and tap the
            download size.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
              <p className="text-xs text-ink-soft">
                {audio.length} {audio.length === 1 ? "chapter" : "chapters"} ·{" "}
                {formatBytes(audio.reduce((n, a) => n + a.bytes, 0))}
              </p>
              <button
                type="button"
                onClick={() => void removeAllAudio().then(() => setAudio([]))}
                className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-rule px-4 text-xs"
              >
                Remove all
              </button>
            </div>
            <ul className="divide-y divide-rule">
              {audio.map((a) => (
                <li key={a.url} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p lang="hi" className="hi truncate text-sm font-medium">
                      {a.chapter_title}
                    </p>
                    <p lang="hi" className="hi truncate text-xs text-ink-soft">
                      {a.book_title} · {a.voice_label} · {formatBytes(a.bytes)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void removeAudio(a.url).then(() => listSavedAudio().then(setAudio))
                    }
                    className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-rule px-4 text-xs"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <SectionHeading>Privacy</SectionHeading>
      <div className="flex items-center justify-between rounded-2xl border border-rule bg-card p-4">
        <div>
          <p className="text-sm font-medium">Analytics</p>
          <p className="text-xs text-ink-soft">Anonymous usage statistics (Google Analytics).</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={prefs.consent === "granted"}
          onClick={() =>
            update({ consent: prefs.consent === "granted" ? "denied" : "granted" })
          }
          // A switch is drawn 24px tall because that is what a switch looks
          // like. The pseudo-element grows the *target* to 44px without
          // growing the track — the reader's own toggles get this for free by
          // sitting inside a <label>, and this one has no label to sit in.
          className={`relative h-6 w-11 rounded-full p-0.5 transition-colors before:absolute before:inset-x-0 before:-inset-y-2.5 before:content-[''] ${
            prefs.consent === "granted" ? "" : "bg-rule"
          }`}
          style={prefs.consent === "granted" ? { background: "var(--ws-color)" } : undefined}
        >
          <span
            className={`block h-5 w-5 rounded-full bg-card shadow transition-transform ${
              prefs.consent === "granted" ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>
    </PageContainer>
    </div>
    </AppAccent>
  );
}
