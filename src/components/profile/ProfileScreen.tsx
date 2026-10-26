"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ProfileFields, profileReady } from "@/components/auth/ProfileFields";
import { StagePicker } from "@/components/journey/StagePicker";
import { ChevronRight } from "@/components/shell/icons";
import { AppAccent } from "@/components/shell/WorkspaceProvider";
import { SectionHeading, Sheet, ctaPrimary } from "@/components/ui";
import { BackButton } from "@/components/ui/BackButton";
import { Dialog, useIsDesktop } from "@/components/ui/Dialog";
import { getBooks } from "@/lib/api";
import { contentLang } from "@/lib/script";
import { ONBOARDING_OPTIONS, stageBooks, stageById } from "@/lib/journey";
import { displayPhone } from "@/lib/me";
import { profileFor, storeProfile, type ProfileValues, type ReaderProfile } from "@/lib/profile";
import { signInHref } from "@/lib/routes";
import { getPrefs, setPrefs } from "@/lib/storage";
import type { BookSummary, MeUser } from "@/lib/types";

const CARD = "overflow-hidden rounded-card border border-rule bg-card";

/** The quiet bordered button — Change, Edit, Sign out — as Settings draws it. */
const ROW_BUTTON_BASE =
  "inline-flex min-h-11 shrink-0 items-center rounded-control border border-rule bg-card px-4 text-sm font-semibold transition-colors hover:bg-inset";
const ROW_BUTTON = `${ROW_BUTTON_BASE} text-ink`;

/**
 * **Profile** — who the reader is, where they are on the path, and how they
 * sign in (designer's comps, 26 Oct 2026). Opened from the reader's name at
 * the top of the account menu, on a phone and at a desk.
 *
 * Phone: one column — the reader, then Your journey, Personal details and
 * Account as eyebrow-titled cards on the recessed canvas, as Settings is.
 * Desk: the reader and their journey stand in a narrow column on the left,
 * the details and account as label | value rows on the right.
 *
 * **Nothing here is claimed that the app cannot back.** "Verified" sits only
 * on the number the reader signs in with, since a WhatsApp code proved it;
 * the email carries it only when the server says so (`email_verified`), and
 * "Member since" only when it sends a join date. Today `/me/` sends neither.
 * Mobile, state and city come from this device (`lib/profile.ts`) until the
 * server stores them.
 */
export function ProfileScreen() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const desktop = useIsDesktop();
  const [profile, setProfile] = useState<ReaderProfile | null>(null);
  const [stage, setStage] = useState<{ id: number | null; answer: string | null } | null>(null);
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [editing, setEditing] = useState(false);
  const [changingStage, setChangingStage] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(signInHref("/profile"));
      return;
    }
    setProfile(profileFor(user));
    const p = getPrefs();
    setStage({ id: p.journeyStage, answer: p.journeyAnswer });
  }, [loading, user, router]);

  useEffect(() => {
    void getBooks()
      .then(setBooks)
      .catch(() => undefined);
  }, []);

  if (!user || !stage) return null;

  const name = (user.name || user.first_name || "").trim();
  const email = user.email || "";
  const location = [profile?.city, profile?.state].filter(Boolean).join(", ");
  const joined = memberSince(user);

  const signOut = async () => {
    await logout();
    router.replace("/");
  };

  const identity = (
    <div className={desktop ? `${CARD} p-8` : "flex items-center gap-5"}>
      <span
        aria-hidden
        className={`flex shrink-0 items-center justify-center rounded-full border border-rule bg-accent-tint font-semibold text-accent-ink ${
          desktop ? "h-24 w-24 text-4xl" : "h-20 w-20 text-3xl"
        }`}
      >
        {(name || email || "R").charAt(0).toUpperCase()}
      </span>
      <div className={`min-w-0 ${desktop ? "mt-6" : "flex-1"}`}>
        <h2 className="break-words text-2xl font-semibold leading-tight tracking-[-0.015em] text-ink">
          {name || email || displayPhone(user.phone)}
        </h2>
        {location && <p className="mt-1.5 text-base text-ink-soft">{location}</p>}
        {joined && <p className="mt-1 text-sm text-ink-soft">Member since {joined}</p>}
      </div>
    </div>
  );

  return (
    <AppAccent>
      <div className="min-h-full bg-canvas lg:bg-surface">
        <div className="mx-auto w-full max-w-3xl px-4 pb-12 pt-3 sm:px-6 lg:max-w-6xl lg:px-10 lg:pt-10">
          <div className="flex items-center gap-2 lg:mb-8">
            <span className="lg:hidden">
              <BackButton />
            </span>
            <h1 className="font-display text-2xl font-medium lg:text-3xl">Profile</h1>
          </div>

          <div className="mt-6 lg:mt-0 lg:grid lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:items-start lg:gap-10">
            {/* The reader, and where they are on the path. */}
            <div className="flex flex-col gap-8 lg:gap-6">
              {identity}
              <JourneyCard
                desktop={desktop}
                answer={stage.answer}
                stageId={stage.id}
                books={books}
                onChange={() => setChangingStage(true)}
              />
            </div>

            <div className="mt-8 lg:mt-0">
              <SectionHeading
                action={
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className={
                      desktop
                        ? ROW_BUTTON
                        : "inline-flex min-h-11 items-center px-1 text-base font-semibold text-accent-ink"
                    }
                  >
                    Edit
                  </button>
                }
              >
                Personal details
              </SectionHeading>
              <dl className={`${CARD} divide-y divide-rule`}>
                <Row label="Full name">{name || <Missing />}</Row>
                <Row label="Mobile number">
                  <MobileValue user={user} profile={profile} />
                </Row>
                <Row label="Email">
                  {email ? (
                    <>
                      <span className="min-w-0 break-all">{email}</span>
                      {user.email_verified === true && <Verified />}
                    </>
                  ) : (
                    <Missing />
                  )}
                </Row>
                <Row label="State">{profile?.state || <Missing />}</Row>
                <Row label="City">{profile?.city || <Missing />}</Row>
              </dl>

              <div className="mt-8">
                <SectionHeading>Account</SectionHeading>
                {desktop ? (
                  <dl className={`${CARD} divide-y divide-rule`}>
                    <Row
                      label="Signed in with"
                      aside={
                        <Link href="/settings?from=profile" className="inline-flex min-h-11 items-center text-sm font-semibold text-accent-ink hover:underline">
                          Manage in Settings
                        </Link>
                      }
                    >
                      {signInMethod(user)}
                    </Row>
                    <Row
                      label="Session"
                      aside={
                        <button type="button" onClick={() => void signOut()} className={`${ROW_BUTTON_BASE} text-danger`}>
                          Sign out
                        </button>
                      }
                    >
                      Signed in on this device
                    </Row>
                  </dl>
                ) : (
                  <div className={`${CARD} divide-y divide-rule`}>
                    <div className="px-5 py-4">
                      <p className="text-sm text-ink-soft">Signed in with</p>
                      <p className="mt-1 text-title text-ink">{signInMethod(user)}</p>
                    </div>
                    <Link href="/settings?from=profile" className="flex min-h-14 items-center justify-between gap-3 px-5 text-title text-ink active:bg-ink/[0.03]">
                      Settings
                      <ChevronRight className="h-5 w-5 text-ink-soft" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => void signOut()}
                      className="flex min-h-14 w-full items-center px-5 text-start text-title font-semibold text-danger active:bg-ink/[0.03]"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <EditProfile
        open={editing}
        desktop={desktop}
        user={user}
        profile={profile}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setProfile(profileFor(user));
          setEditing(false);
        }}
      />

      {changingStage && (
        <StagePicker
          onDone={(id, answer) => {
            setPrefs({ journeyStage: id, journeyAnswer: answer });
            setStage({ id, answer });
            setChangingStage(false);
          }}
          onCancel={() => setChangingStage(false)}
        />
      )}
    </AppAccent>
  );
}

/** "March 2026", from whichever join date the server sends — none yet. */
function memberSince(user: MeUser): string | null {
  const raw = user.date_joined ?? user.created_at;
  if (typeof raw !== "string") return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function signInMethod(user: MeUser): string {
  return user.email ? "Email and password" : "Mobile number (WhatsApp code)";
}

/**
 * The number on file, and "Verified" only on the one the reader signs in with
 * — that one a WhatsApp code has proved; one typed into a form has not.
 */
function MobileValue({ user, profile }: { user: MeUser; profile: ReaderProfile | null }) {
  const signIn = user.phone ?? "";
  const number = profile?.mobile ? `+91${profile.mobile}` : signIn;
  if (!number) return <Missing />;
  return (
    <>
      <span>{displayPhone(number)}</span>
      {signIn !== "" && number === signIn && <Verified />}
    </>
  );
}

/**
 * One detail. On a phone the label over the value; at a desk label | value
 * in two columns, with an action at the end where the row has one.
 */
function Row({ label, aside, children }: { label: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 lg:min-h-18 lg:px-7 lg:py-3">
      <div className="min-w-0 flex-1 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-center lg:gap-6">
        <dt className="text-sm text-ink-soft lg:text-base lg:font-medium lg:text-ink">{label}</dt>
        <dd className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-title text-ink lg:mt-0 lg:text-base">
          {children}
        </dd>
      </div>
      {aside}
    </div>
  );
}

function Verified() {
  return (
    <span className="inline-flex items-center rounded-full bg-success-tint px-2.5 py-0.5 text-xs font-medium text-success">
      Verified
    </span>
  );
}

function Missing() {
  return <span className="text-ink-soft">Not added</span>;
}

/**
 * Your journey: the reader's own answer, Change, and the first book of their
 * stage under "Start here". With no stage yet, an invitation to choose one.
 */
function JourneyCard({
  desktop,
  answer,
  stageId,
  books,
  onChange,
}: {
  desktop: boolean;
  answer: string | null;
  stageId: number | null;
  books: BookSummary[];
  onChange: () => void;
}) {
  const stage = stageById(stageId);
  // The reader's own words when we have them; the stage's name for a stage
  // declared before the answer was recorded.
  const option = ONBOARDING_OPTIONS.find((o) => o.value === answer && o.stage === stage?.id);
  const hi = option?.hi ?? stage?.hi;
  const en = option?.en ?? stage?.en;
  const start = stage ? stageBooks(stage, books)[0] : undefined;
  const startTitle = start ? contentLang(start.title_hi) : null;

  const change = (
    <button
      type="button"
      onClick={onChange}
      className={
        desktop
          ? "inline-flex min-h-11 items-center text-sm font-semibold text-accent-ink"
          : `${ROW_BUTTON} min-h-12 px-5 text-base`
      }
    >
      {stage ? "Change" : "Choose"}
    </button>
  );

  const heading = (
    <div className="min-w-0 flex-1">
      {hi ? (
        <>
          <p lang="hi" className="hi hi-tight text-xl font-semibold text-ink">
            {hi}
          </p>
          {en && <p className="mt-1 text-base text-ink-soft">{en}</p>}
        </>
      ) : (
        <p className="text-base text-ink-soft">Tell the app where you are on the path, and it will suggest where to begin.</p>
      )}
    </div>
  );

  const startRow = start && startTitle && (
    <Link
      href={`/books/${encodeURIComponent(start.code)}`}
      className={
        desktop
          ? "mt-4 block border-t border-rule pt-4"
          : "flex min-h-14 items-center gap-3 border-t border-rule px-5 active:bg-ink/[0.03]"
      }
    >
      <span className={desktop ? "block text-sm text-ink-soft" : "text-base text-ink-soft"}>Start here</span>
      <span
        lang={startTitle.lang}
        className={`${startTitle.className} hi-tight min-w-0 truncate text-title font-semibold text-ink ${
          desktop ? "mt-1 block" : "ms-auto"
        }`}
      >
        {start.title_hi}
      </span>
      {!desktop && <ChevronRight className="h-5 w-5 shrink-0 text-ink-soft" />}
    </Link>
  );

  if (desktop) {
    return (
      <section className={`${CARD} p-7`}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">Your journey</h2>
          {change}
        </div>
        {heading}
        {startRow}
      </section>
    );
  }

  return (
    <section>
      <SectionHeading>Your journey</SectionHeading>
      <div className={CARD}>
        <div className="flex items-center gap-4 px-5 py-5">
          {heading}
          {change}
        </div>
        {startRow}
      </div>
    </section>
  );
}

/**
 * Edit personal details — the sign-in step's four fields, in a sheet on a
 * phone and a dialog at a desk. Save stays idle until all four are filled,
 * as Continue does there.
 */
function EditProfile({
  open,
  desktop,
  user,
  profile,
  onClose,
  onSaved,
}: {
  open: boolean;
  desktop: boolean;
  user: MeUser;
  profile: ReaderProfile | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<ProfileValues>(() => initialValues(user, profile));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fresh from what is saved each time it opens — not what was typed and
  // abandoned last time.
  useEffect(() => {
    if (open) {
      setValues(initialValues(user, profile));
      setError(null);
    }
  }, [open, user, profile]);

  const { refresh } = useAuth();
  const ready = profileReady(values);

  const save = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      await storeProfile(user, values);
      await refresh();
      onSaved();
    } catch {
      setError("Couldn't save. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const saveButton = (
    <button
      type="submit"
      form="edit-profile"
      disabled={!ready || busy}
      className={`${ctaPrimary} min-h-12 w-full sm:w-auto sm:px-7`}
      style={{ background: "var(--ws-color)" }}
    >
      {busy ? "Saving…" : "Save"}
    </button>
  );

  const form = (
    <form
      id="edit-profile"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <ProfileFields value={values} onChange={setValues} split={desktop} idPrefix="edit-profile" />
      {error && (
        <p role="alert" className="mt-4 rounded-tile border border-danger/30 bg-danger/8 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );

  if (desktop) {
    return (
      <Dialog open={open} onClose={onClose} label="Edit personal details" className="w-full max-w-xl rounded-hero bg-card p-8 shadow-raised">
        <h2 className="font-display text-2xl font-medium text-ink">Personal details</h2>
        <div className="mt-6">{form}</div>
        <div className="mt-8 flex justify-end gap-3">
          <button type="button" onClick={onClose} className={ROW_BUTTON}>
            Cancel
          </button>
          {saveButton}
        </div>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title="Personal details" footer={saveButton}>
      <div className="px-5 pb-4 pt-1">{form}</div>
    </Sheet>
  );
}

function initialValues(user: MeUser, profile: ReaderProfile | null): ProfileValues {
  const fromPhone = /^\+91(\d{10})$/.exec(user.phone ?? "")?.[1] ?? "";
  return {
    name: (user.name || user.first_name || profile?.name || "").trim(),
    mobile: profile?.mobile || fromPhone,
    state: profile?.state ?? "",
    city: profile?.city ?? "",
  };
}
