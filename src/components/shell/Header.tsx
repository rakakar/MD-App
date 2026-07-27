"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { track } from "@/lib/analytics";
import { getEvents } from "@/lib/api";
import { eventStart, shortDate, upcomingEvents } from "@/lib/events";
import type { EventItem } from "@/lib/types";
import { WORKSPACES, WORKSPACE_ORDER } from "@/lib/workspaceConfig";
import { useWorkspace } from "./WorkspaceProvider";
import { CalendarChipIcon, CheckIcon, ChevronDown, CloseIcon } from "./icons";

/**
 * Workspace picker (PRD §2). Two variants rather than one component that
 * swaps at a breakpoint: the header renders `sheet`, the desktop sidebar
 * renders `popover`.
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

  function list(compact: boolean) {
    return (
      <ul role="listbox" aria-label="Workspaces" className="flex flex-col">
        {WORKSPACE_ORDER.map((id) => {
          const ws = WORKSPACES[id];
          const active = ws.id === workspace.id;
          return (
            <li key={id}>
              <Link
                href={ws.home}
                role="option"
                aria-selected={active}
                onClick={() => {
                  select(id);
                  setOpen(false);
                }}
                className={
                  compact
                    ? `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-black/5 ${
                        active ? "font-semibold" : ""
                      }`
                    : "flex min-h-14 items-center gap-3.5 px-5 py-2.5 transition-colors active:bg-black/5"
                }
                style={
                  !compact && active
                    ? { background: `color-mix(in srgb, ${ws.color} 8%, transparent)` }
                    : undefined
                }
              >
                <span
                  className={
                    compact
                      ? "h-2.5 w-2.5 shrink-0 rounded-full"
                      : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  }
                  style={
                    compact
                      ? { background: ws.color }
                      : { background: `color-mix(in srgb, ${ws.color} 15%, transparent)` }
                  }
                  aria-hidden
                >
                  {!compact && (
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: ws.color }}
                    />
                  )}
                </span>

                {compact ? (
                  // baseline row: .hi sets line-height 1.85, so centring the
                  // boxes leaves the Devanagari riding above the Latin text
                  <span className="flex flex-1 items-baseline gap-2">
                    <span>{ws.name}</span>
                    <span className="hi text-xs text-ink-soft" style={{ lineHeight: 1 }}>
                      {ws.nameHi}
                    </span>
                  </span>
                ) : (
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-[15px] leading-tight ${
                        active ? "font-semibold" : "font-medium"
                      }`}
                    >
                      {ws.name}
                    </span>
                    <span className="hi block text-xs leading-tight text-ink-soft">
                      {ws.nameHi}
                    </span>
                  </span>
                )}

                {active &&
                  (compact ? (
                    <span className="ml-auto text-xs" style={{ color: ws.color }}>
                      ●
                    </span>
                  ) : (
                    <span className="ml-auto shrink-0" style={{ color: ws.color }} aria-hidden>
                      <CheckIcon className="h-5 w-5" />
                    </span>
                  ))}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  const sheet = (
    <div
      // portalled out of the header, so it needs the header's own breakpoint:
      // otherwise a resize to desktop leaves it open over the sidebar layout
      className="fixed inset-0 z-60 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Switch workspace"
    >
      <button
        type="button"
        aria-label="Close"
        className="ws-sheet-backdrop absolute inset-0 bg-black/45"
        onClick={() => setOpen(false)}
      />
      <div className="ws-sheet absolute inset-x-0 bottom-0 rounded-t-3xl bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-black/15" aria-hidden />
        <div className="flex items-center justify-between px-5 pt-3 pb-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            Workspaces
          </p>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="-mr-2 rounded-full p-2 text-ink-soft active:bg-black/5"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        {list(false)}
      </div>
    </div>
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="-ml-1 flex min-h-10 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-black/5 active:bg-black/10"
        style={{ color: "var(--ws-color)" }}
      >
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: "var(--ws-color)" }}
          aria-hidden
        />
        {workspace.name}
        <ChevronDown
          className={`h-4 w-4 opacity-60 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && variant === "popover" && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-xl border border-rule bg-white shadow-lg">
          {list(true)}
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
    return <div className="h-8 w-8 rounded-full bg-black/5" aria-hidden />;
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

  const initial =
    (user.name as string)?.[0]?.toUpperCase() ??
    (user.email as string)?.[0]?.toUpperCase() ??
    "•";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
        style={{ background: "var(--ws-color)" }}
      >
        {initial}
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
  return (
    // pt-safe: installed as a PWA the viewport is viewport-fit=cover, so
    // without it the bar sits under the status bar / notch.
    <header className="sticky top-0 z-40 border-b border-rule bg-surface/90 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
      <div className="flex h-13 items-center justify-between gap-2 px-3">
        <WorkspaceSwitcher />
        <div className="flex items-center gap-2">
          <EventChip />
          <AvatarMenu />
        </div>
      </div>
    </header>
  );
}

export { AvatarMenu, EventChip, WorkspaceSwitcher };
