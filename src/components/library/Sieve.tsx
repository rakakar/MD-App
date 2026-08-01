import Link from "next/link";
import { KIND_HI } from "@/components/library/format";
import { provenanceLabel } from "@/components/library/ProvenanceBadge";
import type { FileKind, NodeCard } from "@/lib/types";

/**
 * The **sieve** — प्रमाण · वर्ष · स्थान · व्यक्ति · भाषा · प्रकार over the
 * folder you are standing in (contract §13.4).
 *
 * Not to be confused with विषय, which sits above it and is a different kind of
 * control entirely: a विषय chip is a *door* onto the whole library and tapping
 * it leaves this folder, while these narrow what is already on screen and
 * tapping one stays put. An earlier draft of the contract listed all six in
 * one row, and they are not one row.
 *
 * Derived from the children in hand and applied here rather than over the
 * network. A folder holds a handful of children, so filtering a handful
 * through a round trip would be a request spent on nothing — and the server
 * filters that used to exist were removed for exactly that reason. They come
 * back with pagination, when the FE can no longer hold a whole folder (§13.2).
 *
 * प्रकार is last on purpose. "सिर्फ़ audio दिखाओ, चलते-फिरते सुनना है" is a
 * real need, but it is never the first question a seeker asks, and a format
 * filter at the top turns a library back into a file browser.
 *
 * प्रमाण (provenance) is first, for the mirror-image reason. "उनका अपना कौन सा
 * है?" is the question this collection exists to be able to answer, and it
 * outranks which year a thing is from. It used to have a page of its own —
 * वाणी, a flat list of everything मूल — but provenance is inherited, so that
 * page could only ever be the मूल branches with their structure flattened out
 * of them. The question is asked *from inside a folder*, so it is answered
 * here, beside the folder it is asked about.
 */
export type SieveAxis = "provenance" | "year" | "place" | "person" | "language" | "kind";

export type SieveSelection = Partial<Record<SieveAxis, string>>;

export const SIEVE_AXES: SieveAxis[] = [
  "provenance", "year", "place", "person", "language", "kind",
];

const AXIS_HI: Record<SieveAxis, string> = {
  provenance: "प्रमाण",
  year: "वर्ष",
  place: "स्थान",
  person: "व्यक्ति",
  language: "भाषा",
  kind: "प्रकार",
};

/** the kinds worth sieving by — nobody goes looking for "a link" or "a file" */
const SIEVE_KINDS: FileKind[] = ["audio", "video", "pdf", "image"];

/** nearest his own word first — the order the badge legend reads in */
const PROVENANCE_ORDER: string[] = ["moola", "sankalan", "adhyayan"];

/**
 * Below this many children, the list *is* the answer: five folders can be read
 * faster than a filter row can be understood, and a sieve above them is chrome
 * charging rent. The contract asks for them only when a folder is wide enough
 * to need them, and this is where that line is drawn.
 */
export const SIEVE_MIN_CHILDREN = 8;

interface Chip {
  value: string;
  label: string;
  count: number;
}

function href(basePath: string, selection: SieveSelection, axis?: SieveAxis, value?: string) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(selection)) {
    if (v && k !== axis) p.set(k, v);
  }
  if (axis && value) p.set(axis, value);
  const s = p.toString();
  return s ? `${basePath}?${s}` : basePath;
}

/** every value one child can be found under, on one axis */
function valuesOf(card: NodeCard, axis: SieveAxis): { value: string; label: string }[] {
  switch (axis) {
    case "provenance": {
      // The card's provenance arrives already resolved through inheritance, so
      // a folder that never stated one still sieves under the branch it
      // belongs to. A blank one is genuinely unjudged and gets no chip — the
      // badge stays silent there too, and a chip would be a judgement nobody
      // made.
      const badge = provenanceLabel(card.provenance);
      return badge ? [{ value: card.provenance, label: badge.label }] : [];
    }
    case "year":
      // `2005-03` files under 2005: a chip per month would shatter one shivir
      // season into three.
      return card.year ? [{ value: card.year.slice(0, 4), label: card.year.slice(0, 4) }] : [];
    case "place":
      return card.place ? [{ value: card.place, label: card.place }] : [];
    case "person":
      // `people` is one comma-separated field, not a list — a folder naming
      // two speakers has to reach both of their chips.
      return card.people
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((p) => ({ value: p, label: p }));
    case "language":
      return card.language
        ? [{ value: card.language, label: card.language_label || card.language }]
        : [];
    case "kind":
      return card.kinds
        .filter((k) => SIEVE_KINDS.includes(k))
        .map((k) => ({ value: k, label: KIND_HI[k] }));
  }
}

/** true when this child answers the whole selection */
export function matchesSieve(card: NodeCard, selection: SieveSelection): boolean {
  return SIEVE_AXES.every((axis) => {
    const want = selection[axis];
    if (!want) return true;
    return valuesOf(card, axis).some((v) => v.value === want);
  });
}

export function applySieve(cards: NodeCard[], selection: SieveSelection): NodeCard[] {
  return cards.filter((c) => matchesSieve(c, selection));
}

/**
 * The chips for one axis, counted across the folder's **whole** set.
 *
 * Deliberately not counted across the filtered set: chips computed from an
 * already narrowed list vanish the moment one is used, so a reader could never
 * widen a choice, only start over.
 */
export function sieveOptions(cards: NodeCard[], axis: SieveAxis): Chip[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const card of cards) {
    for (const { value, label } of valuesOf(card, axis)) {
      const row = counts.get(value) ?? { label, count: 0 };
      row.count += 1;
      counts.set(value, row);
    }
  }
  const chips = [...counts].map(([value, { label, count }]) => ({ value, label, count }));
  if (axis === "year") return chips.sort((a, b) => b.value.localeCompare(a.value));
  if (axis === "provenance") {
    // मूल → संकलन → अध्ययन: nearest his own word first, and the same order the
    // badge legend uses. Alphabetical would put अध्ययन at the top, which reads
    // as a ranking nobody meant.
    return chips.sort(
      (a, b) => PROVENANCE_ORDER.indexOf(a.value) - PROVENANCE_ORDER.indexOf(b.value)
    );
  }
  if (axis === "kind") {
    return chips.sort(
      (a, b) =>
        SIEVE_KINDS.indexOf(a.value as FileKind) - SIEVE_KINDS.indexOf(b.value as FileKind)
    );
  }
  return chips.sort((a, b) => a.label.localeCompare(b.label, "hi"));
}

export function SieveRow({
  axis,
  options,
  selection,
  basePath,
}: {
  axis: SieveAxis;
  options: Chip[];
  selection: SieveSelection;
  basePath: string;
}) {
  // Nothing to choose between: one option narrows nothing, so the row is an
  // instruction to press a button that changes nothing.
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
              // way back out of one on a phone without a second control.
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

/** "साफ़ करें" — one tap back to the whole folder. */
export function ClearSieve({
  basePath,
  selection,
}: {
  basePath: string;
  selection: SieveSelection;
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

/**
 * The whole sieve block, or nothing.
 *
 * It draws itself only when the folder is wide enough to need narrowing *and*
 * at least one axis actually offers a choice — a folder of eight children that
 * are all from one year and one place has five rows of one chip each, which is
 * five rows of nothing.
 */
export function Sieve({
  cards,
  selection,
  basePath,
}: {
  cards: NodeCard[];
  selection: SieveSelection;
  basePath: string;
}) {
  const inUse = SIEVE_AXES.some((axis) => selection[axis]);
  const rows = SIEVE_AXES.map((axis) => ({ axis, options: sieveOptions(cards, axis) })).filter(
    (r) => r.options.length > 1
  );
  // Once a sieve is in use it stays on screen however narrow the folder looks,
  // so a shared link never hides the control that produced what is on screen.
  if (rows.length === 0 || (cards.length < SIEVE_MIN_CHILDREN && !inUse)) return null;

  return (
    <div className="mt-4 rounded-2xl border border-rule bg-white px-3 py-2">
      {rows.map(({ axis, options }) => (
        <SieveRow
          key={axis}
          axis={axis}
          options={options}
          selection={selection}
          basePath={basePath}
        />
      ))}
    </div>
  );
}
