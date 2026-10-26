"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRoutePath } from "@/components/shell/useRoutePath";
import { clearStageAsk, stageAsked } from "@/lib/profile";
import { getPrefs, setPrefs } from "@/lib/storage";
import { StagePicker } from "./StagePicker";

/** Fired by FirstRunGate when the six-card deck closes. */
export const FIRST_RUN_DONE = "md:first-run-done";

/**
 * **Step 2 of 2 after signing in** — the journey question, over whatever
 * screen the reader was headed to (designer's comps, 26 Oct 2026).
 *
 * Owed only once the profile step has been answered in this tab
 * (`askForStage`) and only while no stage has been declared. Cancel is
 * allowed here, unlike on My Journey's first run: there is a page behind it
 * to go back to, and My Journey still asks on its own.
 *
 * Waits for the first-run deck, which can be owed at the same moment on a
 * fresh device — two layers asking for attention at once is one too many.
 * Not on My Journey, which draws its own picker, nor on the screens that
 * keep app chrome off (`bare` in AppShell).
 */
export function StagePrompt({ suppressed }: { suppressed: boolean }) {
  const { user } = useAuth();
  const path = useRoutePath();
  const [owed, setOwed] = useState(false);
  const [deckSeen, setDeckSeen] = useState(false);

  // Re-read on every navigation: the profile step sets the flag and then
  // moves to the next page in the same tab.
  useEffect(() => {
    setOwed(stageAsked() && getPrefs().journeyStage == null);
    setDeckSeen(getPrefs().onboardingSeen);
  }, [path]);

  useEffect(() => {
    const onDeckDone = () => setDeckSeen(true);
    window.addEventListener(FIRST_RUN_DONE, onDeckDone);
    return () => window.removeEventListener(FIRST_RUN_DONE, onDeckDone);
  }, []);

  if (!user || !owed || !deckSeen || suppressed || path === "/me") return null;

  const close = () => {
    clearStageAsk();
    setOwed(false);
  };

  return (
    <StagePicker
      onDone={(stage, answer) => {
        setPrefs({ journeyStage: stage, journeyAnswer: answer });
        close();
      }}
      onCancel={close}
    />
  );
}
