"use client";

import { useState, useSyncExternalStore } from "react";
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

export function FirstRunGate() {
  const stored = useSyncExternalStore(
    NEVER_CHANGES,
    READ,
    () => ({ deck: true, hint: true })
  );
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

  if (stored.hint || done.hint) return null;

  return (
    <SwitcherHint
      onDone={() => {
        setPrefs({ switcherHintShown: true });
        setDone((d) => ({ ...d, hint: true }));
      }}
    />
  );
}
