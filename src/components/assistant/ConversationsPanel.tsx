"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { CloseIcon, PlusIcon } from "@/components/shell/icons";
import {
  CONVERSATIONS_CHANGED,
  deleteConversation,
  kindOf,
  listConversations,
  type Conversation,
} from "@/lib/assistant/conversations";
import { INTENT_LABEL, INTENTS, type Intent } from "@/lib/assistant/intent";
import { dayMonth } from "@/lib/dates";
import { signInHref } from "@/lib/routes";
import { contentLang } from "@/lib/script";
import { IntentGlyph, PanelLeftGlyph, SearchGlyph } from "./icons";
import { INTENT_COLOR } from "./parts";

/**
 * The conversations, beside the chat on desktop (desktop revision, 30 Sep
 * 2026). On a phone they are their own screen (`ConversationsScreen`), reached
 * from the header; at this width there is room to keep them in view, so
 * moving between two threads is one click rather than a trip to a list.
 *
 * Kept in this browser, signed in or not — nothing syncs them yet — so a
 * signed-out reader sees their own list like anyone else, with a note at the
 * foot saying where it lives.
 */
export function ConversationsPanel({
  open,
  animate,
  current,
  onNew,
  onCollapse,
}: {
  open: boolean;
  /** off for the first paint, so a panel remembered as hidden does not visibly close on load */
  animate: boolean;
  /** the conversation on screen, lit in the list */
  current: string | null;
  onNew: () => void;
  onCollapse: () => void;
}) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [all, setAll] = useState<Conversation[] | null>(null);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<Intent | null>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    const load = () => setAll(listConversations());
    load();
    window.addEventListener(CONVERSATIONS_CHANGED, load);
    return () => window.removeEventListener(CONVERSATIONS_CHANGED, load);
  }, []);

  // Only the kinds this reader has actually asked, as the phone's
  // Conversations screen does — a chip for Navigate on a list with no
  // navigation in it is a filter that can only ever show "Nothing matches".
  const counts = useMemo(() => {
    const c: Partial<Record<Intent, number>> = {};
    for (const x of all ?? []) c[kindOf(x)] = (c[kindOf(x)] ?? 0) + 1;
    return c;
  }, [all]);
  // A kind whose last conversation was deleted has no chip to turn it off.
  const active = kind && counts[kind] ? kind : null;

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (all ?? []).filter((c) => {
      if (active && kindOf(c) !== active) return false;
      if (!needle) return true;
      return (
        c.title.toLowerCase().includes(needle) ||
        c.turns.some((t) => t.query.toLowerCase().includes(needle))
      );
    });
  }, [all, q, active]);

  const empty = all !== null && all.length === 0;

  return (
    /* Opens and closes by its width, not by being mounted: the column slides
       while the chat beside it widens into the room, rather than the page
       jumping by 280px. The contents keep their own fixed width inside the
       clip, so the list never reflows mid-slide — it is uncovered, not
       squeezed. Hidden, it is `inert`, so nothing in it takes focus. */
    <aside
      aria-label="Conversations"
      aria-hidden={!open || undefined}
      inert={!open || undefined}
      className={`hidden shrink-0 overflow-hidden lg:block ${
        animate ? "transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none" : ""
      }`}
      style={{ width: open ? "17.5rem" : 0 }}
    >
    <div
      className={`flex h-full w-[17.5rem] flex-col border-r border-rule bg-inset transition-opacity duration-200 ${
        open ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex shrink-0 items-center gap-2 px-4 pb-3 pt-4">
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">Conversations</h2>
        <button
          type="button"
          onClick={onNew}
          aria-label="New chat"
          title="New chat"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-rule bg-card"
        >
          <PlusIcon className="h-4.5 w-4.5" />
        </button>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Hide conversations"
          title="Hide conversations"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-rule bg-card"
        >
          <PanelLeftGlyph className="h-4.5 w-4.5" />
        </button>
      </div>

      {empty && (
        <div className="px-4">
          <p className="text-sm leading-relaxed text-ink-soft">
            What you ask is kept here, in this browser.
            {!loading && !user && " Sign in to keep your bookmarks, notes and reading place on every device."}
          </p>
          {!loading && !user && <SignIn href={signInHref(pathname)} />}
        </div>
      )}

      {all !== null && all.length > 0 && (
        <>
          <div className="shrink-0 px-4">
            <label className="flex min-h-11 items-center gap-2.5 rounded-control border border-rule bg-card px-3">
              <SearchGlyph className="h-4 w-4 shrink-0 text-ink-soft" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search conversations"
                aria-label="Search conversations"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-soft"
              />
            </label>
            <div role="group" aria-label="Show" className="mt-3 flex flex-wrap gap-1.5">
              <Filter label="All" on={active === null} onClick={() => setKind(null)} />
              {INTENTS.filter((i) => counts[i]).map((i) => (
                <Filter
                  key={i}
                  label={INTENT_LABEL[i]}
                  on={active === i}
                  onClick={() => setKind(active === i ? null : i)}
                />
              ))}
            </div>
          </div>

          <ul className="mt-3 min-h-0 flex-1 overflow-y-auto px-2 pb-3">
            {shown.length === 0 && (
              <li className="px-2 py-4 text-sm text-ink-soft">Nothing matches.</li>
            )}
            {shown.map((c) => (
              <Row key={c.id} c={c} on={c.id === current} now={now} />
            ))}
          </ul>

          <div className="shrink-0 border-t border-rule px-4 py-3">
            <p className="text-xs leading-relaxed text-ink-soft">
              Kept in this browser only.
              {!loading && !user && " Sign in to keep your bookmarks, notes and reading place on every device."}
            </p>
            {!loading && !user && <SignIn href={signInHref(pathname)} />}
          </div>
        </>
      )}
    </div>
    </aside>
  );
}

function SignIn({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="mt-3 inline-flex min-h-11 items-center rounded-control border border-rule bg-card px-3.5 text-sm font-semibold"
    >
      Sign in
    </Link>
  );
}

function Filter({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-semibold ${
        on ? "border-transparent bg-ink text-surface" : "border-rule bg-card text-ink"
      }`}
    >
      {label}
    </button>
  );
}

function Row({ c, on, now }: { c: Conversation; on: boolean; now: number }) {
  const k = kindOf(c);
  const t = contentLang(c.title);
  return (
    <li className="group relative">
      <Link
        href={`/assistant?c=${c.id}`}
        aria-current={on ? "page" : undefined}
        className={`flex gap-2.5 rounded-control px-2.5 py-2.5 pe-9 transition-colors ${
          on ? "bg-rule/60" : "hover:bg-card/70"
        }`}
      >
        <span className="mt-0.5 shrink-0" style={{ color: INTENT_COLOR[k] }}>
          <IntentGlyph intent={k} className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span
            lang={t.lang}
            className={`${t.lang === "hi" ? "hi-note" : ""} block truncate text-sm ${on ? "font-semibold" : "font-medium"}`}
          >
            {c.title}
          </span>
          <span className="mt-0.5 block text-xs text-ink-soft">
            {INTENT_LABEL[k]} · {day(c.updatedAt, now)}
          </span>
        </span>
      </Link>
      <button
        type="button"
        onClick={() => {
          if (window.confirm(`Delete “${c.title}”? This can’t be undone.`)) deleteConversation(c.id);
        }}
        aria-label={`Delete “${c.title}”`}
        className="absolute right-1 top-1/2 flex h-9 w-8 -translate-y-1/2 items-center justify-center rounded-control text-ink-soft opacity-0 hover:text-danger focus:opacity-100 group-hover:opacity-100"
      >
        <CloseIcon className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

/** "Today", "Yesterday", "Mon", then "12 Sep". */
function day(iso: string, now: number): string {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(new Date(now)) - start(d)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
  return dayMonth(d);
}
