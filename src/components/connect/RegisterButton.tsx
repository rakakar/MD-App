"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "@/components/shell/icons";
import { ctaPrimaryBar } from "@/components/ui";

const KEY = "md.registered.v1";

function readRegistered(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * The pinned Register button, and what happens after it (16 Nov 2026, UX
 * audit CN3).
 *
 * Registration is the organiser's own form, in another tab, by design — so the
 * app never learns whether it went through. It came back to the same page
 * with the same Register button, nothing to say "done", and next week's visit
 * invited a second registration. Now, when the reader comes back to this tab
 * after tapping it, the bar asks once: did you register? Yes is remembered on
 * this device and turns the bar into a quiet "Registered" with the form still
 * a tap away; Not yet puts the button back as it was.
 */
export function RegisterButton({ slug, href }: { slug: string; href: string }) {
  const [state, setState] = useState<"idle" | "away" | "asking" | "registered">("idle");

  useEffect(() => {
    if (readRegistered()[slug]) setState("registered");
  }, [slug]);

  // Back from the form's tab: ask.
  useEffect(() => {
    if (state !== "away") return;
    const back = () => {
      if (document.visibilityState === "visible") setState("asking");
    };
    document.addEventListener("visibilitychange", back);
    window.addEventListener("focus", back);
    return () => {
      document.removeEventListener("visibilitychange", back);
      window.removeEventListener("focus", back);
    };
  }, [state]);

  const answer = (yes: boolean) => {
    if (yes) {
      try {
        localStorage.setItem(KEY, JSON.stringify({ ...readRegistered(), [slug]: new Date().toISOString() }));
      } catch {
        // not remembered, no worse than before
      }
    }
    setState(yes ? "registered" : "idle");
  };

  if (state === "asking") {
    return (
      <div className="flex items-center gap-2" role="group" aria-label="Did you register?">
        <p className="min-w-0 flex-1 text-sm font-semibold text-ink">Did you register?</p>
        <button
          type="button"
          onClick={() => answer(true)}
          className="min-h-11 rounded-control px-4 text-sm font-semibold text-on-accent"
          style={{ background: "var(--ws-color)" }}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => answer(false)}
          className="min-h-11 rounded-control border border-rule bg-card px-4 text-sm font-semibold text-ink"
        >
          Not yet
        </button>
      </div>
    );
  }

  if (state === "registered") {
    return (
      <div className="flex items-center gap-3">
        <p className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold text-success">
          <CheckIcon className="h-5 w-5 shrink-0" />
          You registered for this shivir
        </p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold"
          style={{ color: "var(--ws-ink)" }}
        >
          Open the form
        </a>
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => setState("away")}
      className={`${ctaPrimaryBar} w-full`}
      style={{ background: "var(--ws-color)" }}
    >
      Register
    </a>
  );
}
