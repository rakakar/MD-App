"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { track } from "@/lib/analytics";
import { getEvents } from "@/lib/api";
import { eventStart, shortDate, upcomingEvents } from "@/lib/events";
import type { EventItem } from "@/lib/types";
import { WORKSPACES, WORKSPACE_ORDER, type WorkspaceId } from "@/lib/workspaceConfig";
import { useWorkspace } from "./WorkspaceProvider";
import {
  BrandMark,
  CalendarChipIcon,
  CheckIcon,
  ChevronDown,
  CloseIcon,
  SwitcherIcon,
  UserIcon,
  WorkspaceIcon,
} from "./icons";

/**
 * Workspace picker (PRD §2, design 10A). Two variants rather than one
 * component that swaps at a breakpoint: the header renders `sheet`, the
 * desktop sidebar renders `popover`.
 *
 * The trigger is the design's app-bar pill — a tinted tile, the name, a
 * chevron. The tile's tint is the only part that carries the workspace hue;
 * 10A holds terracotta on shared chrome and moves the hue through the
 * switcher, hero and selection state, and it cross-fades over 180ms rather
 * than cutting.
 *
 * The sheet is portalled to <body> on purpose. The header sets backdrop-blur,
 * and a backdrop-filter makes an element the containing block for its
 * fixed-position descendants — inline, the sheet's `fixed inset-0` resolved to
 * the 48px header instead of the viewport, so it opened as a sliver of itself.
 */
function WorkspaceSwitcher({ variant = "sheet" }: { variant?: "sheet" | "popover" }) {
  const { workspace, select } = useWorkspace();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    // The sheet closes on its own backdrop; a document-level listener would
    // fire on mousedown and unmount the row before its click could navigate.
    const onClick =
      variant === "popover"
        ? (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
          }
        : null;
    if (onClick) window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (onClick) window.removeEventListener("mousedown", onClick);
    };
  }, [open, variant]);

  // the page behind a sheet must not scroll with it
  useEffect(() => {
    if (!open || variant !== "sheet") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open, variant]);

  function choose(id: WorkspaceId) {
    select(id);
    setOpen(false);
  }

  /**
   * Sheet row (10A): the workspace's own glyph on a gradient tile, its name
   * with the Devanagari, and the one line on what is inside. Selection is
   * never colour-only — the check and the 2px ring carry it too — and the ring
   * is drawn as a border plus an inset shadow so selecting a row cannot shift
   * the rows below it by a pixel.
   */
  function sheetRow(id: WorkspaceId) {
    const ws = WORKSPACES[id];
    const active = ws.id === workspace.id;
    return (
      <li key={id}>
        <Link
          href={ws.home}
          role="radio"
          aria-checked={active}
          aria-label={`${ws.name} — ${ws.tagline}`}
          onClick={() => choose(id)}
          className="flex min-h-14 items-center gap-3 rounded-2xl border bg-white p-3 transition-colors active:bg-black/[0.03]"
          style={
            active
              ? {
                  borderColor: ws.color,
                  boxShadow: `inset 0 0 0 1px ${ws.color}`,
                  background: `color-mix(in srgb, ${ws.color} 7%, #fff)`,
                }
              : { borderColor: "var(--color-rule)" }
          }
        >
          <span
            aria-hidden
            className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-[11px] text-white"
            style={{
              background: `linear-gradient(150deg, color-mix(in srgb, ${ws.color} 78%, #fff), ${ws.color})`,
            }}
          >
            <WorkspaceIcon id={id} />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold leading-tight">{ws.name}</span>
            <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-soft">
              {ws.tagline}
            </span>
          </span>

          {active && (
            <span className="shrink-0" style={{ color: ws.color }} aria-hidden>
              <CheckIcon className="h-4.5 w-4.5" />
            </span>
          )}
        </Link>
      </li>
    );
  }

  /** Popover row (10A desktop): dot, name, check — the compact form. */
  function popoverRow(id: WorkspaceId) {
    const ws = WORKSPACES[id];
    const active = ws.id === workspace.id;
    return (
      <li key={id}>
        <Link
          href={ws.home}
          role="option"
          aria-selected={active}
          aria-label={`${ws.name} — ${ws.tagline}`}
          onClick={() => choose(id)}
          className={`flex items-center gap-2.5 rounded-[10px] px-2.5 py-2.5 text-[13px] transition-colors ${
            active ? "font-semibold" : "font-medium text-ink-soft hover:bg-canvas/60"
          }`}
          style={
            active
              ? { background: `color-mix(in srgb, ${ws.color} 8%, #fff)` }
              : undefined
          }
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: ws.color }}
            aria-hidden
          />
          <span className="flex-1 truncate">{ws.name}</span>
          {active && (
            <span style={{ color: ws.color }} aria-hidden>
              <CheckIcon className="h-3.5 w-3.5" />
            </span>
          )}
        </Link>
      </li>
    );
  }

  const sheet = (
    <div
      // portalled out of the header, so it needs the header's own breakpoint:
      // otherwise a resize to desktop leaves it open over the sidebar layout
      className="fixed inset-0 z-60 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ws-sheet-title"
    >
      <button
        type="button"
        aria-label="Close"
        className="ws-sheet-backdrop absolute inset-0 bg-black/40"
        onClick={() => setOpen(false)}
      />
      {/* five rows fit any phone held upright; in landscape they do not, and a
          row you cannot reach is a row you cannot choose */}
      <div className="ws-sheet absolute inset-x-0 bottom-0 max-h-[calc(100dvh-2.5rem)] overflow-y-auto overscroll-contain rounded-t-[26px] border-t border-rule bg-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-20px_44px_-20px_rgba(26,22,19,.4)]">
        <div className="mx-auto h-1 w-10 rounded-full bg-rule" aria-hidden />
        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <p id="ws-sheet-title" className="text-[17px] font-semibold tracking-[-0.01em]">
              Choose a workspace
            </p>
            <p className="mt-1 text-[13px] leading-snug text-ink-soft">
              Each workspace changes the home feed, colour and menu — the four tabs stay put.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="-mr-2 -mt-1 shrink-0 rounded-full p-2 text-ink-soft active:bg-black/5"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        <ul role="radiogroup" aria-label="Workspaces" className="mt-4 flex flex-col gap-2">
          {WORKSPACE_ORDER.map(sheetRow)}
        </ul>
      </div>
    </div>
  );

  // 10A pins the current workspace to the top of the desktop dropdown, with a
  // divider before the rest — on a menu you reopen all day, the row you last
  // chose should be where you last saw it.
  const rest = WORKSPACE_ORDER.filter((id) => id !== workspace.id);

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        aria-haspopup={variant === "sheet" ? "dialog" : "listbox"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex min-h-10 items-center gap-2 rounded-xl border bg-white pl-1.5 pr-2.5 text-left shadow-[0_1px_2px_rgba(26,22,19,.04)] transition-colors ${
          variant === "popover" ? "w-full" : "max-w-full"
        } ${open ? "" : "hover:bg-accent-tint"}`}
        style={
          open
            ? {
                borderColor: "var(--ws-color)",
                boxShadow: `0 0 0 3px color-mix(in srgb, var(--ws-color) 12%, transparent)`,
              }
            : { borderColor: "var(--color-rule)" }
        }
      >
        <span
          aria-hidden
          className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-[7px] transition-colors duration-[180ms]"
          style={{
            background: "color-mix(in srgb, var(--ws-color) 12%, #fff)",
            color: "var(--ws-ink)",
          }}
        >
          <SwitcherIcon className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-[-0.01em]">
          {workspace.name}
        </span>
        <ChevronDown
          className={`h-3 w-3 shrink-0 text-ink-soft/70 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && variant === "popover" && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-56 rounded-[14px] border border-rule bg-white p-1.5 shadow-[0_20px_44px_-16px_rgba(26,22,19,.35)]">
          <ul role="listbox" aria-label="Workspaces" className="flex flex-col gap-0.5">
            {popoverRow(workspace.id)}
            <li aria-hidden className="my-1 h-px bg-rule" />
            {rest.map(popoverRow)}
          </ul>
        </div>
      )}

      {open && variant === "sheet" && typeof document !== "undefined"
        ? createPortal(sheet, document.body)
        : null}
    </div>
  );
}

/**
 * Upcoming-event chip (PRD §2): next event's date, deep-links to the event.
 * Hidden when no upcoming events. Mitigates Connect being 2 taps away.
 */
function EventChip() {
  const [next, setNext] = useState<EventItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    getEvents()
      .then((events) => {
        if (!cancelled) setNext(upcomingEvents(events)[0] ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!next) return null;
  const date = eventStart(next);
  return (
    <Link
      href={`/connect/events/${next.id}`}
      onClick={() => track("header_event_chip_tap")}
      className="flex items-center gap-1.5 rounded-full border border-rule bg-white px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:border-ws-connect hover:text-ws-connect"
      aria-label={`Upcoming event${date ? ` on ${shortDate(date)}` : ""}`}
    >
      <CalendarChipIcon className="h-3.5 w-3.5" />
      {date ? shortDate(date) : "Event"}
    </Link>
  );
}

function AvatarMenu() {
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  if (loading) {
    return <div className="h-10 w-10 rounded-xl bg-black/5" aria-hidden />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-full px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: "var(--ws-color)" }}
      >
        Sign in
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative">
      {/* 10A draws this as a bordered white square with a person glyph, not a
          coloured initial: the app bar already carries the workspace hue on
          the switcher tile, and a second hue-filled circle next to it read as
          a second piece of chrome competing for the same meaning. */}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-rule bg-white text-ink-soft shadow-[0_1px_2px_rgba(26,22,19,.04)] transition-colors hover:bg-accent-tint"
      >
        <UserIcon className="h-4.5 w-4.5" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-rule bg-white py-1 shadow-lg"
        >
          <p className="truncate px-4 py-2 text-xs text-ink-soft">{user.email as string}</p>
          <Link
            role="menuitem"
            href="/me"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm hover:bg-black/5"
          >
            My Journey
          </Link>
          <Link
            role="menuitem"
            href="/me/settings"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm hover:bg-black/5"
          >
            Settings
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              void logout();
            }}
            className="block w-full px-4 py-2 text-left text-sm hover:bg-black/5"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const { workspace } = useWorkspace();

  return (
    // pt-safe: installed as a PWA the viewport is viewport-fit=cover, so
    // without it the bar sits under the status bar / notch.
    <header className="sticky top-0 z-40 border-b border-rule bg-surface/85 pt-[env(safe-area-inset-top)] backdrop-blur-lg lg:hidden">
      <div className="flex items-center gap-2.5 px-4 py-2">
        {/* the mark is a way home as well as identity — from four levels deep
            in a book list, the tab bar's Home is the only other route back */}
        <Link
          href={workspace.home}
          aria-label={`${workspace.name} home`}
          className="shrink-0 rounded-[10px] transition-opacity active:opacity-80"
        >
          <BrandMark className="h-8 w-8" />
        </Link>
        <WorkspaceSwitcher />
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <EventChip />
          <AvatarMenu />
        </div>
      </div>
    </header>
  );
}

export { AvatarMenu, EventChip, WorkspaceSwitcher };
