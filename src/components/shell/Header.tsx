"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { track } from "@/lib/analytics";
import { getEvents } from "@/lib/api";
import { eventStart, shortDate, upcomingEvents } from "@/lib/events";
import type { EventItem } from "@/lib/types";
import { WORKSPACES, WORKSPACE_ORDER } from "@/lib/workspaceConfig";
import { useWorkspace } from "./WorkspaceProvider";
import { CalendarChipIcon, ChevronDown, CloseIcon } from "./icons";

/** Workspace dropdown: popover on desktop, bottom-sheet on mobile (PRD §2). */
function WorkspaceSwitcher() {
  const { workspace, select } = useWorkspace();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const list = (
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
              className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-black/5 ${
                active ? "font-semibold" : ""
              }`}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: ws.color }}
                aria-hidden
              />
              <span>{ws.name}</span>
              <span className="hi text-ink-soft text-xs leading-none">{ws.nameHi}</span>
              {active && (
                <span className="ml-auto text-xs" style={{ color: ws.color }}>
                  ●
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-black/5"
        style={{ color: "var(--ws-color)" }}
      >
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: "var(--ws-color)" }}
          aria-hidden
        />
        {workspace.name}
        <ChevronDown className="h-4 w-4 opacity-60" />
      </button>

      {/* desktop popover */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 hidden w-64 overflow-hidden rounded-xl border border-rule bg-white shadow-lg sm:block">
          {list}
        </div>
      )}

      {/* mobile bottom sheet */}
      {open && (
        <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-label="Switch workspace">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl">
            <div className="flex items-center justify-between px-4 pt-4 pb-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Workspaces
              </p>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 hover:bg-black/5"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            {list}
          </div>
        </div>
      )}
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
    <header className="sticky top-0 z-40 border-b border-rule bg-surface/90 backdrop-blur lg:hidden">
      <div className="flex h-12 items-center justify-between gap-2 px-3">
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
