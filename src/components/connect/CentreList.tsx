"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ChevronDown, PinIcon } from "@/components/shell/icons";
import { profileFor } from "@/lib/profile";
import { ALL_STATES, stateButtonLabel, type Centre, type ContactStates } from "@/lib/directory";
import { CentreCard } from "./CentreCard";
import { StateSheet } from "./StateSheet";

/**
 * The centres, with a state to narrow them to (15 Nov 2026, UX audit CN6).
 *
 * The page was one long list in the manager's order — a reader in Gujarat
 * scrolled past every Chhattisgarh centre to find theirs, with no way to jump.
 * The chooser is the one City-wise contacts already has, the same button and
 * the same sheet, so the two halves of Centres work alike. The states are
 * those of the centres themselves, counted, rather than the contacts' list.
 *
 * Starts on the reader's own state when their profile names one that has a
 * centre; otherwise on all of them. Filtered here, not refetched: the server
 * already sent every centre with the page.
 */
export function CentreList({ centres }: { centres: Centre[] }) {
  const { user } = useAuth();
  const states: ContactStates = useMemo(() => {
    const by = new Map<string, { code: string; name: string; count: number }>();
    for (const c of centres) {
      if (!c.state) continue;
      const row = by.get(c.state.code) ?? { ...c.state, count: 0 };
      row.count += 1;
      by.set(c.state.code, row);
    }
    return {
      total: centres.length,
      states: [...by.values()].sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [centres]);

  const [state, setState] = useState<string>(ALL_STATES);
  const [sheetOpen, setSheetOpen] = useState(false);

  // The reader's own state, once, when the profile names one with a centre.
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (started || !user) return;
    setStarted(true);
    const mine = profileFor(user)?.state?.trim().toLowerCase();
    if (!mine) return;
    const hit = states.states.find(
      (s) => s.name.toLowerCase() === mine || s.code.toLowerCase() === mine
    );
    if (hit) setState(hit.code);
  }, [user, started, states]);

  const shown = state === ALL_STATES ? centres : centres.filter((c) => c.state?.code === state);
  const chosen = state !== ALL_STATES;

  return (
    <>
      {states.states.length > 1 && (
        // The contacts tab's chooser, as drawn there.
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
          className="mt-4 flex min-h-14 w-full items-center gap-3 rounded-control border border-rule bg-card px-3.5 text-start lg:mt-8 lg:w-[30rem]"
        >
          <span aria-hidden className="shrink-0" style={{ color: "var(--ws-ink)" }}>
            <PinIcon />
          </span>
          <span
            className={`min-w-0 flex-1 truncate text-base ${chosen ? "font-semibold text-ink" : "text-ink-soft"}`}
          >
            {stateButtonLabel(state, states.states)}
          </span>
          {chosen && <span className="shrink-0 text-sm tabular-nums text-ink-soft">{shown.length}</span>}
          <span aria-hidden className="shrink-0 text-muted">
            <ChevronDown />
          </span>
        </button>
      )}

      {/* Two columns on a desktop, each card as tall as its own content. */}
      <ul className="mt-4 flex flex-col gap-3.5 lg:mt-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        {shown.map((c) => (
          <li key={c.id}>
            <CentreCard centre={c} />
          </li>
        ))}
      </ul>

      {chosen && (
        <button
          type="button"
          onClick={() => setState(ALL_STATES)}
          className="mt-3 flex min-h-11 items-center text-sm font-semibold"
          style={{ color: "var(--ws-ink)" }}
        >
          Show centres in all states
        </button>
      )}

      {sheetOpen && (
        <StateSheet
          onClose={() => setSheetOpen(false)}
          states={states}
          selected={state}
          onSelect={setState}
        />
      )}
    </>
  );
}
