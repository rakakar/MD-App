// Assistant conversations — kept on this device.
//
// There is no conversations endpoint. The chat API keeps each *answer*
// (`chat/history/`), but a conversation here is also dictionary look-ups,
// passage searches and trips around the app, none of which the BE records. So
// the thread lives in localStorage, and a Research turn stores the answer it
// got: reopening a conversation must never spend a second question from the
// reader's daily allowance to show them something they already have.
//
// "Save to Journey" is a flag on the conversation for the same reason — My
// Journey has no model for it yet. It is honest on this device and is the
// first thing to move to the server when one exists.

import type { ChatAnswer } from "@/lib/types";
import type { Intent } from "./intent";

const KEY = "md.assistant.v1";
/** enough to be a history, not so many that the list is a haystack */
const MAX_CONVERSATIONS = 100;
export const CONVERSATIONS_CHANGED = "md:assistant-conversations";

export interface Turn {
  id: string;
  intent: Intent;
  query: string;
  at: string;
  /** Book search only — the composer was on EN: search exactly as typed */
  asTyped?: boolean;
  /** Book search only — asked with the chip chosen: the whole line is a phrase */
  exact?: boolean;
  /** Book search and Research — the books it was limited to; absent means all of them */
  books?: string[];
  /** Research only — the fuller answer, asked for with "Go deeper" */
  deep?: boolean;
  /** Research only — the id of the turn this one answers again, deeper */
  deepens?: string;
  /** Research only — asked by voice: answered to be read aloud */
  spoken?: boolean;
  /** Research only — the answer as it arrived, so reopening is free */
  answer?: ChatAnswer;
  /** one line for the conversation list, written when the turn settles */
  summary?: string;
  /** passages found, entries matched — whatever the turn counts */
  count?: number;
}

export interface Conversation {
  id: string;
  title: string;
  turns: Turn[];
  savedToJourney: boolean;
  createdAt: string;
  updatedAt: string;
}

function read(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Conversation[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(list: Conversation[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_CONVERSATIONS)));
    window.dispatchEvent(new Event(CONVERSATIONS_CHANGED));
  } catch {
    // Private mode or a full disk: the conversation still works on screen,
    // it just will not be there next time.
  }
}

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** Newest first. */
export function listConversations(): Conversation[] {
  return read().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getConversation(id: string): Conversation | null {
  return read().find((c) => c.id === id) ?? null;
}

export function putConversation(c: Conversation): void {
  const rest = read().filter((x) => x.id !== c.id);
  write([c, ...rest]);
}

export function deleteConversation(id: string): void {
  write(read().filter((c) => c.id !== id));
}

export function titleFor(query: string): string {
  const t = query.trim().replace(/\s+/g, " ");
  return t.length > 60 ? `${t.slice(0, 57)}…` : t;
}

/** "2d", "1w" — the list's right-hand column. */
export function ago(iso: string, now = Date.now()): string {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d`;
  return `${Math.floor(s / (86400 * 7))}w`;
}

/** The intent a conversation is filed under — its first question's. */
export function kindOf(c: Conversation): Intent {
  return c.turns[0]?.intent ?? "books";
}
