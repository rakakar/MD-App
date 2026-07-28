"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { PageContainer, SectionHeading } from "@/components/ui";
import { applyConsent } from "@/lib/analytics";
import { listDownloads, removeDownload, type DownloadRecord } from "@/lib/idb";
import {
  getPrefs,
  setPrefs,
  type Prefs,
  type ReaderTheme,
} from "@/lib/storage";

export default function SettingsPage() {
  const { user, loading, logout } = useAuth();
  const [prefs, setPrefsState] = useState<Prefs | null>(null);
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);

  useEffect(() => {
    setPrefsState(getPrefs());
    void listDownloads().then(setDownloads);
  }, []);

  const update = (patch: Partial<Prefs>) => {
    setPrefsState(setPrefs(patch));
    if (patch.consent !== undefined) applyConsent(patch.consent === "granted");
  };

  if (!prefs) return null;

  return (
    <PageContainer>
      <h1 className="text-xl font-bold">Settings</h1>

      <SectionHeading>Account</SectionHeading>
      <div className="rounded-2xl border border-rule bg-white p-4">
        {loading ? null : user ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{(user.email as string) ?? ""}</p>
              <p className="text-xs text-ink-soft">Bookmarks, notes and progress sync to this account.</p>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="shrink-0 rounded-full border border-rule px-3 py-1.5 text-sm"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-ink-soft">Reading as guest — saved on this device only.</p>
            <Link
              href="/login?next=/me/settings"
              className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-white"
              style={{ background: "var(--ws-color)" }}
            >
              Sign in
            </Link>
          </div>
        )}
      </div>

      <SectionHeading>Reading</SectionHeading>
      <div className="rounded-2xl border border-rule bg-white p-4">
        <p className="text-sm font-medium">Theme</p>
        <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Reader theme">
          {(["system", "light", "sepia", "dark"] as ReaderTheme[]).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={prefs.theme === t}
              onClick={() => update({ theme: t })}
              className={`rounded-full border px-3 py-1 text-xs capitalize ${
                prefs.theme === t ? "border-transparent font-semibold text-white" : "border-rule"
              }`}
              style={prefs.theme === t ? { background: "var(--ws-color)" } : undefined}
            >
              {t === "system" ? "Auto" : t}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-ink-soft">
          Auto follows your device&apos;s light/dark setting. Full type controls are in
          the reader itself.
        </p>
        <p className="mt-4 text-sm font-medium">Reading mode</p>
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
              className={`rounded-full border px-3 py-1 text-xs ${
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

      <SectionHeading>Offline downloads</SectionHeading>
      <div className="rounded-2xl border border-rule bg-white">
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
                  className="shrink-0 rounded-full border border-rule px-3 py-1 text-xs"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <SectionHeading>Privacy</SectionHeading>
      <div className="flex items-center justify-between rounded-2xl border border-rule bg-white p-4">
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
          className={`h-6 w-11 rounded-full p-0.5 transition-colors ${
            prefs.consent === "granted" ? "" : "bg-rule"
          }`}
          style={prefs.consent === "granted" ? { background: "var(--ws-color)" } : undefined}
        >
          <span
            className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
              prefs.consent === "granted" ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>
    </PageContainer>
  );
}
