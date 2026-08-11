"use client";

import { CheckIcon, FilterIcon } from "@/components/shell/icons";
import { contentLang } from "@/lib/script";
import { Chip } from "./Segmented";

/**
 * Filtering, as the comps draw it: a button that says how many filters are on,
 * a row of what they are, and a sheet to change them.
 *
 * The sheet itself is not here. The two in the comps — Audio/Video's topic +
 * year + sort, and the highlights' chapter picker — share a frame and nothing
 * else, so what is shared is `ui/Sheet` plus the section furniture below, and
 * each screen composes its own body. A `FilterSheet` taking a schema of axes
 * would be a small language nobody but us speaks, and the third filter would
 * not fit it.
 */

/**
 * The button beside the search box.
 *
 * It changes colour when filters are on, and carries the count. Both, not
 * either: the count is the fact, and the tint is what makes a reader notice
 * the count without reading it — which matters because the commonest confusion
 * on a filtered shelf is not knowing why so little is there.
 */
export function FilterButton({
  count = 0,
  onClick,
}: {
  count?: number;
  onClick: () => void;
}) {
  const on = count > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={on ? `Filters, ${count} applied` : "Filters"}
      className="flex min-h-12 shrink-0 items-center gap-2 rounded-2xl border px-4 text-sm font-medium transition-colors"
      style={
        on
          ? {
              borderColor: "var(--ws-ink)",
              background: "color-mix(in srgb, var(--ws-color) 10%, var(--color-card))",
              color: "var(--ws-ink)",
            }
          : { borderColor: "var(--color-rule)", background: "var(--color-card)" }
      }
    >
      <FilterIcon className="h-4 w-4" />
      Filters
      {on && (
        <span
          aria-hidden
          className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold tabular-nums text-white"
          style={{ background: "var(--ws-color)" }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/** The search box and the Filters button, on one row that survives the largest
 *  text size — the button keeps its width and the box gives. */
export function FindRow({
  search,
  filters,
}: {
  search: React.ReactNode;
  filters?: React.ReactNode;
}) {
  return (
    <div className="flex items-stretch gap-2.5">
      <div className="min-w-0 flex-1">{search}</div>
      {filters}
    </div>
  );
}

/**
 * What is currently on, and the one control that turns it all off.
 *
 * Below the results count rather than above it, as drawn, because the count is
 * the answer to the question the chips ask.
 */
export function ActiveFilters({
  items,
  onClear,
}: {
  items: { key: string; label: string; onRemove: () => void }[];
  onClear: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
      {items.map((i) => (
        <Chip key={i.key} label={i.label} selected variant="tint" onRemove={i.onRemove} />
      ))}
      <button
        type="button"
        onClick={onClear}
        className="min-h-11 shrink-0 px-1 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
      >
        Clear
      </button>
    </div>
  );
}

/** One axis inside a filter sheet — an icon, what it filters, and where it
 *  currently stands ("2 selected", "1997–2013"). */
export function FilterSection({
  icon,
  label,
  status,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  status?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-rule px-5 py-5 last:border-b-0">
      <div className="mb-3 flex items-center gap-2">
        <span aria-hidden style={{ color: "var(--ws-ink)" }}>
          {icon}
        </span>
        <h3 className="flex-1 text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
          {label}
        </h3>
        {status && (
          <span className="text-sm font-semibold" style={{ color: "var(--ws-ink)" }}>
            {status}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

/** Exactly one of these — the sort order. A ruled list rather than chips,
 *  because chips say "combine these" and a sort cannot be combined. */
export function RadioList<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col">
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`flex min-h-14 items-center gap-3 text-start text-title ${
              i > 0 ? "border-t border-rule" : ""
            } ${active ? "font-semibold" : ""}`}
          >
            <span
              aria-hidden
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2"
              style={{
                borderColor: active ? "var(--ws-color)" : "var(--color-rule)",
              }}
            >
              {active && (
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: "var(--ws-color)" }}
                />
              )}
            </span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A tickable row — the chapter picker. Bigger than a chip because each row
 * carries a second line ("1 हाइलाइट · 1 नोट"), and a row that says nothing is
 * shown as unavailable rather than hidden: a chapter with no highlights is an
 * answer to "where are my highlights", not an absence.
 */
export function CheckRow({
  label,
  meta,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  meta?: React.ReactNode;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  const l = contentLang(label);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-16 w-full items-center gap-3.5 rounded-card px-3 text-start transition-colors disabled:opacity-45"
      style={
        checked
          ? { background: "color-mix(in srgb, var(--ws-color) 8%, var(--color-card))" }
          : undefined
      }
    >
      <span
        aria-hidden
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-chip border-2 text-white"
        style={
          checked
            ? { background: "var(--ws-color)", borderColor: "var(--ws-color)" }
            : { borderColor: "var(--color-rule)" }
        }
      >
        {checked && <CheckIcon className="h-4 w-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span {...l} className={`${l.className} block text-title font-semibold leading-snug`}>
          {label}
        </span>
        {meta && (
          <span
            className="mt-0.5 block text-sm"
            style={{ color: checked ? "var(--ws-ink)" : "var(--color-ink-soft)" }}
          >
            {meta}
          </span>
        )}
      </span>
    </button>
  );
}
