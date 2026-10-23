"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, ExternalLinkIcon } from "@/components/shell/icons";
import { getVolunteerSignup, markVolunteerSignup } from "@/lib/storage";
import { VOLUNTEER_FORM_EMBED, VOLUNTEER_FORM_URL } from "@/lib/volunteer";

/**
 * Connect → Volunteer: the volunteer group's Google Form, or — once this
 * device has sent it — a note saying so.
 *
 * **How a submit is noticed.** The form is cross-origin, so nothing inside it
 * can be read. What can be seen is the frame *navigating*: it loads once with
 * the form, and loads again when Submit takes it to Google's "response
 * recorded" page. The form is a single page, so that second load can only be
 * a submit — a missed required answer is caught in the page without one. If
 * the group ever splits the form into sections, "Next" will navigate too and
 * this will fire early; count the sections in here if that happens.
 *
 * `undefined` until the device has been asked, so a returning volunteer never
 * sees the form flash up first, and a blank form is never loaded for nothing.
 */
export function VolunteerScreen({ intro }: { intro: React.ReactNode }) {
  const [signedUpAt, setSignedUpAt] = useState<string | null | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const loads = useRef(0);

  useEffect(() => {
    const at = getVolunteerSignup();
    setSignedUpAt(at);
    setShowForm(at === null);
  }, []);

  // Undecided until mounted: the title stands, the rest waits a frame.
  const formShown = signedUpAt !== undefined && (showForm || !signedUpAt);

  /**
   * **Two columns on a desktop** (designer's comp, 23 Oct 2026): the title,
   * the line and the way out to Google Forms on the left, held in view, and
   * the form on the right in a card of its own. A phone stacks the same three
   * things, as before.
   */
  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start lg:gap-12">
      <div className="lg:sticky lg:top-8 lg:pt-2">
        {intro}
        {formShown && <FormsLink />}
      </div>
      <div>
        {signedUpAt === undefined ? null : formShown ? (
          <div className="lg:rounded-hero lg:border lg:border-rule lg:bg-card lg:p-10 lg:shadow-card">
            <iframe
              src={VOLUNTEER_FORM_EMBED}
              title="Volunteer Sign up form"
              onLoad={() => {
                loads.current += 1;
                if (loads.current > 1) {
                  setSignedUpAt(markVolunteerSignup());
                  setShowForm(false);
                }
              }}
              className="mt-2 block h-[calc(100dvh-var(--bottom-nav-h,0px)-13rem)] min-h-[28rem] w-full rounded-card border border-rule bg-white lg:mt-0 lg:h-[calc(100dvh-10rem)] lg:rounded-none lg:border-0"
            />
          </div>
        ) : (
          <SignedUp
            at={signedUpAt!}
            onAgain={() => {
              loads.current = 0;
              setShowForm(true);
            }}
          />
        )}
      </div>
    </div>
  );
}

function FormsLink() {
  return (
      <a
        href={VOLUNTEER_FORM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold lg:mt-4 lg:text-base"
        style={{ color: "var(--ws-ink)" }}
      >
        Open in Google Forms
        <ExternalLinkIcon className="h-4 w-4 shrink-0" />
      </a>
  );
}

function SignedUp({ at, onAgain }: { at: string; onAgain: () => void }) {
  const date = new Date(at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <section
      className="mt-5 rounded-card border border-rule bg-card p-5 shadow-card lg:mt-2"
      aria-live="polite"
    >
      <span
        className="inline-flex h-11 w-11 items-center justify-center rounded-control"
        style={{
          background: "color-mix(in srgb, var(--ws-color) 12%, var(--color-card))",
          color: "var(--ws-ink)",
        }}
      >
        <CheckIcon className="h-5 w-5" />
      </span>
      <h2 className="mt-3 text-title font-semibold tracking-[-0.015em]">You&apos;ve signed up</h2>
      <p className="mt-2 text-ink-soft">
        Your response went to the volunteer group on {date}. Thank you for offering your time.
      </p>
      <button
        type="button"
        onClick={onAgain}
        className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold"
        style={{ color: "var(--ws-ink)" }}
      >
        Submit another response
      </button>
    </section>
  );
}
