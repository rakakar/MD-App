"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon } from "@/components/shell/icons";
import { AccentScope, useWorkspace } from "@/components/shell/WorkspaceProvider";
import { ctaPrimary } from "@/components/ui";
import { ONBOARDING_OPTIONS } from "@/lib/journey";

/**
 * The one question the journey asks (19A screen 1) — as a layover, not a page.
 *
 * **One self-declared answer, and nothing else.** It sets which stage the
 * dashboard opens on and what it suggests reading next — it is not a profile,
 * not a test, and not something the app will quietly revise later. The screen
 * says as much twice: "you can change it any time" above the options and
 * "this only decides what the app shows you first" under the button.
 *
 * **Over everything, including the chrome.** It began as the dashboard's empty
 * state, which was the wrong shape: a tab bar and a workspace switcher around
 * a question reads as a page a reader is stuck on, and invites them to go
 * looking for the way past it. Covering the app makes it a step in a flow with
 * one way out — answer it — and the dashboard is whole the moment they do.
 *
 * No close, and that is deliberate rather than an oversight: there is no
 * dashboard to return to until the question is answered, so a dismiss would
 * only put the reader back where they started.
 *
 * Nothing is preselected. A default here would be the app answering its own
 * question and then showing the reader a path chosen for them.
 */
export function Onboarding({ onDone }: { onDone: (stage: number) => void }) {
  const { workspace } = useWorkspace();
  const [choice, setChoice] = useState<string | null>(null);
  const picked = ONBOARDING_OPTIONS.find((o) => o.value === choice) ?? null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Where are you in your journey?"
      /* Opaque, not a scrim: what is behind has no stage in it yet, so showing
         a half-built dashboard through the question would advertise the thing
         the question exists to fix. `overflow-y-auto` because five options and
         a button do not fit a short phone in landscape. */
      className="fixed inset-0 z-60 overflow-y-auto bg-surface"
    >
      {/* The workspace this overlay belongs to, put back in scope. A portal
          renders outside the provider's `[data-ws]`, so without this every
          `var(--ws-color)` below resolves to the app's default terracotta and
          My Journey's screen paints in Originals' colour. */}
      <AccentScope color={workspace.color}>
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6">
      <h1 lang="hi" className="hi hi-tight text-2xl font-semibold">
        आप अपनी यात्रा में कहाँ हैं?
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Where are you in your journey? One answer, and you can change it any
        time.
      </p>

      <div
        role="radiogroup"
        aria-label="Where are you in your journey?"
        className="mt-6 flex flex-col gap-2.5"
      >
        {ONBOARDING_OPTIONS.map((o) => {
          const active = o.value === choice;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setChoice(o.value)}
              /* Selection is never colour alone — the ring and the check carry
                 it too, the same rule the workspace picker follows. The ring is
                 an inset shadow rather than a second border so choosing a row
                 cannot shift the rows under it by a pixel. */
              /* `rounded-tile` (14px), a step down the ladder from the 20px
                 card: five of these stacked at the card radius read as five
                 separate panels rather than as one set of choices. */
              className="flex min-h-14 items-center gap-3 rounded-tile border bg-card p-3 text-start transition-colors active:bg-ink/[0.03]"
              style={
                active
                  ? {
                      borderColor: "var(--ws-color)",
                      boxShadow: "inset 0 0 0 1px var(--ws-color)",
                      background:
                        "color-mix(in srgb, var(--ws-color) 7%, var(--color-card))",
                    }
                  : { borderColor: "var(--color-rule)" }
              }
            >
              <span className="min-w-0 flex-1">
                <span lang="hi" className="hi hi-tight block text-sm font-semibold">
                  {o.hi}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-ink-soft">
                  {o.en}
                </span>
              </span>
              {active && (
                <span className="shrink-0" style={{ color: "var(--ws-ink)" }} aria-hidden>
                  <CheckIcon className="h-4.5 w-4.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Pinned to the foot of the column rather than sitting under the last
          option: on a short phone the five options and the button fill the
          screen, and on a tall one the button should still be where the thumb
          expects it. */}
      <div className="mt-auto pt-8">
        <button
          type="button"
          disabled={!picked}
          onClick={() => picked && onDone(picked.stage)}
          className={`${ctaPrimary} w-full`}
          style={{ background: "var(--ws-color)" }}
        >
          Continue
        </button>
        <p className="mt-2.5 text-center text-xs text-ink-soft">
          This only decides what the app shows you first.
        </p>
      </div>
      </div>
      </AccentScope>
    </div>,
    document.body
  );
}
