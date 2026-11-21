import { getPrefs, setPrefs } from "@/lib/storage";

/**
 * **One thing at a time on a first visit** (designer, 21 Nov 2026).
 *
 * A new reader used to meet, within fifteen seconds of the deck closing: the
 * analytics banner, the beta card and the notification card on Home, the
 * switcher coach mark, then the beta welcome. Each had been spaced on its own;
 * nothing spaced them against each other. Now:
 *
 * - Visit 1: launch and deck → the welcome sheet (the beta, and the analytics
 *   question, as one choice) → a clean Home → the switcher mark, in a pause.
 * - Visit 2 on: the beta card on Home.
 * - After the first chapter has been opened: the notification card.
 *
 * The order inside visit 1 is `FirstRunGate`'s; this file only says which
 * visit it is.
 */

const VISIT_KEY = "md.visit";

/**
 * Which visit this is, 1 for the first. Counted once per browser session:
 * the first call in a tab bumps the stored count and holds the result in
 * session storage, so every later call — any component, any page — agrees.
 *
 * A device that finished the deck before visits were counted (everyone who
 * had the app before 24 Nov) starts at 2: it is not a first visit, and
 * holding its cards back would hide the beta from the people already here.
 *
 * Storage blocked: 2, so nothing is held back for ever by an answer that can
 * never be written.
 */
export function visitNumber(): number {
  if (typeof window === "undefined") return 0;
  try {
    const held = sessionStorage.getItem(VISIT_KEY);
    if (held) return Number(held);
    const p = getPrefs();
    const before = p.visits || (p.onboardingSeen ? 1 : 0);
    const n = before + 1;
    setPrefs({ visits: n });
    sessionStorage.setItem(VISIT_KEY, String(n));
    return n;
  } catch {
    return 2;
  }
}

/** The reader has opened a chapter; see `chapterOpened` in lib/storage. */
export function markChapterOpened(): void {
  if (!getPrefs().chapterOpened) setPrefs({ chapterOpened: true });
}
