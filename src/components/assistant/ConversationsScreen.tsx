"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BackIcon, PlusIcon } from "@/components/shell/icons";
import { AppAccent } from "@/components/shell/WorkspaceProvider";
import {
  ago,
  CONVERSATIONS_CHANGED,
  deleteConversation,
  kindOf,
  listConversations,
  type Conversation,
} from "@/lib/assistant/conversations";
import { INTENT_LABEL, INTENTS, type Intent } from "@/lib/assistant/intent";
import { contentLang } from "@/lib/script";
import { APP_ACCENT, WORKSPACES } from "@/lib/workspaceConfig";
import { IntentGlyph, SearchGlyph } from "./icons";
import { INTENT_COLOR } from "./parts";

const WEEK = 7 * 86400 * 1000;

/**
 * 10 · Saved conversations.
 *
 * Every conversation on this device, newest first, filterable by what it
 * started as. They are kept in this browser only (`lib/assistant/conversations`
 * says why) — the note at the foot says so, because a reader who signs in on
 * a second phone will otherwise wonder where they went.
 */
export function ConversationsScreen() {
  const [all, setAll] = useState<Conversation[] | null>(null);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<Intent | null>(null);
  /** read once — "2d" does not need to tick over while the list is open */
  const [now] = useState(() => Date.now());

  useEffect(() => {
    const load = () => setAll(listConversations());
    load();
    window.addEventListener(CONVERSATIONS_CHANGED, load);
    return () => window.removeEventListener(CONVERSATIONS_CHANGED, load);
  }, []);

  const counts = useMemo(() => {
    const c: Partial<Record<Intent, number>> = {};
    for (const x of all ?? []) c[kindOf(x)] = (c[kindOf(x)] ?? 0) + 1;
    return c;
  }, [all]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (all ?? []).filter((c) => {
      if (kind && kindOf(c) !== kind) return false;
      if (!needle) return true;
      return (
        c.title.toLowerCase().includes(needle) ||
        c.turns.some((t) => t.query.toLowerCase().includes(needle) || t.summary?.toLowerCase().includes(needle))
      );
    });
  }, [all, q, kind]);

  const thisWeek = shown.filter((c) => now - new Date(c.updatedAt).getTime() < WEEK);
  const earlier = shown.filter((c) => now - new Date(c.updatedAt).getTime() >= WEEK);

  return (
    <AppAccent>
      <div className="mx-auto w-full max-w-3xl px-4 pb-10 sm:px-6">
        <header className="-mx-4 flex items-center gap-3 border-b border-rule px-4 pb-4 pt-5 sm:-mx-6 sm:px-6">
          <Link
            href="/assistant"
            aria-label="Back to the Assistant"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control border border-rule bg-card"
          >
            <BackIcon className="h-5 w-5" />
          </Link>
          <h1 className="min-w-0 flex-1 font-display text-2xl font-medium leading-tight tracking-[-0.015em] lg:text-3xl">
            Conversations
          </h1>
          <Link
            href="/assistant"
            className="inline-flex min-h-12 items-center gap-1.5 rounded-control px-4 text-base font-semibold text-white"
            style={{ background: APP_ACCENT }}
          >
            <PlusIcon className="h-5 w-5" />
            New
          </Link>
        </header>

        {/* The search and the filters stay in reach while the list scrolls —
            narrowing is what a long history is used for. The page's own
            ground behind them, so cards slide under rather than through. */}
        {all !== null && all.length > 0 && (
          <div className="assistant-fade-in sticky top-0 z-20 -mx-4 border-b border-rule bg-surface px-4 pb-3 pt-5 sm:-mx-6 sm:px-6">
            <label className="flex min-h-14 items-center gap-3 rounded-card border border-rule bg-card px-4">
              <SearchGlyph className="h-5 w-5 shrink-0 text-ink-soft" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search conversations"
                aria-label="Search conversations"
                className="min-w-0 flex-1 bg-transparent py-3 text-base outline-none placeholder:text-ink-soft"
              />
            </label>

            <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              <FilterChip label="All" selected={kind === null} onClick={() => setKind(null)} />
              {INTENTS.filter((i) => counts[i]).map((i) => (
                <FilterChip
                  key={i}
                  label={INTENT_LABEL[i] === "Book search" ? "Books" : INTENT_LABEL[i]}
                  count={counts[i]}
                  intent={i}
                  selected={kind === i}
                  onClick={() => setKind(kind === i ? null : i)}
                />
              ))}
            </div>
          </div>
        )}

        {all !== null && all.length === 0 && (
          <div className="assistant-turn-in py-16 text-center">
            <p className="text-title font-semibold">No conversations yet</p>
            <p className="mt-2 text-sm text-ink-soft">
              Whatever you ask the Assistant is kept here, on this device.
            </p>
          </div>
        )}

        {all !== null && all.length > 0 && shown.length === 0 && (
          <p className="py-10 text-center text-sm text-ink-soft">Nothing matches “{q.trim()}”.</p>
        )}

        {thisWeek.length > 0 && <Group title="This week" items={thisWeek} now={now} from={0} />}
        {earlier.length > 0 && (
          <Group title="Earlier" items={earlier} now={now} from={thisWeek.length} />
        )}

        {all !== null && all.length > 0 && (
          <p className="mt-8 text-center text-xs text-ink-soft">
            Conversations are kept in this browser only.
          </p>
        )}
      </div>
    </AppAccent>
  );
}

function FilterChip({
  label,
  count,
  intent,
  selected,
  onClick,
}: {
  label: string;
  count?: number;
  intent?: Intent;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-base ${
        selected ? "border-transparent bg-ink font-semibold text-surface" : "border-rule bg-card text-ink"
      }`}
    >
      {intent && (
        <span style={selected ? undefined : { color: INTENT_COLOR[intent] }}>
          <IntentGlyph intent={intent} className="h-4 w-4" />
        </span>
      )}
      {label}
      {count !== undefined && <span className={selected ? "opacity-80" : "text-ink-soft"}>{count}</span>}
    </button>
  );
}

/**
 * The list settles in top to bottom, the same rise the conversation itself
 * uses, a beat apart per card. Capped at the eighth, so a long history is
 * all there within half a second; cards brought back by the search or a
 * filter get the same small entrance, since they are new to the screen.
 */
const STAGGER_MS = 45;
const STAGGER_CAP = 8;

function Group({
  title,
  items,
  now,
  from,
}: {
  title: string;
  items: Conversation[];
  now: number;
  /** how many cards came before this group, so the stagger runs on */
  from: number;
}) {
  return (
    <section className="mt-6">
      <h2 className="assistant-fade-in text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">{title}</h2>
      <ul className="mt-3 flex flex-col gap-3">
        {items.map((c, i) => (
          <Card key={c.id} c={c} now={now} delay={Math.min(from + i, STAGGER_CAP) * STAGGER_MS} />
        ))}
      </ul>
    </section>
  );
}

function Tag({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      className="inline-flex h-7 items-center rounded-md px-2 text-xs font-semibold"
      style={{
        background: `color-mix(in srgb, ${color} 14%, var(--color-card))`,
        color: `color-mix(in srgb, ${color} 80%, var(--color-ink))`,
      }}
    >
      {children}
    </span>
  );
}

function Card({ c, now, delay }: { c: Conversation; now: number; delay: number }) {
  const k = kindOf(c);
  const first = c.turns[0];
  const sources = c.turns.reduce((n, t) => n + (t.intent === "research" ? (t.count ?? 0) : 0), 0);
  const title = contentLang(c.title);
  const summary = first?.summary ?? "";
  const s = contentLang(summary);
  const phrase = first?.intent === "books" && /^\s*["“'‘]/.test(first.query);

  return (
    <li className="assistant-turn-in group relative" style={{ animationDelay: `${delay}ms` }}>
      <Link
        href={`/assistant?c=${c.id}`}
        className="block rounded-card border border-rule bg-card p-5 shadow-card"
      >
        <div className="flex items-baseline gap-3">
          <p
            lang={title.lang}
            className={`${title.lang === "hi" ? "hi-note" : ""} min-w-0 flex-1 text-title font-semibold leading-snug`}
          >
            {c.title}
          </p>
          <span className="shrink-0 text-sm text-ink-soft">{ago(c.updatedAt, now)}</span>
        </div>
        {summary && (
          <p
            lang={s.lang}
            className={`${s.lang === "hi" ? "hi-note" : ""} mt-1.5 line-clamp-2 text-base leading-relaxed text-ink-soft`}
          >
            {summary}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {sources > 0 && <Tag color={APP_ACCENT}>{sources} {sources === 1 ? "source" : "sources"}</Tag>}
          {c.savedToJourney && <Tag color={WORKSPACES.translations.color}>Saved to Journey</Tag>}
          {phrase && <Tag color={WORKSPACES.connect.color}>Phrase search</Tag>}
          {k === "paribhasha" && <Tag color={APP_ACCENT}>Paribhasha</Tag>}
          {c.turns.length > 1 && <Tag color="var(--color-ink-soft)">{c.turns.length} questions</Tag>}
        </div>
      </Link>
      <button
        type="button"
        onClick={() => {
          if (window.confirm(`Delete “${c.title}”? This can’t be undone.`)) deleteConversation(c.id);
        }}
        aria-label={`Delete “${c.title}”`}
        className="absolute bottom-3 right-3 inline-flex min-h-11 items-center rounded-control px-3 text-sm text-ink-soft opacity-100 hover:text-danger sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
      >
        Delete
      </button>
    </li>
  );
}
