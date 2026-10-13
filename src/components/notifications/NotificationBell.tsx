"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { BellIcon, CloseIcon } from "@/components/shell/icons";
import { NotificationList, UnreadBadge } from "./NotificationList";
import { useInbox } from "./useInbox";

/**
 * **The desktop bell** — in the sidebar's brand row, with the unread count on
 * it, opening the inbox in a panel over the page (designer's comp, 13 Oct
 * 2026). The phone reaches the same list through the account sheet instead:
 * its app bar has no room for a third control.
 *
 * Signed-in readers only (the designer's call, 13 Oct 2026), like the account
 * menu that is the phone's way in. Pushes that arrive signed out are still
 * kept, and are there after signing in.
 */
export function NotificationBell() {
  const { user } = useAuth();
  const { unread, markAllRead } = useInbox();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        title="Notifications"
        onClick={() => setOpen((o) => !o)}
        className={`relative flex h-10 w-10 items-center justify-center rounded-control text-ink-soft transition-colors hover:bg-ink/5 ${
          open ? "bg-ink/5 text-ink" : ""
        }`}
      >
        <BellIcon className="h-5 w-5" />
        <UnreadBadge count={unread} className="absolute -end-1.5 -top-1.5 ring-2 ring-card" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          /* Hangs from the bell, out over the page: the sidebar is 256px and
             a notification's sentence wants more than that. */
          className="absolute start-0 top-full z-50 mt-2 flex max-h-[min(36rem,calc(100dvh-6rem))] w-[26rem] flex-col rounded-hero border border-rule bg-card shadow-raised"
        >
          <div className="flex items-center gap-2 px-5 pb-3 pt-4">
            <h2 className="min-w-0 flex-1 text-lg font-semibold">Notifications</h2>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="min-h-9 px-1 text-sm font-semibold"
                style={{ color: "var(--ws-ink)" }}
              >
                Mark all read
              </button>
            )}
            <button
              type="button"
              aria-label="Close notifications"
              onClick={() => setOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-control text-ink-soft hover:bg-ink/5"
            >
              <CloseIcon className="h-4.5 w-4.5" />
            </button>
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-3 pb-3">
            <div className="px-2">
              <NotificationList dense onOpen={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
