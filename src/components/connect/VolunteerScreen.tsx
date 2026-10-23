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
export function VolunteerScreen() {
  const [signedUpAt, setSignedUpAt] = useState<string | null | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const loads = useRef(0);

  useEffect(() => {
    const at = getVolunteerSignup();
    setSignedUpAt(at);
    setShowForm(at === null);
  }, []);

  if (signedUpAt === undefined) return null;

  if (!showForm && signedUpAt) {
    return (
      <SignedUp
        at={signedUpAt}
        onAgain={() => {
          loads.current = 0;
          setShowForm(true);
        }}
      />
    );
  }

  return (
    <>
      <a
        href={VOLUNTEER_FORM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold"
        style={{ color: "var(--ws-ink)" }}
      >
        Open in Google Forms
        <ExternalLinkIcon className="h-4 w-4 shrink-0" />
      </a>
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
        className="mt-2 block w-full rounded-card border border-rule bg-white"
        style={{ height: "calc(100dvh - var(--bottom-nav-h, 0px) - 13rem)", minHeight: "28rem" }}
      />
    </>
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
      className="mt-5 rounded-card border border-rule bg-card p-5 shadow-card"
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
