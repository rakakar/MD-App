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
import { EmptyState, PageContainer, ctaPrimary } from "@/components/ui";
import { getBooks } from "@/lib/api";
import { stageById } from "@/lib/journey";
import { localProgress, syncPersonal } from "@/lib/personal";
import { getPrefs, setPrefs, type LocalProgress } from "@/lib/storage";
import type { BookSummary } from "@/lib/types";

/**
 * **My Journey is the one workspace behind sign-in.**
 *
 * Every other shelf is the corpus — open to anyone, and deliberately readable
 * without an account. This one is not a shelf: it is the reader themselves,
 * where they say they are on the path and everything they have marked.
 *
 * **The gate shows the path, not a picture** (desktop revision 19 Oct 2026).
 * It was an illustration over a button, which told a stranger this workspace
 * exists and nothing about what is in it. Now the four levels sit under the
 * one action — the honest preview of what signing in is for — and the full
 * path stays open from here without an account, as everything else does.
 */
function SignInGate() {
  return (
    <>
      <h1 className="font-display text-2xl font-medium leading-tight tracking-[-0.015em] lg:text-4xl">
        Start your journey
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg">
        Where you are on the path, what you are reading and listening to, and
        everything you have marked — kept together and synced to your account.
      </p>

      {/* The reassurance beside the action it qualifies rather than under a
          rule — the two belong together. It wraps under the button on a
          phone. */}
      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <Link
          href="/login?next=/me"
          className={`${ctaPrimary} min-h-12 w-full sm:w-auto sm:px-6 sm:text-base`}
          style={{ background: "var(--ws-color)" }}
        >
          Sign In to begin
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
        <p className="text-sm text-ink-soft">
          Every book, recording and folder stays open without an account.
        </p>
      </div>

      <PathOverview />
    </>
  );
}

/**
 * **My Journey — the dashboard** (19A screens 1 and 2).
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
  // the gate at a signed-in reader, or the dashboard at a stranger.
  if (loading || stageId === undefined) return null;

  if (!user) {
    return (
      <PageContainer size="shelf">
        <SignInGate />
      </PageContainer>
    );
  }

  const stage = stageById(stageId);

  const declare = (next: number) => {
    setPrefs({ journeyStage: next });
    setStageId(next);
    setChanging(false);
  };

  // Not yet asked: the picker over the four levels, with no way to dismiss
  // it — without an answer there is no dashboard to go back to.
  if (!stage) {
    return (
      <PageContainer size="shelf">
        <h1 className="font-display text-3xl font-medium tracking-[-0.015em] sm:text-4xl">
          My Journey
        </h1>
        <PathOverview />
        <StagePicker onDone={declare} />
      </PageContainer>
    );
  }

  return (
    <PageContainer size="shelf">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-medium tracking-[-0.015em] sm:text-4xl">
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
            className="mt-8"
          />
          <ContinueAv
            sources={[]}
            limit={3}
            heading="Listening & watching"
            note="Audio and video"
            variant="list"
          />

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
