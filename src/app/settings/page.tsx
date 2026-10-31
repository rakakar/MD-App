"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { NotificationSetting } from "@/components/push/NotificationSetting";
import { AccountCard } from "@/components/settings/AccountCard";
import { AppearanceCard } from "@/components/settings/AppearanceCard";
import { PersonalDetailsSection } from "@/components/settings/PersonalDetailsCard";
import { ReadingCard } from "@/components/settings/ReadingCard";
import { CARD, SettingsSection, SwitchRow, useToast } from "@/components/settings/parts";
import { ChevronRight, DownloadIcon, SignOutIcon } from "@/components/shell/icons";
import { AppAccent } from "@/components/shell/WorkspaceProvider";
import { useDisplay } from "@/components/shell/DisplayProvider";
import { BackButton } from "@/components/ui/BackButton";
import { useIsDesktop } from "@/components/ui/Dialog";
import { applyConsent } from "@/lib/analytics";
import { formatBytes } from "@/lib/audioCache";
import { APP_VERSION } from "@/lib/feedback";
import { downloadsSummary, useDownloads } from "@/lib/useDownloads";
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
  const saved = useDownloads();
  const [toast, showToast] = useToast();
  /**
   * Opened from the Profile page ("Manage in Settings", or its Settings row):
   * a back button returns there. Read from the URL on the client rather than
   * through `useSearchParams`, which would need a Suspense boundary around a
   * page that is otherwise static. Opened from the account menu, Settings
   * stays as it was — a destination of its own, with no back.
   */
  const [fromProfile, setFromProfile] = useState(false);

  useEffect(() => {
    setPrefsState(getPrefs());
    setFromProfile(new URLSearchParams(window.location.search).get("from") === "profile");
  }, []);

  const update = (patch: Partial<Prefs>) => {
    setPrefsState(setPrefs(patch));
    if (patch.consent !== undefined) applyConsent(patch.consent === "granted");
  };

  if (!prefs) return null;

  const summary = downloadsSummary(saved);

  const linkButton = "inline-flex min-h-11 items-center text-sm font-medium text-ink-soft transition-colors hover:text-ink";

  const sections = (
    <>
      <SettingsSection id="account" title="Account">
        <AccountCard onSaved={showToast} />
      </SettingsSection>

      {/* Mobile, email, state and city — asked once on a new account, changed
          here after. Signed in only; renders its own section. */}
      <PersonalDetailsSection desktop={desktop} onSaved={showToast} />

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

      {/* Storage, as one row: the list itself lives on /downloads, which
          outgrew a card here. Kept so a reader looking for space in Settings,
          as on a phone, still finds it. */}
      <SettingsSection id="storage" title="Storage">
        <Link
          href="/downloads"
          className={`${CARD} flex min-h-16 items-center gap-4 ${desktop ? "px-7" : "px-5"} py-4 transition-colors hover:bg-inset`}
        >
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: "color-mix(in srgb, var(--ws-color) 12%, transparent)", color: "var(--ws-ink)" }}
          >
            <DownloadIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-title text-ink">Downloads</span>
            <span className="block text-sm text-ink-soft">
              {saved.used ? `${summary} · ${formatBytes(saved.used)}` : "Nothing saved on this device"}
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-ink-soft" />
        </Link>
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
          <div className="mb-5 flex items-center gap-2 lg:mb-8 xl:col-span-2">
            {fromProfile && <BackButton fallback="/profile" />}
            <h1 className="font-display text-2xl font-medium lg:text-3xl">Settings</h1>
          </div>
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
