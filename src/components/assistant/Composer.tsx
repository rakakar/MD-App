"use client";

import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { ChevronDown, CloseIcon } from "@/components/shell/icons";
import type { Destination } from "@/lib/assistant/destinations";
import { APP_ACCENT } from "@/lib/workspaceConfig";
import { ArrowGlyph, ArrowUpIcon, EnterIcon, MicIcon } from "./icons";

export type InputLang = "hi" | "en";

/** The chosen answer, shown as a pill inside the box — one tap clears it. */
export interface ComposerPill {
  label: string;
  onClear: () => void;
  /**
   * A second control beside the pill, for a mode with a setting of its own —
   * Book search's "All books ▾", which opens the book picker.
   */
  option?: { label: string; hindi?: boolean; onClick: () => void };
}

/**
 * The box at the foot of the Assistant, standing on the tab bar.
 *
 * No हिं·EN switch, though the comps draw one (removed 18 Sep at the
 * designer's call). Roman letters are always read as Hindi — "anubhav" is
 * searched as अनुभव — and Book search's own "search as typed" link is the way
 * back for the rare English word. The microphone has its own language choice.
 *
 * The command list opens only once what is typed reads as a command ("open…",
 * "resume…"), so a reader typing a word to look up never gets a menu over the
 * keyboard. Enter takes the highlighted command; arrows move it.
 */
export function Composer({
  inputRef,
  value,
  onChange,
  onSubmit,
  placeholder,
  commands,
  onCommand,
  canListen,
  onListen,
  pill,
  above,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  commands: Destination[];
  onCommand: (d: Destination) => void;
  canListen: boolean;
  onListen: () => void;
  pill?: ComposerPill | null;
  /**
   * What stands directly on the box — the landing's title, chips and help
   * line. Inside the same fixed block, so it rides up with the keyboard and
   * the chips stay where the thumb already is.
   */
  above?: ReactNode;
}) {
  const [hi, setHi] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const showCommands = commands.length > 0 && !dismissed;
  const ready = value.trim().length > 0;
  /** lit once there is something to ask, or a mode waiting for its words */
  const lit = ready || !!pill;
  /** the label on screen — kept after clearing, while the row closes */
  const [shownPill, setShownPill] = useState(pill?.label ?? "");
  if (pill && pill.label !== shownPill) setShownPill(pill.label);

  useEffect(() => {
    setHi(0);
    setDismissed(false);
  }, [commands.map((c) => c.id).join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="fixed inset-x-0 z-30 lg:left-64"
      style={{ bottom: "var(--bottom-nav-h, 0px)" }}
    >
      {above}
      <div className="border-t border-rule bg-surface">
      <div className="mx-auto max-w-3xl px-4 pb-3 pt-3 sm:px-6">
        {showCommands && (
          <div
            id="assistant-commands"
            role="listbox"
            aria-label="Commands"
            className="mb-3 overflow-hidden rounded-card border border-rule bg-card shadow-raised"
          >
            <p className="px-5 pb-1 pt-3 text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
              Commands
            </p>
            {commands.map((c, i) => {
              const [verb, ...rest] = (c.command ?? "").split(" ");
              return (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={i === hi}
                  onMouseEnter={() => setHi(i)}
                  onClick={() => onCommand(c)}
                  className="flex min-h-12 w-full items-center gap-3 px-5 text-left text-base"
                  style={
                    i === hi
                      ? { background: "color-mix(in srgb, var(--color-accent) 9%, var(--color-card))" }
                      : undefined
                  }
                >
                  <span style={{ color: i === hi ? "var(--color-accent-deep)" : "var(--color-ink-soft)" }}>
                    <ArrowGlyph className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-bold">{verb}</span> {rest.join(" ")}
                  </span>
                  {i === hi && (
                    <span className="rounded-md border border-rule px-1.5 py-0.5 text-ink-soft" aria-hidden>
                      <EnterIcon className="h-4 w-4" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <form
          className="flex items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (showCommands) onCommand(commands[hi]);
            else if (ready) onSubmit();
          }}
        >
          {/*
            The box grows to take the pill rather than snapping to a new shape.
            The pill's row opens on a 0fr → 1fr grid track, and the corner eases
            from a full round (28px on a 56px box) to the card's 20px, so the
            landing above — which stands on this box — rises with it instead of
            jumping. The last label is held while the row closes, so the pill
            does not vanish before it has finished leaving.
          */}
          <div
            className={`min-w-0 flex-1 border bg-card pr-2 transition-[border-color,border-radius,box-shadow,padding] ${pill ? "pl-3" : "pl-5"} duration-300 ease-out focus-within:border-(--color-accent-deep)`}
            style={{
              borderRadius: pill ? 20 : 28,
              borderColor: lit ? "color-mix(in srgb, var(--color-accent-deep) 45%, var(--color-rule))" : "var(--color-rule)",
              boxShadow: pill
                ? "0 0 0 4px color-mix(in srgb, var(--color-accent) 10%, transparent)"
                : "0 0 0 0 transparent",
            }}
          >
            <div
              className="grid transition-[grid-template-rows,opacity] duration-300 ease-out"
              style={{ gridTemplateRows: pill ? "1fr" : "0fr", opacity: pill ? 1 : 0 }}
              inert={!pill || undefined}
            >
              <div className="flex min-h-0 items-center gap-1.5 overflow-hidden">
                <button
                  type="button"
                  onClick={pill?.onClear}
                  aria-label={`${shownPill} chosen — clear`}
                  className="mt-3 inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full border pl-3 pr-2 text-sm font-semibold"
                  style={{
                    borderColor: "color-mix(in srgb, var(--color-accent) 30%, transparent)",
                    background: "color-mix(in srgb, var(--color-accent) 14%, var(--color-card))",
                    color: "var(--color-accent-deep)",
                  }}
                >
                  {shownPill}
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
                {pill?.option && (
                  <button
                    type="button"
                    onClick={pill.option.onClick}
                    aria-haspopup="dialog"
                    aria-label={`Books to search: ${pill.option.label}. Change`}
                    className="mt-3 inline-flex min-h-9 min-w-0 items-center gap-0.5 rounded-full border border-rule bg-card pl-3 pr-2 text-sm font-semibold text-ink"
                  >
                    <span
                      lang={pill.option.hindi ? "hi" : undefined}
                      className={`${pill.option.hindi ? "hi-note" : ""} truncate`}
                    >
                      {pill.option.label}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-soft" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex min-h-14 items-center gap-2">
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                // Enter is handled here rather than left to the form's implicit
                // submit, so the Enter that *commits* a Devanagari IME word
                // (isComposing) is never mistaken for "ask".
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  if (showCommands) onCommand(commands[hi]);
                  else if (ready) onSubmit();
                  return;
                }
                if (!showCommands) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHi((i) => (i + 1) % commands.length);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHi((i) => (i - 1 + commands.length) % commands.length);
                } else if (e.key === "Escape") {
                  setDismissed(true);
                }
              }}
              placeholder={placeholder}
              aria-label={placeholder}
              aria-controls={showCommands ? "assistant-commands" : undefined}
              aria-expanded={showCommands}
              role="combobox"
              aria-autocomplete="list"
              enterKeyHint="send"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent py-3 text-base outline-none placeholder:text-ink-soft"
            />
            {canListen && (
              <button
                type="button"
                onClick={onListen}
                aria-label="Speak instead of typing"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-inset text-ink-soft"
              >
                <MicIcon className="h-5 w-5" />
              </button>
            )}
            </div>
          </div>
          <button
            type="submit"
            aria-label="Ask"
            aria-disabled={!ready}
            onClick={(e) => {
              // A chosen mode lights the button before anything is typed, as
              // drawn; pressing it then is a nudge to type, not a request.
              if (!ready) {
                e.preventDefault();
                inputRef.current?.focus();
              }
            }}
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-colors ${
              lit ? "text-white shadow-card" : "text-ink-soft"
            }`}
            style={{ background: lit ? APP_ACCENT : "var(--color-rule)" }}
          >
            <ArrowUpIcon className="h-5 w-5" />
          </button>
        </form>
      </div>
      </div>
    </div>
  );
}
