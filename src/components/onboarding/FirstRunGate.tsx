"use client";

import { useState, useSyncExternalStore } from "react";
import { getPrefs, setPrefs } from "@/lib/storage";
import { FirstRun } from "./FirstRun";

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

export function FirstRunGate() {
  const seen = useSyncExternalStore(
    NEVER_CHANGES,
    () => getPrefs().onboardingSeen,
    () => true
  );
  const [dismissed, setDismissed] = useState(false);

  if (seen || dismissed) return null;

  return (
    <FirstRun
      onDone={() => {
        // Written on the way out, whichever way out was taken. Skipping is an
        // answer; see the note on `onboardingSeen` in `lib/storage.ts`.
        setPrefs({ onboardingSeen: true });
        setDismissed(true);
      }}
    />
  );
}
