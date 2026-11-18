"use client";

import { ChevronDown, CloseIcon, PinIcon } from "@/components/shell/icons";
import { stateButtonLabel, type ContactStates } from "@/lib/directory";

/**
 * The state chooser on both halves of Centres — the button that opens the
 * state sheet, and, once a state is chosen, the way back out of it.
 *
 * **Chosen has to look chosen** (designer, 19 Nov 2026). Centres opens on the
 * reader's own state, so a returning reader met "Chhattisgarh" in a box drawn
 * exactly like the empty one and could not tell it was a filter, that tapping
 * it changes it, or how to clear it — the only way out was a link under the
 * list. Chosen, the box takes the workspace tint, says what it is doing
 * ("Showing centres in"), and carries its own × to clear it.
 */
export function StateChooser({
  state,
  allValue,
  states,
  count,
  noun,
  onOpen,
  onClear,
}: {
  state: string;
  /** the code meaning "no state chosen" */
  allValue: string;
  states: ContactStates["states"];
  /** how many are shown for the chosen state */
  count: number;
  /** "centres" or "contacts" — what the chosen state narrows */
  noun: string;
  onOpen: () => void;
  onClear: () => void;
}) {
  const chosen = state !== allValue;
  const name = stateButtonLabel(state, states);

  return (
    <div
      className="flex min-h-14 w-full items-stretch rounded-control border bg-card"
      style={
        chosen
          ? {
              borderColor: "color-mix(in srgb, var(--ws-ink) 45%, var(--color-rule))",
              background: "color-mix(in srgb, var(--ws-color) 9%, var(--color-card))",
            }
          : { borderColor: "var(--color-rule)" }
      }
    >
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        aria-label={chosen ? `Showing ${noun} in ${name}. Change state` : "Choose a state"}
        className="flex min-w-0 flex-1 items-center gap-3 px-3.5 text-start"
      >
        <span aria-hidden className="shrink-0" style={{ color: "var(--ws-ink)" }}>
          <PinIcon />
        </span>
        {chosen ? (
          <span className="min-w-0 flex-1 py-1.5">
            <span className="block text-xs text-ink-soft">Showing {noun} in</span>
            <span className="block truncate text-base font-semibold text-ink">{name}</span>
          </span>
        ) : (
          <span className="min-w-0 flex-1 truncate text-base text-ink-soft">{name}</span>
        )}
        {chosen && <span className="shrink-0 text-sm tabular-nums text-ink-soft">{count}</span>}
        <span aria-hidden className="shrink-0 text-muted">
          <ChevronDown />
        </span>
      </button>
      {chosen && (
        <button
          type="button"
          onClick={onClear}
          aria-label={`Clear state, show ${noun} in all states`}
          className="flex w-12 shrink-0 items-center justify-center border-s"
          style={{
            borderColor: "color-mix(in srgb, var(--ws-ink) 25%, var(--color-rule))",
            color: "var(--ws-ink)",
          }}
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
