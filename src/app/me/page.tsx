"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ContinueAv } from "@/components/library/ContinueAv";
import { ContinueReading } from "@/components/home/ContinueReading";
import { Onboarding } from "@/components/journey/Onboarding";
import { FullPathCard, StageCard } from "@/components/journey/StageCard";
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
 * where they say they are on the path and everything they have marked. There
 * is nothing here to show a stranger, and a dashboard that renders empty
 * furniture for one is worse than a door.
 *
 * The rest of the app is untouched by this: a guest still reads every book,
 * every recording and every folder, and still keeps their place — see the
 * "Reading as guest" line on Settings. It is only the account's own workspace
 * that asks who is asking.
 */
function SignInGate() {
  return (
    /* Centred column, as drawn: illustration, name, what it is, the one
       action, then the reassurance under a rule. `max-w-xl` rather than the
       page's full measure — the artwork is the widest thing here and a hero
       stretched across a desktop reads as a banner. */
    <div className="mx-auto flex max-w-xl flex-col items-center px-2 py-4 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/illustrations/journey-empty.png"
        alt=""
        /* Decorative, so it is `alt=""` and hidden from a screen reader: the
           heading under it already says what this screen is, and describing a
           still life of books and a sunrise would only be read aloud in the
           way of the sentence that matters. */
        aria-hidden
        width={1000}
        height={879}
        className="h-auto w-full max-w-[22rem] select-none"
      />

      <h1 className="mt-2 font-display text-3xl font-medium tracking-[-0.015em]">
        Start your journey
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
        Where you are on the path, what you are reading and listening to, and
        everything you have marked — kept together and synced to your account.
      </p>

      {/* The button on its own, with no card around it. The card carried a
          heading and a paragraph that said again what the line above already
          says, and boxing a single action made the one thing to do on this
          screen look like one of several. */}
      <Link
        href="/login?next=/me"
        className={`${ctaPrimary} mt-7 w-full sm:w-auto sm:px-7`}
        style={{ background: "var(--ws-color)" }}
      >
        Sign In to begin
        <ArrowRightIcon className="h-4 w-4" />
      </Link>

      {/* Straight under the button, with nothing between them: the rule was
          separating the reassurance from the action it qualifies, when the two
          belong together. */}
      <p className="mt-4 text-xs text-ink-soft">
        Every book, recording and folder stays open without an account.
      </p>
    </div>
  );
}

/**
 * **My Journey — the dashboard** (19A screens 1 and 2).
 *
 * Two screens behind one address, and which one shows turns on a single
 * question: has the reader said where they are? Until they have, this *is* the
 * onboarding — no dashboard behind it, nothing to dismiss — because a journey
 * screen with no stage in it would be a page of empty furniture. After, it is
 * the stage they named, one next step, and the two histories.
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
      <PageContainer>
        <SignInGate />
      </PageContainer>
    );
  }

  const stage = stageById(stageId);

  // Not yet asked, or asked again from the card. The layover covers the app
  // until answered — on a first run there is no dashboard to show behind it,
  // so nothing is rendered under it either way, and the same component serves
  // both because it is the same question.
  if (!stage || changing) {
    return (
      <Onboarding
        onDone={(next) => {
          setPrefs({ journeyStage: next });
          setStageId(next);
          setChanging(false);
        }}
      />
    );
  }

  return (
    <PageContainer>
      <h1 className="font-display text-2xl font-medium">My Journey</h1>

      <div className="mt-4 flex flex-col gap-3">
        <StageCard
          stage={stage}
          books={books}
          progress={progress}
          onChangeStage={() => setChanging(true)}
        />
        <FullPathCard />
      </div>

      {/* Both histories, whichever shelf they came from — this workspace is
          about the reader rather than about a shelf, which is why the reading
          rail is asked for "all" here and for one workspace everywhere else.
          Each draws nothing at all when there is nothing part-finished, so a
          reader who has only ever opened one book sees one rail. */}
      <ContinueReading
        workspace="all"
        heading="Reading"
        tier="eyebrow"
        limit={2}
      />
      {/* Originals only, as the comps specify — "मूल ऑडियो/वीडियो से". The
          rail scopes its own lookup to that shelf, so a recording from
          Resources is not named here even though the reading rail beside it
          spans everything. See the note on the dashboard's histories. */}
      <ContinueAv sources={[]} limit={2} heading="Listening" />

      {progress.length === 0 && (
        <div className="mt-5">
          <EmptyState
            title="Nothing in progress yet"
            hint="Open any book and your place is saved automatically — it will show up here."
          />
        </div>
      )}

      {/* No Bookmarks/Notes shortcuts. They are two of the four tabs in the
          bar at the foot of this very screen, and a card repeating a tab is a
          second door to a room the reader is already standing outside. The
          dashboard is the stage and the two histories; what is saved has its
          own tabs. */}
    </PageContainer>
  );
}
