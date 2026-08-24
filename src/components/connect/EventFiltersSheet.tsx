"use client";

import { useEffect, useState } from "react";
import { PinIcon } from "@/components/shell/icons";
import { useWorkspace } from "@/components/shell/WorkspaceProvider";
import { Chip, Sheet, SheetAction, SheetTextAction } from "@/components/ui";
import { getEventFilters, getEvents } from "@/lib/api";
import {
  categoryStyle,
  EMPTY_EVENT_FILTERS,
  hasFilters,
  type EventBucket,
  type EventFilterOptions,
  type EventFilterState,
} from "@/lib/events";

/**
 * The filter sheet.
 *
 * Three things about it come from the contract rather than from taste:
 *
 * 1. **The chips are built from the API.** The A–G categories are a table the
 *    panel owns — renamed, recoloured, retired or added to without a deploy —
 *    so seven chips written down here would be seven chips that stop being
 *    true. Languages the same.
 * 2. **The options are read fresh each time the sheet opens**, and re-read as
 *    the pending selection changes: each option is counted with *its own*
 *    filter dropped, which is what lets an unselected category still be worth
 *    tapping while the category filter sits on something else.
 * 3. **"Show N events" is the list's own count**, fetched by asking `events/`
 *    with the pending filters and reading `counts[bucket]`. Counting it here
 *    would be a second implementation of the same question.
 *
 * The counts are not printed on the chips, as drawn — the footer counts the
 * whole find live instead, and it re-counts on every tap, which is the number
 * the reader is actually deciding with.
 */

/** One axis. No icon: the comps head these with the label alone, and this is
 *  the only sheet in the app drawn that way. */
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-rule px-5 py-5 last:border-b-0">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
        {label}
      </h3>
      {children}
    </section>
  );
}

/**
 * A category chip wearing its own colour when it is on.
 *
 * `ui/Chip` cannot do this and should not learn to: every other chip in the
 * app is selected in the *workspace* accent, because that is what selection
 * means there. Here the colour is the category's own identity — the same hue
 * the card's stripe and chip carry — so a selected chip lighting up in
 * terracotta would say "Connect" where the comp says "Adhyayan Abhyas".
 *
 * Selection is not colour alone: the ring and the weight carry it too, and
 * `aria-pressed` carries it for anyone not looking.
 */
function CategoryChip({
  category,
  selected,
  onToggle,
}: {
  category: EventFilterOptions["categories"][number];
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={`inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 text-sm transition-colors ${
        selected ? "font-semibold" : "border-rule bg-card font-medium text-ink"
      }`}
      style={
        selected
          ? {
              ...categoryStyle(category.accent),
              borderColor: "var(--cat-ink)",
              background: "var(--cat-tint)",
              color: "var(--cat-ink)",
            }
          : undefined
      }
    >
      {category.display}
    </button>
  );
}

/** The two mode buttons — wide, side by side, and one-of: the API takes a
 *  single `mode`, and tapping the one that is on turns it off. */
function ModeButton({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={`flex min-h-12 flex-1 items-center justify-center rounded-control border px-4 text-sm transition-colors ${
        selected ? "font-semibold" : "border-rule bg-card font-medium text-ink"
      }`}
      style={
        selected
          ? {
              borderColor: "var(--ws-ink)",
              background: "color-mix(in srgb, var(--ws-color) 10%, var(--color-card))",
              color: "var(--ws-ink)",
            }
          : undefined
      }
    >
      {label}
    </button>
  );
}

/**
 * Mounted only while it is open — see `EventsScreen`. That is what makes
 * `useState(applied)` the whole of the reset: a reader who backs out with
 * Escape has not changed their filters, and reopening has to show what is on
 * rather than what they abandoned. The alternative is an effect that copies a
 * prop into state every time the sheet opens, which is a cascade of renders to
 * do what mounting already does.
 */
export function EventFiltersSheet({
  onClose,
  bucket,
  q,
  applied,
  onApply,
}: {
  onClose: () => void;
  bucket: EventBucket;
  /** what is in the search box — the sheet counts under it too, so the
   *  footer's number is the list the reader will actually land on */
  q: string;
  applied: EventFilterState;
  onApply: (f: EventFilterState) => void;
}) {
  // The sheet portals to `document.body` and lands outside the provider's
  // `[data-ws]`, so it has to be told which workspace it belongs to or its
  // footer button and its language chips paint in the app's default terracotta
  // over a blue screen.
  const { workspace } = useWorkspace();
  const [pending, setPending] = useState<EventFilterState>(applied);
  const [options, setOptions] = useState<EventFilterOptions | null>(null);
  const [count, setCount] = useState<number | null>(null);

  // Both requests, on every change to the pending set — the options because
  // each is counted with its own filter dropped, the count because it is the
  // footer's whole job. Debounced together so a run of taps down a row of
  // chips costs one pair of calls rather than six, and aborted on the way out
  // so a slow answer to an abandoned question cannot land after a fresh one.
  useEffect(() => {
    const ac = new AbortController();
    const id = setTimeout(() => {
      const opts = { bucket, q, filters: pending, signal: ac.signal };
      getEventFilters(opts)
        .then(setOptions)
        .catch(() => undefined);
      getEvents(opts)
        .then((r) => setCount(r.counts[bucket] ?? 0))
        .catch(() => undefined);
    }, 180);
    return () => {
      clearTimeout(id);
      ac.abort();
    };
  }, [bucket, q, pending]);

  const toggle = (key: "categories" | "languages", code: string) =>
    setPending((f) => ({
      ...f,
      [key]: f[key].includes(code)
        ? f[key].filter((c) => c !== code)
        : [...f[key], code],
    }));

  const cities = options?.cities ?? [];

  return (
    <Sheet
      open
      onClose={onClose}
      title="Filters"
      accent={workspace.color}
      actions={
        hasFilters(pending) ? (
          <SheetTextAction onClick={() => setPending(EMPTY_EVENT_FILTERS)}>
            Clear all
          </SheetTextAction>
        ) : undefined
      }
      footer={
        <SheetAction
          onClick={() => {
            onApply(pending);
            onClose();
          }}
        >
          {/* Never "Show — events": until the first answer lands the button
              says what it does rather than a number it does not have yet. */}
          {count === null
            ? "Show events"
            : `Show ${count} ${count === 1 ? "event" : "events"}`}
        </SheetAction>
      }
    >
      {options && (
        <>
          {options.categories.length > 0 && (
            <Section label="Shivir category">
              <div className="flex flex-wrap gap-2">
                {options.categories.map((c) => (
                  <CategoryChip
                    key={c.code}
                    category={c}
                    selected={pending.categories.includes(c.code)}
                    onToggle={() => toggle("categories", c.code)}
                  />
                ))}
              </div>
            </Section>
          )}

          {options.languages.length > 0 && (
            <Section label="Language">
              <div className="flex flex-wrap gap-2">
                {options.languages.map((l) => (
                  <Chip
                    key={l.code}
                    label={l.name}
                    variant="tint"
                    selected={pending.languages.includes(l.code)}
                    onClick={() => toggle("languages", l.code)}
                  />
                ))}
              </div>
            </Section>
          )}

          {options.modes.length > 0 && (
            <Section label="Mode">
              <div className="flex gap-3">
                {options.modes.map((m) => (
                  <ModeButton
                    key={m.code}
                    label={m.name}
                    selected={pending.mode === m.code}
                    onToggle={() =>
                      setPending((f) => ({ ...f, mode: f.mode === m.code ? "" : m.code }))
                    }
                  />
                ))}
              </div>
            </Section>
          )}

          {/* Drawn only when there is somewhere to choose between. `cities`
              lists only cities that actually have events in this bucket, so an
              empty list means the dropdown would offer nothing but "All". */}
          {cities.length > 0 && (
            <Section label="Location">
              <div className="relative flex items-center rounded-control border border-rule bg-card ps-3.5 pe-3">
                <span aria-hidden className="shrink-0" style={{ color: "var(--ws-ink)" }}>
                  <PinIcon />
                </span>
                <select
                  aria-label="Location"
                  value={pending.city}
                  onChange={(e) => setPending((f) => ({ ...f, city: e.target.value }))}
                  className="ui-hi min-h-12 w-full appearance-none bg-transparent ps-2.5 pe-2 text-base text-ink outline-none"
                >
                  <option value="">All locations</option>
                  {cities.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <span aria-hidden className="shrink-0 text-ink-soft">
                  ⌄
                </span>
              </div>
            </Section>
          )}
        </>
      )}
    </Sheet>
  );
}
