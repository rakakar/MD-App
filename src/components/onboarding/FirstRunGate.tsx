"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getPrefs, setPrefs } from "@/lib/storage";
import { FirstRun } from "./FirstRun";
import { SwitcherHint } from "./SwitcherHint";

/**
 * Whether the deck is owed, and nothing else.
 *
 * Split from `FirstRun` so the deck itself — six cards and a drag handler — is
 * never on the module graph of a reader who has already seen it. This is the
 * piece the shell mounts on every screen; it renders nothing at all in the
 * overwhelmingly common case.
 *
 * **`useSyncExternalStore`, not an effect.** `localStorage` does not exist on
 * the server, so reading it during render is a hydration mismatch by
 * construction — the server would say "not seen" for everyone and the client
 * would disagree for most. This hook is the one built for exactly that: the
 * server snapshot says nothing is owed, the client reads the real flag, and
 * React reconciles the two without a cascading render. The first paint is
 * therefore the app, with the deck a frame behind it, which is also the honest
 * order: the deck explains something that should already be there.
 *
 * `subscribe` is a no-op because nothing changes this flag underneath us. The
 * one write is our own, on the way out, and the local `dismissed` state
 * unmounts the deck in the same tick.
 */
const NEVER_CHANGES = () => () => {};

/**
 * One snapshot object, cached, because `useSyncExternalStore` compares
 * snapshots by identity: a getter returning a fresh `{}` every call is an
 * infinite render loop. Rebuilt only when a flag actually differs from the one
 * last handed out.
 */
let cached = { deck: false, hint: false };
function READ() {
  const p = getPrefs();
  if (p.onboardingSeen !== cached.deck || p.switcherHintShown !== cached.hint) {
    cached = { deck: p.onboardingSeen, hint: p.switcherHintShown };
  }
  return cached;
}

/**
 * How long the app has the reader to itself before the mark appears.
 *
 * Straight after Start reading, the mark landed on the same tap that closed
 * the deck: six cards of explanation, then a seventh thing to dismiss. It is
 * meant to *find* the reader once they are looking at the app, not to be the
 * last card wearing different clothes.
 */
const SETTLE_MS = 6000;

/**
 * ...and how long since they last touched anything.
 *
 * A delay alone only moves the interruption: six seconds in is the middle of a
 * scroll down the shelf, and a scrim arriving there is worse than one arriving
 * at hand-off, not better. The mark waits for a gap in what the reader is
 * doing, so it appears in a pause rather than across a gesture.
 */
const QUIET_MS = 1200;

/** Re-checked this often once the settle time is up and only quiet is owed. */
const POLL_MS = 400;

/**
 * True once the mark should show: the app has been in front of the reader long
 * enough, they are not mid-gesture, and the tab is actually on screen.
 *
 * The visibility check is not a nicety. Without it the whole delay elapses in
 * a background tab and the mark is already open, over nothing, when the reader
 * comes back — which is the one arrival where they definitely did not ask a
 * question.
 */
function useSettled(active: boolean): boolean {
  const [settled, setSettled] = useState(false);
  const lastTouch = useRef(0);

  useEffect(() => {
    if (!active) return;
    let since = Date.now();
    lastTouch.current = since;

    const touched = () => { lastTouch.current = Date.now(); };
    const events = ["pointerdown", "wheel", "keydown", "scroll", "touchstart"] as const;
    for (const e of events) {
      window.addEventListener(e, touched, { passive: true, capture: true });
    }

    // Coming back to a tab is an arrival of its own, so the clock starts
    // again. Without this the delay simply runs down in the background and the
    // mark opens a third of a second after the reader looks at the screen —
    // technically not "already open", and no less of an ambush.
    const returned = () => {
      if (document.visibilityState !== "visible") return;
      since = Date.now();
      lastTouch.current = since;
    };
    document.addEventListener("visibilitychange", returned);

    const timer = setInterval(() => {
      const now = Date.now();
      if (document.visibilityState !== "visible") return;
      if (now - since < SETTLE_MS) return;
      if (now - lastTouch.current < QUIET_MS) return;
      setSettled(true);
    }, POLL_MS);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", returned);
      for (const e of events) {
        window.removeEventListener(e, touched, { capture: true });
      }
    };
  }, [active]);

  return settled;
}

/**
 * The SSR guess, before any pref has been read: assume everything is already
 * seen, so the server (and the first client frame, before hydration) renders
 * nothing rather than flashing the deck at a returning reader. One object,
 * not a literal at the call site — `useSyncExternalStore` compares a
 * server snapshot by identity too, and a fresh `{}` every render is the same
 * infinite-loop warning `cached` above exists to avoid on the client side.
 */
const SERVER_SNAPSHOT = { deck: true, hint: true };

export function FirstRunGate() {
  const stored = useSyncExternalStore(NEVER_CHANGES, READ, () => SERVER_SNAPSHOT);
  /**
   * What this session has answered, over the top of what storage said.
   *
   * Two steps in order: the deck explains the app, then the mark points at the
   * one control the deck could not, because the control was not on screen
   * while the deck covered it. `hint` is deliberately not spent by skipping
   * the deck — a reader who skipped an explanation is the one who most needs
   * to be shown where the switcher is.
   */
  const [done, setDone] = useState({ deck: false, hint: false });
  const deckSeen = stored.deck || done.deck;
  const hintOwed = deckSeen && !stored.hint && !done.hint;
  // Counted from the moment the mark becomes owed — the tap that closed the
  // deck, or the frame a reader who left before it arrived comes back.
  const settled = useSettled(hintOwed);

  if (!deckSeen) {
    return (
      <FirstRun
        onDone={() => {
          // Written on the way out, whichever way out was taken. Skipping is
          // an answer; see the note on `onboardingSeen` in `lib/storage.ts`.
          setPrefs({ onboardingSeen: true });
          setDone((d) => ({ ...d, deck: true }));
        }}
      />
    );
  }

  if (!hintOwed || !settled) return null;

  return (
    <SwitcherHint
      onDone={() => {
        setPrefs({ switcherHintShown: true });
        setDone((d) => ({ ...d, hint: true }));
      }}
    />
  );
}
