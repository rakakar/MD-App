"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { LABEL } from "@/components/auth/fields";
import { ProfileFields, STEP_FIELDS, profileReady } from "@/components/auth/ProfileFields";
import { ArrowLeftIcon, CheckIcon } from "@/components/shell/icons";
import { AppAccent } from "@/components/shell/WorkspaceProvider";
import { useIsDesktop } from "@/components/ui/Dialog";
import { displayPhone } from "@/lib/me";
import { LAUNCH } from "@/lib/onboarding";
import { askForStage, lockedFields, profileDone, profileFor, storeProfile, type ProfileValues } from "@/lib/profile";
import { safeReturnPath, signInHref } from "@/lib/routes";
import { getPrefs } from "@/lib/storage";

/**
 * **"A little about you" — step 1 of 2 after signing in** (designer's comps,
 * 26 Oct 2026). Name, mobile, state and city; step 2 is the journey question,
 * which opens over wherever the reader was headed (`StagePrompt`).
 *
 * **First run only:** creating an account lands here (`welcomeHref`); signing
 * in again does not — the same details are editable in Settings and on the
 * Profile page. It still passes straight through if this account has
 * already answered, which the server remembers across devices.
 *
 * Same frame as the sign-in screen on a desktop: the launch artwork as the
 * left panel, the form on the right. A phone drops the band — the four fields
 * and their keyboard need the height — and keeps Continue at the foot, where
 * the thumb is.
 *
 * When the reader has already said where they are on the path (it is a
 * device pref, so it can predate the account), there is no step 2 and the
 * step count would be a promise of a question that never comes — it goes.
 */
export function ProfileStep() {
  const router = useRouter();
  const search = useSearchParams();
  const next = safeReturnPath(search.get("next"));
  const { user, loading, refresh } = useAuth();

  const desktop = useIsDesktop();
  const [values, setValues] = useState<ProfileValues>({
    name: "",
    mobile: "",
    state: "",
    city: "",
    updates_opt_in: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** null until auth and the local answers have been read */
  const [show, setShow] = useState<null | { stageNext: boolean }>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(signInHref(next));
      return;
    }
    if (profileDone(user)) {
      router.replace(next);
      return;
    }
    // Prefilled from what the account already knows — the server's card holds
    // the sign-in number, and anything a half-answered step left behind.
    const card = profileFor(user);
    const m = /^\+91(\d{10})$/.exec(user.phone ?? "");
    setValues((v) => ({
      ...v,
      name: (card?.name || user.name || user.first_name || "").trim(),
      mobile: card?.mobile || (m ? m[1] : ""),
      state: card?.state ?? "",
      city: card?.city ?? "",
      updates_opt_in: card?.updates_opt_in ?? false,
    }));
    setShow({ stageNext: getPrefs().journeyStage == null });
  }, [loading, user, next, router]);

  if (!user || !show) return null;

  const ready = profileReady(values, STEP_FIELDS, true);
  const signedInAs = user.email || displayPhone(user.phone);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      await storeProfile(user, values);
      await refresh();
      if (show.stageNext) askForStage();
      router.replace(next);
    } catch {
      setError("Couldn't save. Please try again.");
      setBusy(false);
    }
  };

  return (
    <AppAccent>
      <div className="min-h-dvh bg-surface lg:flex lg:items-center lg:justify-center lg:px-8 lg:py-10">
        <div className="mx-auto w-full max-w-md lg:grid lg:max-w-5xl lg:grid-cols-2 lg:overflow-hidden lg:rounded-hero lg:border lg:border-rule lg:bg-card lg:shadow-card">
          {/* The sign-in screen's left panel, unchanged, so the two steps read
              as one sitting. Desktop only. */}
          <aside className="relative hidden min-h-[40rem] overflow-hidden border-r border-rule lg:block">
            {/* eslint-disable-next-line @next/next/no-img-element -- the launch
                screen's own fixed asset, as on the sign-in screen. */}
            <img
              src="/brand/launch-mobile.webp"
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, transparent 0%, transparent 60%, color-mix(in srgb, var(--color-surface) 72%, transparent) 80%, color-mix(in srgb, var(--color-surface) 90%, transparent) 100%)",
              }}
            />
            <Link
              href={next}
              className="absolute start-4 top-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-rule bg-card/90 pe-4 ps-3.5 text-sm font-semibold text-ink-soft shadow-card backdrop-blur-sm transition-colors hover:bg-card"
            >
              <ArrowLeftIcon className="h-4 w-4 shrink-0" />
              Back to reading
            </Link>
            <div className="absolute inset-x-6 bottom-9 flex flex-col items-center gap-1.5 text-center">
              <p lang="hi" className="auth-name font-devanagari-sans" style={{ color: "var(--ws-ink)" }}>
                {LAUNCH.founderLine}
              </p>
              <p className="launch-eyebrow font-semibold uppercase text-ink-soft">{LAUNCH.eyebrow}</p>
            </div>
          </aside>

          <form
            onSubmit={submit}
            noValidate
            className="flex min-h-dvh flex-col lg:min-h-0"
          >
            <div className="flex-1 px-6 pb-8 pt-[calc(max(env(safe-area-inset-top),1rem)+2.5rem)] lg:flex-none lg:px-12 lg:pb-0 lg:pt-16">
              {show.stageNext && (
                <div className="flex items-center gap-4">
                  <p className={`${LABEL} shrink-0`}>Step 1 of 2</p>
                  <div
                    role="progressbar"
                    aria-label="Step 1 of 2"
                    aria-valuemin={1}
                    aria-valuemax={2}
                    aria-valuenow={1}
                    className="h-1 flex-1 overflow-hidden rounded-full bg-rule"
                  >
                    <div className="h-full w-1/2 rounded-full" style={{ background: "var(--ws-color)" }} />
                  </div>
                </div>
              )}

              <h1 className="mt-4 font-display text-[2rem] leading-tight text-ink">
                A little about you
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft sm:text-base">
                We use this to share shivir and centre updates near you.
              </p>

              {signedInAs && (
                <p className="mt-5 flex min-h-11 items-center gap-3 rounded-tile bg-inset px-4 py-2.5 text-sm text-ink">
                  <CheckIcon className="h-5 w-5 shrink-0 text-success" />
                  <span className="min-w-0 break-words">
                    Signed in as <strong className="font-bold">{signedInAs}</strong>
                  </span>
                </p>
              )}

              <div className="mt-6">
                {/* State and City side by side on a desktop, as drawn. */}
                <ProfileFields value={values} onChange={setValues} split={desktop} locked={lockedFields(user)} />
              </div>
            </div>

            {/* The foot of the screen on a phone, under a rule; straight under
                the fields on a desktop. */}
            <div className="sticky bottom-0 border-t border-rule bg-surface px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 lg:static lg:border-t-0 lg:bg-transparent lg:px-12 lg:pb-16 lg:pt-6">
              {error && (
                <p role="alert" className="mb-3 rounded-tile border border-danger/30 bg-danger/8 px-4 py-3 text-sm text-danger">
                  {error}
                </p>
              )}
              {/* Idle until all four hold something, like Sign in. The opt-in may stay off. */}
              <button
                type="submit"
                disabled={!ready || busy}
                className={`min-h-14 w-full rounded-tile text-base font-bold transition-colors ${
                  ready ? "text-on-accent hover:opacity-90 disabled:opacity-80" : "bg-canvas text-ink-soft"
                }`}
                style={ready ? { background: "var(--ws-color)" } : undefined}
              >
                {busy ? "Please wait…" : "Continue"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppAccent>
  );
}
