"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, PinIcon } from "@/components/shell/icons";
import { EmptyState, ErrorState } from "@/components/ui";
import { getContacts } from "@/lib/api";
import {
  ALL_STATES,
  stateButtonLabel,
  type ContactStates,
  type DirectoryContact,
} from "@/lib/directory";
import { ContactCard } from "./ContactCard";
import { StateSheet } from "./StateSheet";

/**
 * City-wise contacts — comps 10 and 11.
 *
 * One control and one list. The control is the state chooser; everything below
 * it is the answer to it.
 *
 * **The state list and the contacts are two calls, and only one of them is
 * repeated.** The states arrive once with the page — they are a short table and
 * they do not change while a reader is standing here — and the contacts are
 * refetched as the state changes. Filtering the first list client-side instead
 * would work today and stop working the day the directory has three hundred
 * people in it, which is what a directory is for.
 *
 * The page hands over the prerendered "all states" list, so arriving costs no
 * request; the first refetch is the reader's first choice.
 */
export function ContactsScreen({
  initial,
  states,
}: {
  initial: DirectoryContact[];
  states: ContactStates;
}) {
  const [state, setState] = useState<string>(ALL_STATES);
  const [rows, setRows] = useState<DirectoryContact[]>(initial);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    // The server already answered this exact question — asking again on mount
    // would be one wasted round trip on arrival.
    if (first.current) {
      first.current = false;
      return;
    }
    const ac = new AbortController();
    setPending(true);
    getContacts({ state, signal: ac.signal })
      .then((r) => {
        setRows(r);
        setFailed(false);
      })
      .catch((e) => {
        if ((e as Error)?.name !== "AbortError") setFailed(true);
      })
      .finally(() => setPending(false));
    return () => ac.abort();
  }, [state]);

  const chosen = state !== ALL_STATES;

  return (
    <div>
      {/* The chooser looks like the comps' select and is a button, because what
          it opens is a sheet with a search box in it — a native `<select>`
          cannot hold one, and a dozen states is where scanning stops being
          enough. */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        aria-haspopup="dialog"
        className="mt-4 flex min-h-14 w-full items-center gap-3 rounded-control border border-rule bg-card px-3.5 text-start"
      >
        <span aria-hidden className="shrink-0" style={{ color: "var(--ws-ink)" }}>
          <PinIcon />
        </span>
        <span
          className={`min-w-0 flex-1 truncate text-base ${
            chosen ? "font-semibold text-ink" : "text-ink-soft"
          }`}
        >
          {stateButtonLabel(state, states.states)}
        </span>
        {chosen && (
          <span className="shrink-0 text-sm tabular-nums text-ink-soft">{rows.length}</span>
        )}
        <span aria-hidden className="shrink-0 text-muted">
          <ChevronDown />
        </span>
      </button>

      <div
        className={`mt-3.5 transition-opacity ${pending ? "opacity-60" : ""}`}
        aria-busy={pending}
      >
        {failed ? (
          <ErrorState />
        ) : rows.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {rows.map((c) => (
              <li key={c.id}>
                <ContactCard contact={c} />
              </li>
            ))}
          </ul>
        ) : chosen ? (
          // Reachable only by the reader's own choice, so it carries the way
          // back out. It should be rare: the sheet lists only states that have
          // somebody, and a state emptied since the page loaded is the one case
          // that gets here.
          <EmptyState
            title="Nobody listed in this state yet"
            hint={
              <button
                type="button"
                onClick={() => setState(ALL_STATES)}
                className="min-h-11 font-semibold underline underline-offset-2"
                style={{ color: "var(--ws-ink)" }}
              >
                Show all states
              </button>
            }
          />
        ) : (
          <EmptyState
            title="No contacts listed yet"
            hint="People to meet in each city will appear here."
          />
        )}
      </div>

      {/* Mounted only while open, so the search box inside it starts empty
          every time and there is no effect resetting it. */}
      {sheetOpen && (
        <StateSheet
          onClose={() => setSheetOpen(false)}
          states={states}
          selected={state}
          onSelect={setState}
        />
      )}
    </div>
  );
}
