"use client";

import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { CloseIcon } from "@/components/shell/icons";
import type { Destination } from "@/lib/assistant/destinations";
import { APP_ACCENT } from "@/lib/workspaceConfig";
import { ArrowGlyph, ArrowUpIcon, EnterIcon, MicIcon } from "./icons";

export type InputLang = "hi" | "en";

/** The chosen answer, shown as a pill inside the box — one tap clears it. */
export interface ComposerPill {
  label: string;
  onClear: () => void;
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
          <div
            className={`min-w-0 flex-1 border bg-card transition-colors focus-within:border-(--color-accent-deep) ${
              pill ? "rounded-card pb-1 pl-4 pr-2 pt-3" : "rounded-full pl-5 pr-2"
            }`}
            style={{
              borderColor: lit ? "color-mix(in srgb, var(--color-accent-deep) 45%, var(--color-rule))" : "var(--color-rule)",
              boxShadow: pill ? "0 0 0 4px color-mix(in srgb, var(--color-accent) 10%, transparent)" : undefined,
            }}
          >
            {pill && (
              <button
                type="button"
                onClick={pill.onClear}
                aria-label={`${pill.label} chosen — clear`}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold"
                style={{
                  borderColor: "color-mix(in srgb, var(--color-accent) 30%, transparent)",
                  background: "color-mix(in srgb, var(--color-accent) 14%, var(--color-card))",
                  color: "var(--color-accent-deep)",
                }}
              >
                {pill.label}
                <CloseIcon className="h-3.5 w-3.5" />
              </button>
            )}
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
