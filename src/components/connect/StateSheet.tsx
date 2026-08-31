"use client";

import { useRef, useState } from "react";
import { CheckIcon, PinIcon } from "@/components/shell/icons";
import { useWorkspace } from "@/components/shell/WorkspaceProvider";
import { SearchField } from "@/components/SearchField";
import { Sheet, SheetTextAction } from "@/components/ui";
import { ALL_STATES, type ContactStates } from "@/lib/directory";

/**
 * "Choose a state" — the sheet of comp 11.
 *
 * **The list is the API's, whole.** `contacts/states/` returns only states that
 * actually have somebody in them, so there is no list of Indian states in this
 * app and the sheet can never offer a choice that opens an empty screen. It
 * also carries "Delhi NCR", which is not a state — which is exactly why the
 * list is a panel table and not a constant here.
 *
 * The search box filters what is already in hand rather than asking the server:
 * the whole list is a dozen rows and it arrived with the screen. Every other
 * box in the app is submit-only because it costs a request; this one costs a
 * substring test, so it filters as you type.
 *
 * One-of, and applied on tap: a state is a single value the list is narrowed
 * by, so there is no pending selection to confirm and no footer button. "All
 * states" sits where "Clear all" sits on the filter sheet, because that is what
 * it is.
 */
export function StateSheet({
  onClose,
  states,
  selected,
  onSelect,
}: {
  onClose: () => void;
  states: ContactStates;
  selected: string;
  onSelect: (code: string) => void;
}) {
  // A sheet portals to `document.body`, outside the provider's `[data-ws]`, so
  // it has to be handed the workspace colour or its accents paint in the app's
  // default terracotta over a blue screen.
  const { workspace } = useWorkspace();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const rows = q
    ? states.states.filter((s) => s.name.toLowerCase().includes(q))
    : states.states;

  const choose = (code: string) => {
    onSelect(code);
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Choose a state"
      accent={workspace.color}
      actions={
        selected !== ALL_STATES ? (
          <SheetTextAction onClick={() => choose(ALL_STATES)}>All states</SheetTextAction>
        ) : undefined
      }
    >
      <div className="px-5 pb-2 pt-1">
        <SearchField
          inputRef={inputRef}
          value={query}
          onChange={setQuery}
          // Filtering is local, so there is nothing to submit and nothing to
          // wait for — Enter simply keeps the list as it is.
          onSubmit={() => undefined}
          onClear={() => setQuery("")}
          placeholder="Search states…"
          label="Search states"
        />
      </div>

      <ul className="px-5 pb-5">
        {rows.map((s) => {
          const on = s.code === selected;
          return (
            <li key={s.code} className="border-b border-rule last:border-b-0">
              <button
                type="button"
                onClick={() => choose(s.code)}
                aria-pressed={on}
                className="flex min-h-12 w-full items-center gap-3 text-start text-base"
                style={on ? { color: "var(--ws-ink)" } : undefined}
              >
                <span className={`min-w-0 flex-1 truncate ${on ? "font-semibold" : ""}`}>
                  {s.name}
                </span>
                {/* The count is what makes this list worth reading: it says
                    which states have people in them before the reader spends a
                    tap finding out. */}
                <span className="shrink-0 text-sm tabular-nums text-ink-soft">{s.count}</span>
                {/* Selection is not the tint alone — the check carries it for
                    anyone not looking at colour, and `aria-pressed` for anyone
                    not looking at all. */}
                <span aria-hidden className="w-5 shrink-0">
                  {on && <CheckIcon className="h-5 w-5" />}
                </span>
              </button>
            </li>
          );
        })}
        {rows.length === 0 && (
          <li className="flex min-h-12 items-center gap-2 text-sm text-ink-soft">
            <span aria-hidden className="text-muted">
              <PinIcon className="h-4 w-4" />
            </span>
            No state matches “{query.trim()}”.
          </li>
        )}
      </ul>
    </Sheet>
  );
}
