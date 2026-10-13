"use client";

import Link from "next/link";
import { useState } from "react";
import { usePush } from "@/components/push/usePush";
import {
  BellIcon,
  BookmarkIcon,
  CalendarChipIcon,
  FeedbackIcon,
  PathIcon,
} from "@/components/shell/icons";
import { Chip, EmptyState } from "@/components/ui";
import { timeAgo } from "@/lib/dates";
import type { InboxItem, InboxKind } from "@/lib/inbox";
import { contentLang } from "@/lib/script";
import { useInbox } from "./useInbox";

/**
 * The inbox as a list — the same on the phone's Notifications screen and in
 * the desktop bell's panel (designer's comps, 13 Oct 2026).
 *
 * Unread rows sit on a tint with a dot at the end; reading one — opening it,
 * or "Mark all read" — takes both away. Opening the list does not: a reader
 * who looks and closes it has not read anything.
 */

/** Each kind's tile, from the content-kind family so no new hue is invented. */
const KIND: Record<InboxKind, { Icon: (p: { className?: string }) => React.ReactElement; tile: string; ink: string }> = {
  // Not the audio tile: it is the accent tint, which is what an unread row
  // sits on, and the tile vanished into its own row.
  stage: { Icon: PathIcon, tile: "var(--color-kind-folder)", ink: "var(--color-kind-folder-ink)" },
  feedback: { Icon: FeedbackIcon, tile: "var(--color-kind-doc)", ink: "var(--color-kind-doc-ink)" },
  event: { Icon: CalendarChipIcon, tile: "var(--color-kind-video)", ink: "var(--color-kind-video-ink)" },
  highlight: { Icon: BookmarkIcon, tile: "var(--color-inset)", ink: "var(--color-ink-soft)" },
  general: { Icon: BellIcon, tile: "var(--color-inset)", ink: "var(--color-ink-soft)" },
};

/** An app path for a link to this app, or `null` for somewhere else. */
function appPath(url: string): string | null {
  if (url.startsWith("/")) return url;
  try {
    const u = new URL(url);
    if (typeof window !== "undefined" && u.origin === window.location.origin) {
      return `${u.pathname}${u.search}${u.hash}`;
    }
  } catch {
    /* not a URL */
  }
  return null;
}

export function NotificationList({
  onOpen,
  dense = false,
}: {
  /** after a row is opened — the panel closes itself */
  onOpen?: () => void;
  /** the desktop panel: a little tighter */
  dense?: boolean;
}) {
  const { items, markRead } = useInbox();
  const { status } = usePush();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const shown = items?.filter((i) => filter === "all" || !i.read) ?? null;

  return (
    <div>
      <div className="flex gap-2">
        <Chip variant="tint" label="All" selected={filter === "all"} onClick={() => setFilter("all")} />
        <Chip variant="tint" label="Unread" selected={filter === "unread"} onClick={() => setFilter("unread")} />
      </div>

      <div className="mt-3">
        {shown === null ? null : shown.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {shown.map((item) => (
              <li key={item.id}>
                <Row item={item} dense={dense} onOpen={() => {
                    markRead(item.id);
                    onOpen?.();
                  }} />
              </li>
            ))}
          </ul>
        ) : filter === "unread" && items && items.length > 0 ? (
          <EmptyState title="You're all caught up" hint="Nothing unread." />
        ) : (
          <EmptyState
            title="No notifications yet"
            hint={
              status === "granted" ? (
                "Announcements, new study material and shivir reminders will appear here."
              ) : status === "default" || status === "denied" ? (
                <>
                  <Link href="/settings" onClick={onOpen} className="font-semibold underline underline-offset-2">
                    Turn on notifications
                  </Link>{" "}
                  in Settings to receive them here.
                </>
              ) : (
                "Announcements and reminders will appear here."
              )
            }
          />
        )}
      </div>
    </div>
  );
}

function Row({ item, dense, onOpen }: { item: InboxItem; dense: boolean; onOpen: () => void }) {
  const k = KIND[item.kind] ?? KIND.general;
  const title = contentLang(item.title);
  const body = contentLang(item.body);
  const path = appPath(item.clickUrl);
  const cls = `flex w-full items-start gap-3 rounded-card ${dense ? "p-3" : "p-3.5"} text-start transition-colors ${
    item.read ? "hover:bg-ink/[.03]" : "bg-accent-tint hover:bg-accent-tint/70"
  }`;
  const inner = (
    <>
      <span
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-tile"
        style={{ background: k.tile, color: k.ink }}
      >
        <k.Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span {...title} className={`${title.className} block text-base font-semibold text-ink`}>
          {item.title}
        </span>
        {item.body && (
          <span {...body} className={`${body.className} mt-0.5 block text-sm text-ink-soft`}>
            {item.body}
          </span>
        )}
        <span className="mt-1 block text-xs text-ink-soft/80">{timeAgo(item.receivedAt)}</span>
      </span>
      {!item.read && (
        <span aria-label="Unread" className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-danger" />
      )}
    </>
  );
  return path ? (
    <Link href={path} onClick={onOpen} className={cls}>
      {inner}
    </Link>
  ) : (
    <a href={item.clickUrl} onClick={onOpen} className={cls} target="_blank" rel="noreferrer">
      {inner}
    </a>
  );
}

/**
 * The count on the bell and the Notifications row: a pill in the danger red,
 * the one colour in the app that means "this wants you". Nothing at zero.
 */
export function UnreadBadge({ count, className = "" }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-xs font-semibold tabular-nums text-surface ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/** The dot on an avatar or a bell when there is something unread. */
export function UnreadDot({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`absolute block h-3 w-3 rounded-full bg-danger ring-2 ring-card ${className}`}
    />
  );
}
