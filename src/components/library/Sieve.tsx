import Link from "next/link";
import { KIND_HI } from "@/components/library/format";
import { provenanceLabel } from "@/components/library/ProvenanceBadge";
import { ChevronDown, FilterIcon } from "@/components/shell/icons";
import {
  FIND_AXES,
  chipCount,
  findHref,
  isChipOn,
  toggleChip,
  type FindAxis,
  type FindState,
} from "@/lib/find";
import type { FacetValue, FileKind, LibraryFacets, Provenance } from "@/lib/types";

/**
 * The **sieve** — प्रमाण · वर्ष · स्थान · व्यक्ति · भाषा · प्रकार over the whole
 * scope the reader is looking at (contract §13.4).
 *
 * Not to be confused with विषय, which sits above it and is a different kind of
 * control entirely: a विषय chip is a *door* onto the whole library and tapping
 * it leaves this folder, while these narrow what is on screen and tapping one
 * stays put.
 *
 * **The chips moved to the server on 2026-08-03, and they changed meaning when
 * they moved.** They used to be derived from the children the FE already held,
 * which made them a filter over *one level*: standing on a shelf root, the वर्ष
 * chip could only see the top-level doors, so a 2019 recording three levels
 * down was unreachable, and the प्रकार row — built from `kinds`, which counts a
 * folder's **direct** files — did not render at all, because a shelf root holds
 * doors and not files. The chips said "filter this shelf" and meant "filter
 * this level". They now come from `facets` on §13.8, counted over the whole
 * workspace or the whole subtree, so a chip opens what it promised.
 *
 * Two things follow from that and are worth stating where they are drawn.
 * **Counts narrow**: each axis is counted with every *other* active chip
 * applied but not its own, so a count always predicts what the tap yields while
 * the axis you are already inside stays switchable. And **tapping a chip
 * switches the page from a browse to a find** — deep, ranked, a breadcrumb on
 * every row — which is exactly what "filter this shelf" always meant.
 */
export const AXIS_HI: Record<FindAxis, string> = {
  provenance: "प्रमाण",
  year: "वर्ष",
  place: "स्थान",
  person: "व्यक्ति",
  language: "भाषा",
  kind: "प्रकार",
};

/**
 * What the chip says.
 *
 * The endpoint labels every value, but §13.8 is explicit that this is a
 * courtesy rather than an instruction: प्रमाण and प्रकार already have Hindi
 * here — and the BE's own provenance labels are long English admin strings —
 * so those two keep the FE's words. Everything else is either already a name
 * (a place, a person, a year) or a ready-made language label.
 */
export function chipLabel(axis: FindAxis, chip: FacetValue): string {
  if (axis === "provenance") {
    return provenanceLabel(chip.value as Provenance)?.label ?? chip.value;
  }
  if (axis === "kind") return KIND_HI[chip.value as FileKind] ?? chip.value;
  return chip.label || chip.value;
}

function SieveRow({
  axis,
  options,
  state,
  basePath,
}: {
  axis: FindAxis;
  options: FacetValue[];
  state: FindState;
  basePath: string;
}) {
  // Nothing to choose between: one option narrows nothing, so the row would be
  // an instruction to press a button that changes nothing. It stays on screen
  // once it is in use, however narrow the scope has become, so a shared link
  // never hides the control that produced what is on it.
  const inUse = (state.selection[axis]?.length ?? 0) > 0;
  if (options.length < 2 && !inUse) return null;

  return (
    <div className="flex items-start gap-2 py-1.5">
      <span
        lang="hi"
        className="hi w-14 shrink-0 pt-1 text-[11px] font-bold uppercase tracking-wide text-ink-soft"
      >
        {AXIS_HI[axis]}
      </span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={AXIS_HI[axis]}>
        {options.map((chip) => {
          const selected = isChipOn(state, axis, chip.value);
          return (
            <Link
              key={chip.value}
              // Tapping a lit chip clears it — the only way back out of one on
              // a phone without a second control beside every row.
              href={findHref(basePath, toggleChip(state, axis, chip.value))}
              aria-current={selected ? "true" : undefined}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                selected ? "border-transparent text-white" : "border-rule bg-white text-ink"
              }`}
              style={selected ? { background: "var(--ws-color)" } : undefined}
            >
              <span lang="hi" className="hi">
                {chipLabel(axis, chip)}
              </span>
              <span className="ms-1 tabular-nums opacity-70">{chip.count}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** "साफ़ करें" — one tap back to the whole shelf, box and chips together. */
export function ClearFind({
  basePath,
  state,
}: {
  basePath: string;
  state: FindState;
}) {
  const active = chipCount(state) + (state.q ? 1 : 0);
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
 * It draws itself only when at least one axis actually offers a choice — a
 * shelf whose material is all from one year, one place and one speaker has six
 * rows of one chip each, which is six rows of nothing.
 *
 * **Folded shut until it is wanted.** Counted over a whole shelf rather than
 * one level, this row of rows got long: seven years, three places and six
 * formats is five hundred pixels of controls, and open by default it pushed the
 * शिविर folders a reader came for off the bottom of a phone. So it is a
 * `<details>` — no JavaScript, no client component, and the browser keeps the
 * state — with the axes named in the summary so the fold advertises what is
 * behind it. It opens by itself whenever a chip is on, because a filtered page
 * must always show the control that filtered it.
 */
export function Sieve({
  facets,
  state,
  basePath,
  hideAxes,
}: {
  facets: LibraryFacets;
  state: FindState;
  basePath: string;
  /**
   * Axes the surface above already offers, so the sieve does not offer them
   * twice. The shelf passes प्रकार when its tiles *are* the formats: tapping
   * the ऑडियो tile and tapping the ऑडियो chip then open the same thing, and
   * two controls for one choice is how a page starts feeling arbitrary.
   *
   * Never hides an axis a reader is currently inside — a filtered page must
   * always show the control that filtered it, and the way back out of a chip
   * on a phone is tapping it again.
   */
  hideAxes?: FindAxis[];
}) {
  const rows = FIND_AXES.map((axis) => ({ axis, options: facets[axis] ?? [] })).filter(
    (row) => {
      if ((state.selection[row.axis]?.length ?? 0) > 0) return true;
      if (hideAxes?.includes(row.axis)) return false;
      return row.options.length > 1;
    }
  );
  if (rows.length === 0) return null;
  const chips = chipCount(state);

  return (
    <details open={chips > 0} className="group mt-3 rounded-2xl border border-rule bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-xs font-semibold text-ink [&::-webkit-details-marker]:hidden">
        <FilterIcon className="h-4 w-4 shrink-0 text-ink-soft" />
        <span lang="hi" className="hi">छाँटें</span>
        <span className="min-w-0 flex-1 truncate font-normal text-ink-soft">
          <span lang="hi" className="hi">
            {rows.map((row) => AXIS_HI[row.axis]).join(" · ")}
          </span>
        </span>
        {chips > 0 && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
            style={{ background: "var(--ws-color)" }}
          >
            {chips}
          </span>
        )}
        <ChevronDown
          aria-hidden
          className="h-4 w-4 shrink-0 text-ink-soft transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="border-t border-rule px-3 py-1.5">
        {rows.map(({ axis, options }) => (
          <SieveRow
            key={axis}
            axis={axis}
            options={options}
            state={state}
            basePath={basePath}
          />
        ))}
      </div>
    </details>
  );
}
