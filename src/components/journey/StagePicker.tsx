"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AccentScope, useWorkspace } from "@/components/shell/WorkspaceProvider";
import { ctaPrimary } from "@/components/ui";
import { ONBOARDING_OPTIONS } from "@/lib/journey";

/**
 * The one question the journey asks — "where are you?" — as a modal over the
 * page (stage picker, desktop revision 19 Oct 2026).
 *
 * **One self-declared answer, and nothing else.** It sets which stage the
 * dashboard opens on and what it suggests reading next — it is not a profile,
 * not a test, and not something the app will quietly revise later. The screen
 * says as much twice: "you can change it any time" above the options and
 * "this only decides what the app shows you first" in the footer.
 *
 * **A dialog now, not a page.** It was an opaque full-screen layover, on the
 * argument that a half-built dashboard should not show through the question.
 * The redraw puts the page behind a scrim instead — the dashboard when the
 * stage is being changed, the four levels on a first run — so the reader
 * can see what the answer is for while giving it.
 *
 * Cancel only when there is somewhere to go back to (`onCancel`): changing a
 * stage can be abandoned, a first run cannot, because without an answer there
 * is no dashboard.
 *
 * Nothing is preselected. A default here would be the app answering its own
 * question and then showing the reader a path chosen for them.
 *
 * **Keys 1–5 pick a row** and Enter confirms, which is what the small number
 * at the end of each row advertises. The numbers are hidden where there is no
 * keyboard to press them on.
 */
export function StagePicker({
  onDone,
  onCancel,
}: {
  onDone: (stage: number) => void;
  /** present when the reader already has a stage to keep */
  onCancel?: () => void;
}) {
  const { workspace } = useWorkspace();
  const [choice, setChoice] = useState<string | null>(null);
  const picked = ONBOARDING_OPTIONS.find((o) => o.value === choice) ?? null;
  const panelRef = useRef<HTMLDivElement>(null);

  const confirm = useCallback(() => {
    if (picked) onDone(picked.stage);
  }, [picked, onDone]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= ONBOARDING_OPTIONS.length) {
        e.preventDefault();
        setChoice(ONBOARDING_OPTIONS[n - 1].value);
      } else if (e.key === "Enter" && picked) {
        e.preventDefault();
        confirm();
      } else if (e.key === "Escape" && onCancel) {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picked, confirm, onCancel]);

  // Scroll lock and first focus, as `Dialog` does — this is its own frame
  // only because it anchors to the foot of a phone rather than the centre.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = requestAnimationFrame(() => panelRef.current?.focus());
    return () => {
      document.body.style.overflow = previous;
      cancelAnimationFrame(id);
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AccentScope color={workspace.color}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stage-picker-title"
        /* A sheet from the foot on a phone, where the thumb is; centred from
           sm, where a panel rising from the floor would be the width of the
           screen with its decision at the far corner. */
        className="fixed inset-0 z-60 flex items-end justify-center sm:items-center sm:p-6"
      >
        <div
          aria-hidden
          onClick={onCancel}
          className="ws-sheet-backdrop absolute inset-0 bg-black/30 backdrop-blur-sm"
        />
        <div
          ref={panelRef}
          tabIndex={-1}
          className="ws-dialog relative flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-t-hero bg-card text-ink shadow-raised outline-none sm:max-h-full sm:max-w-[40rem] sm:rounded-hero"
        >
          <div className="overflow-y-auto px-5 pb-5 pt-6 sm:px-8 sm:pt-8">
            <h2
              id="stage-picker-title"
              lang="hi"
              className="hi hi-tight text-2xl font-semibold sm:text-[1.75rem]"
            >
              आप अपनी यात्रा में कहाँ हैं?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft sm:text-base">
              Where are you in your journey? One answer, and you can change it any time.
            </p>

            <div
              role="radiogroup"
              aria-label="Where are you in your journey?"
              className="mt-5 flex flex-col gap-2.5 sm:mt-6"
            >
              {ONBOARDING_OPTIONS.map((o, i) => {
                const active = o.value === choice;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setChoice(o.value)}
                    /* Selection is never colour alone — the filled radio says
                       it too. The ring is an inset shadow rather than a second
                       border so choosing a row cannot shift the rows under it
                       by a pixel. */
                    className="flex min-h-16 items-center gap-4 rounded-tile border bg-card px-4 py-3 text-start transition-colors hover:bg-ink/[0.02] active:bg-ink/[0.04]"
                    style={
                      active
                        ? {
                            borderColor: "var(--ws-color)",
                            boxShadow: "inset 0 0 0 1px var(--ws-color)",
                            background:
                              "color-mix(in srgb, var(--ws-color) 6%, var(--color-card))",
                          }
                        : { borderColor: "var(--color-rule)" }
                    }
                  >
                    <span
                      aria-hidden
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2"
                      style={{
                        borderColor: active
                          ? "var(--ws-color)"
                          : "color-mix(in srgb, var(--color-ink-soft) 45%, var(--color-card))",
                      }}
                    >
                      {active && (
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ background: "var(--ws-color)" }}
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span lang="hi" className="hi hi-tight block text-title font-semibold">
                        {o.hi}
                      </span>
                      <span className="mt-1 block text-sm leading-snug text-ink-soft">
                        {o.en}
                      </span>
                    </span>
                    <kbd
                      aria-hidden
                      className="hidden h-6 min-w-6 shrink-0 items-center justify-center rounded-md border border-rule px-1.5 font-sans text-xs text-ink-soft [@media(hover:hover)]:flex"
                    >
                      {i + 1}
                    </kbd>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-rule bg-inset px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:flex-row sm:items-center sm:px-8 sm:py-5">
            <p className="text-xs text-ink-soft sm:min-w-0 sm:flex-1 sm:text-sm">
              This only decides what the app shows you first.
            </p>
            <div className="flex gap-2.5">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-control border border-rule bg-card px-5 text-sm font-semibold text-ink transition-colors hover:bg-ink/[0.03] sm:flex-none"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                disabled={!picked}
                onClick={confirm}
                className={`${ctaPrimary} flex-1 sm:flex-none sm:px-7`}
                style={{ background: "var(--ws-color)" }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </AccentScope>,
    document.body
  );
}
