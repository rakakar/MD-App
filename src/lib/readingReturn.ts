"use client";

import { useSyncExternalStore } from "react";

/**
 * **The way back to the page a word was met on** (17 Nov 2026).
 *
 * The reader's word sheet leads on to the word's own page and to the whole
 * A to Z, and from there nothing led back to the book: the glossary's back
 * goes to the glossary, and a walk through a few letters and words left the
 * browser's back several steps away. So leaving the sheet by either link
 * remembers the passage, and the glossary's pages offer "Back to reading"
 * until the reader is back in a book.
 *
 * Kept for this tab only (sessionStorage), and for half an hour — a pill
 * pointing at a book read yesterday would be a stranger, not a way back.
 */

const KEY = "md.reading.return";
const EVENT = "md:reading-return";
const TTL_MS = 30 * 60_000;

export interface ReadingReturn {
  /** the chapter, with the tapped paragraph as its anchor */
  href: string;
  /** the book's title, as the reader shows it */
  title: string;
}

export function setReadingReturn(r: ReadingReturn) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...r, at: Date.now() }));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // private mode or storage refused: there is simply no pill
  }
}

export function clearReadingReturn() {
  try {
    if (sessionStorage.getItem(KEY) === null) return;
    sessionStorage.removeItem(KEY);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* nothing to clear */
  }
}

/** The stored string while it is fresh — a string, so React can compare it. */
function snapshot(): string | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const at = (JSON.parse(raw) as { at?: number }).at ?? 0;
    return Date.now() - at > TTL_MS ? null : raw;
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

/** Where "Back to reading" goes, or null when there is nowhere to go back to. */
export function useReadingReturn(): ReadingReturn | null {
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as ReadingReturn;
    if (!r.href) return null;
    return { href: r.href, title: r.title };
  } catch {
    return null;
  }
}
