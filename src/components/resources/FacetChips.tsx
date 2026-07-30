import Link from "next/link";
import { FILTERABLE_KINDS, KIND_HI } from "@/components/resources/format";
import type { ResourceCollection, ResourceFacet } from "@/lib/types";

/**
 * The facet chips inside a door, in the spec's order:
 * **विषय → वर्ष → स्थान → व्यक्ति → भाषा → प्रकार**.
 *
 * प्रकार is last deliberately. "सिर्फ़ audio दिखाओ, चलते-फिरते सुनना है" is a
 * real need — but it is never the first question a seeker asks, and putting a
 * format filter first turns a library back into a file browser.
 *
 * Only विषय comes from a table (manager-editable, never hardcoded). The other
 * five are *derived from the collections the door actually holds*: there is no
 * facet-values endpoint, and a year or a place that nothing is filed under is
 * a chip that can only disappoint.
 */
export type FacetAxis = "topic" | "year" | "place" | "person" | "language" | "kind";

export type FacetSelection = Partial<Record<FacetAxis, string>>;

interface Chip {
  value: string;
  label: string;
  count: number;
}

const AXIS_HI: Record<FacetAxis, string> = {
  topic: "विषय",
  year: "वर्ष",
  place: "स्थान",
  person: "व्यक्ति",
  language: "भाषा",
  kind: "प्रकार",
};

/** the axes below विषय — folded away until asked for, on a phone-first shelf */
export const SECONDARY_AXES: FacetAxis[] = ["year", "place", "person", "language", "kind"];

function href(basePath: string, selection: FacetSelection, axis?: FacetAxis, value?: string) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(selection)) {
    if (v && k !== axis) p.set(k, v);
  }
  if (axis && value) p.set(axis, value);
  const s = p.toString();
  return s ? `${basePath}?${s}` : basePath;
}

/** every distinct value of one axis across a door's collections, with counts */
export function facetOptions(
  collections: ResourceCollection[],
  axis: FacetAxis,
  topics: ResourceFacet[]
): Chip[] {
  const counts = new Map<string, { label: string; count: number }>();
  const bump = (value: string, label: string) => {
    if (!value) return;
    const row = counts.get(value) ?? { label, count: 0 };
    row.count += 1;
    counts.set(value, row);
  };

  for (const c of collections) {
    switch (axis) {
      case "topic":
        for (const code of c.topics) {
          bump(code, topics.find((t) => t.code === code)?.name_hi ?? code);
        }
        break;
      case "year":
        // `2005-03` is filed under 2005: the filter is a prefix match, and a
        // chip per month would shatter one shivir season into three.
        bump(c.year.slice(0, 4), c.year.slice(0, 4));
        break;
      case "place":
        bump(c.place, c.place);
        break;
      case "person":
        // `people` is one comma-separated field, not a list — a card naming
        // two speakers has to reach both of their chips.
        for (const p of c.people.split(",").map((s) => s.trim())) bump(p, p);
        break;
      case "language":
        bump(c.language, c.language_label || c.language);
        break;
      case "kind":
        for (const k of c.kinds) {
          if (FILTERABLE_KINDS.includes(k)) bump(k, KIND_HI[k]);
        }
        break;
    }
  }

  const chips = [...counts].map(([value, { label, count }]) => ({ value, label, count }));
  if (axis === "topic") {
    // विषय keeps the manager's own ordering; the rest have none to keep.
    const order = new Map(topics.map((t, i) => [t.code, t.ordering ?? i]));
    return chips.sort((a, b) => (order.get(a.value) ?? 999) - (order.get(b.value) ?? 999));
  }
  if (axis === "year") return chips.sort((a, b) => b.value.localeCompare(a.value));
  if (axis === "kind") {
    return chips.sort(
      (a, b) =>
        FILTERABLE_KINDS.indexOf(a.value as never) - FILTERABLE_KINDS.indexOf(b.value as never)
    );
  }
  return chips.sort((a, b) => a.label.localeCompare(b.label, "hi"));
}

export function FacetRow({
  axis,
  options,
  selection,
  basePath,
}: {
  axis: FacetAxis;
  options: Chip[];
  selection: FacetSelection;
  basePath: string;
}) {
  // Nothing to choose between: one option filters away nothing, so the row is
  // an instruction to press a button that changes nothing.
  if (options.length < 2) return null;
  const active = selection[axis];

  return (
    <div className="flex items-start gap-2 py-1.5">
      <span
        lang="hi"
        className="hi w-14 shrink-0 pt-1 text-[11px] font-bold uppercase tracking-wide text-ink-soft"
      >
        {AXIS_HI[axis]}
      </span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={AXIS_HI[axis]}>
        {options.map((o) => {
          const selected = active === o.value;
          return (
            <Link
              key={o.value}
              // Tapping the selected chip clears this axis, which is the only
              // way back out of a facet on a phone without a second control.
              href={
                selected
                  ? href(basePath, selection, axis)
                  : href(basePath, selection, axis, o.value)
              }
              aria-current={selected ? "true" : undefined}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                selected ? "border-transparent text-white" : "border-rule bg-white text-ink"
              }`}
              style={selected ? { background: "var(--ws-color)" } : undefined}
            >
              <span lang="hi" className="hi">
                {o.label}
              </span>
              <span className="ms-1 tabular-nums opacity-70">{o.count}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** "साफ़ करें" — one tap back to the whole door. */
export function ClearFilters({
  basePath,
  selection,
}: {
  basePath: string;
  selection: FacetSelection;
}) {
  const active = Object.values(selection).filter(Boolean).length;
  if (active === 0) return null;
  return (
    <Link
      href={basePath}
      className="text-xs font-semibold underline underline-offset-2"
      style={{ color: "var(--ws-ink)" }}
    >
      <span lang="hi" className="hi">साफ़ करें</span> · Clear {active}
    </Link>
  );
}
