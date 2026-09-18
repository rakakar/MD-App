"use client";

import { useEffect, useState, type RefObject } from "react";
import type { Destination } from "@/lib/assistant/destinations";
import { APP_ACCENT } from "@/lib/workspaceConfig";
import { ArrowGlyph, ArrowUpIcon, EnterIcon, MicIcon } from "./icons";

export type InputLang = "hi" | "en";

/**
 * The box at the foot of the Assistant, standing on the tab bar.
 *
 * **हिं·EN is how Roman letters are read**, not a translation switch. The books
 * are Devanagari, so by default "anubhav" is rewritten to अनुभव before it is
 * searched; EN searches exactly what was typed, for the reader looking for an
 * English word in a bilingual passage. It also picks the language the
 * microphone listens for.
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
  lang,
  onLang,
  commands,
  onCommand,
  canListen,
  onListen,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  lang: InputLang;
  onLang: (l: InputLang) => void;
  commands: Destination[];
  onCommand: (d: Destination) => void;
  canListen: boolean;
  onListen: () => void;
}) {
  const [hi, setHi] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const showCommands = commands.length > 0 && !dismissed;
  const ready = value.trim().length > 0;

  useEffect(() => {
    setHi(0);
    setDismissed(false);
  }, [commands.map((c) => c.id).join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="fixed inset-x-0 z-30 border-t border-rule bg-surface lg:left-64"
      style={{ bottom: "var(--bottom-nav-h, 0px)" }}
    >
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
          className="flex items-center gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (showCommands) onCommand(commands[hi]);
            else if (ready) onSubmit();
          }}
        >
          <div
            className="flex min-h-14 min-w-0 flex-1 items-center gap-2 rounded-full border bg-card pl-5 pr-2 transition-colors focus-within:border-(--color-accent-deep)"
            style={{ borderColor: ready ? "var(--color-accent-deep)" : "var(--color-rule)" }}
          >
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
            <button
              type="button"
              onClick={() => onLang(lang === "hi" ? "en" : "hi")}
              aria-label={
                lang === "hi"
                  ? "Roman letters are read as Hindi. Switch to search as typed"
                  : "Searching exactly as typed. Switch to read Roman letters as Hindi"
              }
              className="inline-flex h-10 shrink-0 items-center rounded-full bg-inset px-3 text-sm"
            >
              <span lang="hi" className={lang === "hi" ? "hi-note font-bold text-ink" : "hi-note text-ink-soft"}>
                हिं
              </span>
              <span className="mx-0.5 text-ink-soft">·</span>
              <span className={lang === "en" ? "font-bold text-ink" : "text-ink-soft"}>EN</span>
            </button>
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
          <button
            type="submit"
            aria-label="Ask"
            disabled={!ready}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white transition-colors disabled:text-ink-soft"
            style={{ background: ready ? APP_ACCENT : "var(--color-rule)" }}
          >
            <ArrowUpIcon className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
