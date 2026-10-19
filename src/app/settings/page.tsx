"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { NotificationSetting } from "@/components/push/NotificationSetting";
import { AccountCard } from "@/components/settings/AccountCard";
import { AppearanceCard } from "@/components/settings/AppearanceCard";
import { DownloadsCard } from "@/components/settings/DownloadsCard";
import { ReadingCard } from "@/components/settings/ReadingCard";
import { CARD, SettingsSection, SwitchRow, useToast } from "@/components/settings/parts";
import { SignOutIcon } from "@/components/shell/icons";
import { AppAccent } from "@/components/shell/WorkspaceProvider";
import { useDisplay } from "@/components/shell/DisplayProvider";
import { useIsDesktop } from "@/components/ui/Dialog";
import { applyConsent } from "@/lib/analytics";
import { formatBytes, listSavedAudio, removeAllAudio, removeAudio, type SavedAudio } from "@/lib/audioCache";
import { APP_VERSION } from "@/lib/feedback";
import { chapterBytesByBook, listDownloads, removeDownload, type DownloadRecord } from "@/lib/idb";
import { getPrefs, setPrefs, type Prefs } from "@/lib/storage";

/**
 * Settings — the designer's comps of 19 Oct 2026.
 *
 * One column of eyebrow-titled cards. At a desk a section list stands to the
 * left, lit for the section in view, and each card opens its rows in place; on
 * a phone the list goes, the account rows open sheets, and the controls take
 * their thumb-sized shapes (a slider for text size, a segmented reading
 * style). Both are the same settings in the same order.
 */
export default function SettingsPage() {
  const { user, loading, logout } = useAuth();
  const { reset } = useDisplay();
  const desktop = useIsDesktop();
  const [prefs, setPrefsState] = useState<Prefs | null>(null);
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [bookBytes, setBookBytes] = useState<Record<string, number>>({});
  const [audio, setAudio] = useState<SavedAudio[]>([]);
  const [quota, setQuota] = useState<number | null>(null);
  const [toast, showToast] = useToast();

  const loadDownloads = useCallback(() => {
    void listDownloads().then(setDownloads);
    void chapterBytesByBook().then(setBookBytes);
  }, []);

  useEffect(() => {
    setPrefsState(getPrefs());
    loadDownloads();
    void listSavedAudio().then(setAudio);
    void navigator.storage?.estimate?.().then((e) => setQuota(e.quota ?? null));
  }, [loadDownloads]);

  const update = (patch: Partial<Prefs>) => {
    setPrefsState(setPrefs(patch));
    if (patch.consent !== undefined) applyConsent(patch.consent === "granted");
  };

  if (!prefs) return null;

  const used =
    downloads.reduce((n, d) => n + (bookBytes[d.code] ?? 0), 0) + audio.reduce((n, a) => n + a.bytes, 0);

  const linkButton = "inline-flex min-h-11 items-center text-sm font-medium text-ink-soft transition-colors hover:text-ink";

  const sections = (
    <>
      <SettingsSection id="account" title="Account">
        <AccountCard onSaved={showToast} />
      </SettingsSection>

      <SettingsSection
        id="appearance"
        title="Appearance"
        action={
          <button type="button" onClick={reset} className={linkButton}>
            {desktop ? "Reset to defaults" : "Reset"}
          </button>
        }
      >
        <AppearanceCard desktop={desktop} />
      </SettingsSection>

      <SettingsSection id="reading" title="Reading">
        <ReadingCard
          desktop={desktop}
          value={prefs.readingMode ?? "scroll"}
          onChange={(m) => update({ readingMode: m })}
        />
      </SettingsSection>

      {/* Renders its own section, or nothing at all — this browser may have no
          push to offer, and a heading over an empty space explains nothing. */}
      <NotificationSetting desktop={desktop} />

      {/* The Assistant's "open downloads" lands here, on this id. */}
      <SettingsSection
        id="downloads"
        title="Downloads"
        action={!desktop && used > 0 ? <span className="text-sm text-ink-soft">{formatBytes(used)} used</span> : undefined}
      >
        <DownloadsCard
          desktop={desktop}
          books={downloads}
          bookBytes={bookBytes}
          audio={audio}
          quota={quota}
          onRemoveBook={(code) => void removeDownload(code).then(loadDownloads)}
          onRemoveAudio={(url) => void removeAudio(url).then(() => listSavedAudio().then(setAudio))}
          onRemoveAllAudio={() => void removeAllAudio().then(() => setAudio([]))}
        />
      </SettingsSection>

      <SettingsSection id="privacy" title="Privacy">
        <div className={`${CARD} ${desktop ? "px-7" : "px-5"} py-5`}>
          <SwitchRow
            title="Usage analytics"
            description={
              desktop ? "Anonymous usage statistics (Google Analytics)." : "Anonymous (Google Analytics)."
            }
            checked={prefs.consent === "granted"}
            onChange={(on) => update({ consent: on ? "granted" : "denied" })}
          />
        </div>
      </SettingsSection>

      <footer
        className={
          desktop
            ? "mt-10 flex items-center justify-between gap-4"
            : "mt-8 flex flex-col items-stretch gap-4 text-center"
        }
      >
        {!loading && user && (
          <button
            type="button"
            onClick={() => void logout()}
            className={
              desktop
                ? "inline-flex min-h-11 items-center gap-2 rounded-control border border-rule bg-card px-5 text-sm font-semibold text-accent-ink transition-colors hover:bg-inset"
                : `${CARD} min-h-14 text-title font-semibold text-accent-ink`
            }
          >
            {desktop && <SignOutIcon className="h-4.5 w-4.5" />}
            Sign out
          </button>
        )}
        <p className="text-xs text-ink-soft">MD Study · version {APP_VERSION}</p>
      </footer>
    </>
  );

  return (
    // Recessed canvas on a phone (design 3B): the darker warm ground makes the
    // white cards read as raised. At a desk the comps put them on the page.
    <AppAccent>
      <div className="min-h-full bg-canvas lg:bg-surface">
        {/* The section list needs 1280px: beside the app's own sidebar at
            1024 it left the cards 430px, and an inline name field narrower
            than the name. Between the two the cards are a desk's, unlisted. */}
        <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-5 sm:px-6 lg:px-10 lg:pt-10 xl:grid xl:max-w-6xl xl:grid-cols-[13rem_minmax(0,1fr)] xl:gap-14">
          <h1 className="mb-5 font-display text-2xl font-medium lg:mb-8 lg:text-3xl xl:col-span-2">Settings</h1>
          {desktop && <SectionNav />}
          <div className="min-w-0 xl:max-w-4xl">{sections}</div>
        </div>
      </div>
      {toast}
    </AppAccent>
  );
}

/**
 * The desktop's section list. It reads the sections off the page rather than
 * from a list of its own, because Notifications is not always there — and a
 * link to a section that is not drawn is a link to nowhere.
 *
 * The lit entry is the last section whose top has passed a line near the top
 * of the window, or the last one outright once the page can scroll no further
 * — the short sections at the foot would otherwise never get their turn. The
 * line is fixed rather than a share of the window: a guest's Account card is
 * one row tall, and a third of a tall window lit Appearance before anything
 * had scrolled.
 */
const SPY_LINE = 120;

function SectionNav() {
  const [items, setItems] = useState<{ id: string; title: string }[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const clickedAt = useRef(0);

  useEffect(() => {
    const read = () => {
      const found = Array.from(document.querySelectorAll<HTMLElement>("[data-settings-section]")).map((el) => ({
        id: el.id,
        title: el.dataset.settingsSection ?? el.id,
      }));
      setItems((prev) =>
        prev.length === found.length && prev.every((p, i) => p.id === found[i].id) ? prev : found
      );
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    const spy = () => {
      // A click scrolls smoothly past every section on the way; let it land
      // on the one that was asked for rather than flicker through the rest.
      if (Date.now() - clickedAt.current < 800) return;
      const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e);
      if (!els.length) return;
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      let current = els[0].id;
      for (const el of els) if (el.getBoundingClientRect().top <= SPY_LINE) current = el.id;
      setActive(atEnd ? els[els.length - 1].id : current);
    };
    spy();
    window.addEventListener("scroll", spy, { passive: true });
    window.addEventListener("resize", spy);
    return () => {
      window.removeEventListener("scroll", spy);
      window.removeEventListener("resize", spy);
    };
  }, [items]);

  return (
    <nav aria-label="Settings sections" className="sticky top-10 hidden self-start xl:block">
      <ul className="flex flex-col gap-1">
        {items.map((i) => {
          const on = i.id === active;
          return (
            <li key={i.id}>
              <a
                href={`#${i.id}`}
                aria-current={on ? "true" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  clickedAt.current = Date.now();
                  setActive(i.id);
                  document.getElementById(i.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  history.replaceState(null, "", `#${i.id}`);
                }}
                className={`flex min-h-11 items-center rounded-control px-4 text-sm transition-colors ${
                  on ? "bg-accent-tint font-semibold text-accent-ink" : "text-ink hover:bg-ink/5"
                }`}
              >
                {i.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
