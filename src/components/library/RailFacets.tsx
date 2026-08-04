import Link from "next/link";
import { AXIS_HI, ClearFind, chipLabel } from "./Sieve";
import {
  DocumentIcon,
  FolderIcon,
  HeadphonesIcon,
  ImageIcon,
  VideoIcon,
} from "@/components/shell/icons";
import {
  FIND_AXES,
  findHref,
  isChipOn,
  toggleChip,
  type FindAxis,
  type FindState,
} from "@/lib/find";
import type { FacetValue, FileKind, LibraryFacets, Topic } from "@/lib/types";

/**
 * The shelf's facets **as the left rail draws them** (designer, "Desktop UI").
 *
 * The same controls as the {@link Sieve} and the विषय row, answering the same
 * two questions and writing the same query — a separate component only because
 * a rail and a phone want opposite shapes out of them. In the main column the
 * axes are chip rows behind a fold, because they are competing with the shelf
 * for the fold; here they are permanent chrome 232px wide, where a row per
 * value with its count on the right reads at a glance and a wrapped chip row
 * does not.
 *
 * **The fold does not come along.** `<details open={chips > 0}>` earns its keep
 * in the main column, where five hundred pixels of controls would push the
 * collections off a phone. The rail has nothing below it to push, and a filter
 * a reader has to open before they can see what is filterable is exactly what
 * the rail exists to stop being.
 *
 * **Nor does `hideAxes`.** The shelf suppresses प्रकार when its tiles already
 * *are* the formats, and on मूल ग्रंथ they are — but that rule was about two
 * controls for one choice sitting a thumb-width apart. In the rail they are not
 * near each other and the designer draws both: the tiles are the shelf, and
 * CATEGORY is the standing way to cut it. So the rail asks for every axis.
 */
export function RailFacets({
  facets,
  topics,
  state,
  basePath,
}: {
  facets: LibraryFacets;
  topics: Topic[];
  state: FindState;
  basePath: string;
}) {
  const kinds = facets.kind ?? [];
  // The endpoint returns every axis ranked by count, which is the right order
  // for words and the wrong one for numbers: as chips behind a fold it passes
  // unnoticed, but as a four-wide grid of pills "2013 · 2005 · 1999 · 1997"
  // reads as broken. Newest first, since that is how a reader asks for a
  // shivir. Sorted only here — the phone's chip row is untouched.
  const years = [...(facets.year ?? [])].sort((a, b) => b.value.localeCompare(a.value));
  // प्रकार and वर्ष are drawn where the design puts them; the rest keep their
  // canonical order underneath, so a shelf with places and speakers still
  // offers them rather than losing them to a layout that only knew three.
  const rest = FIND_AXES.filter((axis) => axis !== "kind" && axis !== "year");

  const blocks = [
    kinds.length > 0 && (
      <Axis key="kind" axis="kind" en="Category">
        {kinds.map((chip) => (
          <FacetRow
            key={chip.value}
            href={findHref(basePath, toggleChip(state, "kind", chip.value))}
            label={chipLabel("kind", chip)}
            count={chip.count}
            on={isChipOn(state, "kind", chip.value)}
            icon={<KindIcon kind={chip.value as FileKind} />}
          />
        ))}
      </Axis>
    ),
    years.length > 0 && (
      <Axis key="year" axis="year" en="Years">
        {/* Years are the one axis that is short, ordered and numeric, so they
            tile as pills instead of stacking into a column of near-identical
            rows four words wide. */}
        <div className="flex flex-wrap gap-1.5 px-1">
          {years.map((chip) => {
            const on = isChipOn(state, "year", chip.value);
            return (
              <Link
                key={chip.value}
                href={findHref(basePath, toggleChip(state, "year", chip.value))}
                aria-current={on ? "true" : undefined}
                className={`rounded-full border px-2.5 py-1 text-[11.5px] font-medium tabular-nums transition-colors ${
                  on ? "border-transparent text-white" : "border-rule bg-white text-ink hover:bg-black/[.03]"
                }`}
                style={on ? { background: "var(--ws-color)" } : undefined}
              >
                {chipLabel("year", chip)}
                <span className="ms-1 opacity-70">{chip.count}</span>
              </Link>
            );
          })}
        </div>
      </Axis>
    ),
    ...rest.map((axis) => {
      const options = facets[axis] ?? [];
      // One option narrows nothing — the same rule the sieve applies, and for
      // the same reason: a control that cannot change the page is furniture.
      const inUse = (state.selection[axis]?.length ?? 0) > 0;
      if (options.length < 2 && !inUse) return false;
      return (
        <Axis key={axis} axis={axis} en={AXIS_EN[axis]}>
          {options.map((chip) => (
            <FacetRow
              key={chip.value}
              href={findHref(basePath, toggleChip(state, axis, chip.value))}
              label={chipLabel(axis, chip)}
              count={chip.count}
              on={isChipOn(state, axis, chip.value)}
            />
          ))}
        </Axis>
      );
    }),
    // **Last, because it is the one row here that leaves.** Every block above
    // narrows this shelf and keeps the reader on it; a विषय opens the whole
    // library. Ordering the sieve axes together and putting the door at the
    // foot also buys back the fold: at six topics, वर्ष and स्थान sat below
    // it on an 800px laptop — the two axes with the most useful counts on
    // this shelf, invisible under the one control that navigates away.
    <TopicRows key="topic" topics={topics} facets={facets.topic} />,
  ].filter(Boolean);

  if (blocks.length === 0) return null;

  return (
    <div className="flex flex-col gap-5">
      {/* At the top, not the bottom. The rail runs past the fold on a laptop
          once a shelf has four axes, and "साफ़ करें" is the way *out* of a
          filter — a reader who wants it wants it now, and should never have to
          scroll through the controls that got them here to find it. */}
      <div className="px-1 empty:hidden">
        <ClearFind basePath={basePath} state={state} />
      </div>
      {blocks}
    </div>
  );
}

const AXIS_EN: Record<FindAxis, string> = {
  provenance: "Provenance",
  year: "Years",
  place: "Places",
  person: "People",
  language: "Languages",
  kind: "Category",
};

/**
 * A labelled block in the rail.
 *
 * The heading carries both words — "CATEGORY · प्रकार" — because the rail is
 * the one surface where a label has no row of values beside it to make it
 * obvious, and the nav directly above it is in English.
 */
function Axis({
  axis,
  en,
  children,
}: {
  axis: FindAxis;
  en: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.09em] text-ink-soft">
        {en} ·{" "}
        <span lang="hi" className="hi">
          {AXIS_HI[axis]}
        </span>
      </p>
      {children}
    </section>
  );
}

/** One value: what it is, how much of it there is, and whether it is on. */
function FacetRow({
  href,
  label,
  count,
  on,
  icon,
}: {
  href: string;
  label: string;
  count: number;
  on: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={on ? "true" : undefined}
      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition-colors ${
        on ? "font-semibold" : "text-ink hover:bg-black/[.04]"
      }`}
      style={
        on
          ? {
              background: "color-mix(in srgb, var(--ws-color) 12%, transparent)",
              color: "var(--ws-ink)",
            }
          : undefined
      }
    >
      {icon && <span className="shrink-0 text-ink-soft">{icon}</span>}
      <span lang="hi" className="hi min-w-0 flex-1 truncate">
        {label}
      </span>
      <span className="shrink-0 text-[11px] font-medium tabular-nums text-ink-soft">
        {count}
      </span>
    </Link>
  );
}

function KindIcon({ kind }: { kind: FileKind }) {
  const className = "h-4 w-4";
  if (kind === "audio") return <HeadphonesIcon className={className} />;
  if (kind === "video") return <VideoIcon className={className} />;
  if (kind === "image") return <ImageIcon className={className} />;
  if (kind === "pdf") return <DocumentIcon className={className} />;
  return <FolderIcon className={className} />;
}

/**
 * विषय in the rail — still **doors**, not a sieve.
 *
 * Drawn as the same rows as the axes above them because the designer draws them
 * that way and because at 232px anything else is a second visual language for
 * no gain. What keeps the distinction honest is the note under the heading: a
 * विषय row leaves this shelf for the whole library, while every other row here
 * stays and narrows.
 *
 * Counts come from the facets for the reason given on the shelf's own row —
 * `node_count` counts only what a manager tagged directly, and every axis in
 * this library is inherited, so the two numbers disagree by an order of
 * magnitude. Before the facets arrive there is no honest number and the rows
 * fall back to "used anywhere at all", unnumbered.
 */
function TopicRows({ topics, facets }: { topics: Topic[]; facets?: FacetValue[] }) {
  const counts = new Map((facets ?? []).map((f) => [f.value, f.count]));
  const live = topics
    .map((t) => ({ topic: t, count: counts.get(t.code) ?? 0 }))
    .filter(({ topic, count }) => (facets ? count > 0 : topic.node_count > 0))
    .sort((a, b) => a.topic.ordering - b.topic.ordering);
  if (live.length === 0) return null;

  return (
    <section>
      <p className="px-1 text-[10px] font-bold uppercase tracking-[0.09em] text-ink-soft">
        Topics ·{" "}
        <span lang="hi" className="hi">
          विषय
        </span>
      </p>
      <p lang="hi" className="hi mb-1.5 px-1 text-[10.5px] text-muted">
        पूरी लाइब्रेरी में
      </p>
      {live.map(({ topic, count }) => (
        <Link
          key={topic.code}
          href={`/library?topic=${encodeURIComponent(topic.code)}`}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-ink transition-colors hover:bg-black/[.04]"
        >
          {/* The one taxonomy label a manager types, shown as they typed it. */}
          <span lang="hi" className="hi min-w-0 flex-1 truncate">
            {topic.name}
          </span>
          {count > 0 && (
            <span className="shrink-0 text-[11px] font-medium tabular-nums text-ink-soft">
              {count}
            </span>
          )}
        </Link>
      ))}
    </section>
  );
}
