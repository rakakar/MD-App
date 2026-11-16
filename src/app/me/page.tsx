"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ContinueAv } from "@/components/library/ContinueAv";
import { ContinueReading } from "@/components/home/ContinueReading";
import { NextOnPath, NextStepCard, PathCard } from "@/components/journey/Dashboard";
import { PathOverview } from "@/components/journey/PathOverview";
import { StagePicker } from "@/components/journey/StagePicker";
import { ArrowRightIcon } from "@/components/shell/icons";
import { EmptyState, PageContainer } from "@/components/ui";
import { getBooks } from "@/lib/api";
import { stageById } from "@/lib/journey";
import { localProgress, syncPersonal } from "@/lib/personal";
import { getPrefs, setPrefs, type LocalProgress } from "@/lib/storage";
import type { BookSummary } from "@/lib/types";

const NO_SOURCES: never[] = [];

/**
 * **A guest's quiet strip** (UX audit FR5, 16 Nov 2026).
 *
 * My Journey used to be the one workspace behind sign-in: a stranger got a
 * "Sign in to begin" page with the four levels under it. But everything on the
 * dashboard — stage, Continue shelves, next step — is read from this device's
 * own storage, so the gate was asking for an account to show a reader what
 * their own phone already held. Now a guest sees the dashboard, and signing in
 * is for syncing, not for seeing. The wording is the one Highlights & Notes
 * already uses for the same state.
 */
function GuestStrip() {
  return (
    <p className="mt-1 text-sm text-ink-soft">
      Saved on this device.{" "}
      <Link
        href="/login?next=/me"
        className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
        style={{ color: "var(--ws-ink)" }}
      >
        Sign in to sync
      </Link>
      .
    </p>
  );
}

/**
 * **My Journey — the dashboard** (19A screens 1 and 2).
 *
 * Open to a guest as well, with a strip saying it is kept on this device.
 *
 * Two screens behind one address, and which one shows turns on a single
 * question: has the reader said where they are? Until they have, it is the
 * stage picker over the four levels, with nothing to dismiss — a journey
 * screen with no stage in it would be a page of empty furniture. After, it is
 * the path card, one next step, the two histories and the stage that comes
 * next (desktop revision 19 Oct 2026).
 *
 * The stage is read on the client rather than the server because it lives in
 * local prefs (see `Prefs.journeyStage`): it must work for a reader who has
 * never signed in, which is most of this audience.
 */
export default function MyJourneyPage() {
  const { user, loading } = useAuth();
  const [stageId, setStageId] = useState<number | null | undefined>(undefined);
  /** the picker reopened from the card, rather than shown because nothing
   *  has been declared yet */
  const [changing, setChanging] = useState(false);
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [progress, setProgress] = useState<LocalProgress[]>([]);

  // `undefined` until prefs have been read — distinct from `null`, which is a
  // reader who has been asked and has no stage yet. Rendering the onboarding
  // during that gap would flash it at everyone on every visit.
  useEffect(() => {
    setStageId(getPrefs().journeyStage);
  }, []);

  const load = useCallback(async () => {
    setProgress(localProgress());
    setBooks(await getBooks().catch(() => []));
  }, []);

  useEffect(() => {
    if (loading) return;
    void load();
    if (user) void syncPersonal().then(load);
  }, [user, loading, load]);

  // Nothing until both answers are in: `undefined` is "prefs not read yet" and
  // `loading` is "auth not resolved yet". Rendering through either would flash
  // the guest strip at a signed-in reader.
  if (loading || stageId === undefined) return null;

  const stage = stageById(stageId);

  const declare = (next: number, answer: string) => {
    setPrefs({ journeyStage: next, journeyAnswer: answer });
    setStageId(next);
    setChanging(false);
  };

  // Not yet asked: the picker over the four levels, with no way to dismiss
  // it — without an answer there is no dashboard to go back to.
  if (!stage) {
    return (
      <PageContainer size="shelf">
        <h1 className="font-display text-2xl font-medium leading-tight tracking-[-0.015em] lg:text-4xl">
          My Journey
        </h1>
        {!user && <GuestStrip />}
        <PathOverview />
        <StagePicker onDone={declare} />
      </PageContainer>
    );
  }

  return (
    <PageContainer size="shelf">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-medium leading-tight tracking-[-0.015em] lg:text-4xl">
          My Journey
        </h1>
        {/* In the head on a desktop; a phone has it at the foot of the path
            card, where the thumb is. */}
        <button
          type="button"
          onClick={() => setChanging(true)}
          className="hidden min-h-11 items-center rounded-control border border-rule bg-card px-4 text-sm font-semibold transition-colors hover:bg-ink/[0.03] sm:inline-flex"
        >
          Change my stage
        </button>
      </div>

      {!user && <GuestStrip />}

      <div className="mt-5 sm:mt-6">
        <PathCard stage={stage} onChangeStage={() => setChanging(true)} />
      </div>

      {/* Two columns from lg: the reader's own (next step, then the two
          histories) beside what comes after. On a phone the aside simply
          follows, last. */}
      <div className="mt-8 grid gap-8 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <div className="min-w-0">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
            Your next step
          </h2>
          <NextStepCard stage={stage} books={books} progress={progress} />

          {/* Both histories, whichever shelf they came from — this workspace is
              about the reader rather than about a shelf. Each draws nothing at
              all when there is nothing to show. */}
          <ContinueReading
            workspace="all"
            heading="Reading"
            tier="eyebrow"
            limit={2}
            layout="pair"
            showWhen
            className="mt-8"
          />
          <ContinueAv
            sources={NO_SOURCES}
            limit={3}
            heading="Listening & watching"
            note="Audio and video"
            variant="list"
          />
          {/* The rails are the latest few; the trail is on its own page
              (UX audit ST9). */}
          {progress.length > 0 && (
            <Link
              href="/me/history"
              className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold"
              style={{ color: "var(--ws-ink)" }}
            >
              See all history
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          )}

          {progress.length === 0 && (
            <div className="mt-8">
              <EmptyState
                title="Nothing in progress yet"
                hint="Open any book and your place is saved automatically — it will show up here."
              />
            </div>
          )}
        </div>

        <aside className="min-w-0">
          <NextOnPath stage={stage} />
        </aside>
      </div>

      {changing && (
        <StagePicker onDone={declare} onCancel={() => setChanging(false)} />
      )}
    </PageContainer>
  );
}
