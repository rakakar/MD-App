import Link from "next/link";
import { ClearFind, chipLabel } from "./Sieve";
import { yearBands } from "./years";
import {
  DocumentIcon,
  FolderIcon,
  HeadphonesIcon,
  ImageIcon,
  VideoIcon,
} from "@/components/shell/icons";
import { contentLang } from "@/lib/script";
import {
  FIND_AXES,
  findHref,
  isChipOn,
  toggleChip,
  toggleGroup,
  type FindAxis,
  type FindState,
} from "@/lib/find";
import type { FacetValue, FileKind, LibraryFacets, Topic } from "@/lib/types";

/**
 * The shelf's facets **as the left rail draws them** (designer, "Desktop UI").
 *
 * The same controls as the {@link Sieve} and the Topic row, answering the same
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
 * **Nor does `hideAxes`.** The shelf suppresses Type when its tiles already
 * *are* the formats, and on Originals they are — but that rule was about two
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
  // Newest first, and grouped into ranges once there are more years than a
  // 232px column can hold as pills — the design draws "1998–2000 · 2001–2005"
  // against an archive that runs 1997 to 2015. A band is only a shorthand for
  // the years inside it; nothing below this knows they exist. See `years.ts`.
  const years = yearBands(facets.year);
  // Type and Year are drawn where the design puts them; the rest keep their
  // canonical order underneath, so a shelf with places and speakers still
  // offers them rather than losing them to a layout that only knew three.
  const rest = FIND_AXES.filter((axis) => axis !== "kind" && axis !== "year");

  const blocks = [
    kinds.length > 0 && (
      <Axis key="kind" en="Category">
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
      <Axis key="year" en="Years">
        {/* Years are the one axis that is short, ordered and numeric, so they
            tile as pills instead of stacking into a column of near-identical
            rows four words wide. */}
        <div className="flex flex-wrap gap-1.5 px-1">
          {years.map((band) => {
            const on = band.values.every((v) => isChipOn(state, "year", v));
            return (
              <Link
                key={band.label}
                href={findHref(basePath, toggleGroup(state, "year", band.values))}
                aria-current={on ? "true" : undefined}
                className={`min-h-11 inline-flex items-center rounded-full border px-2.5 text-xs font-medium tabular-nums transition-colors ${
                  on ? "border-transparent text-white" : "border-rule bg-card text-ink hover:bg-ink/[.03]"
                }`}
                style={on ? { background: "var(--ws-color)" } : undefined}
              >
                {band.label}
                <span className="ms-1 opacity-70">{band.count}</span>
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
        <Axis key={axis} en={AXIS_EN[axis]}>
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
    // Last, where the design puts it, and where it stopped costing the fold:
    // at six topics heading the rail, Year and Place sat below the crease on an
    // 800px laptop — the two axes with the most useful counts on this shelf.
    <TopicRows
      key="topic"
      topics={topics}
      facets={facets.topic}
      state={state}
      basePath={basePath}
    />,
  ].filter(Boolean);

  if (blocks.length === 0) return null;

  return (
    <div className="flex flex-col gap-5">
      {/* At the top, not the bottom. The rail runs past the fold on a laptop
          once a shelf has four axes, and "Clear" is the way *out* of a
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
  topic: "Topics",
};

/** A labelled block in the rail. */
function Axis({ en, children }: { en: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-1.5 px-1 text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
        {en}
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
      className={`flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs transition-colors ${
        on ? "font-semibold" : "text-ink hover:bg-ink/[.04]"
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
      {/* Ours for a kind or a source, the manager's for a place, a person or
          a topic — so the script of the label decides its face. */}
      <span {...contentLang(label)} className={`${contentLang(label).className} min-w-0 flex-1 truncate`}>
        {label}
      </span>
      <span className="shrink-0 text-xs font-medium tabular-nums text-ink-soft">
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
 * Topics in the rail — **rows that narrow, like every other row here.**
 *
 * They were links onto `/library?topic=`, and the note under the heading had to
 * warn that this one block behaved unlike the four above it: tapping a topic
 * left the shelf for a flat list of the whole library. The designer draws it as
 * a filter, the endpoint has always counted `topic` as an ordinary axis, and a
 * rail whose every row narrows in place needs no warning label. The whole-
 * library view is still reachable — from the topic panel on a phone, which is
 * where a reader asking that question has somewhere to be sent from.
 *
 * Counts come from the facets, never from `topics/`: `node_count` counts only
 * what a manager tagged *directly*, and every axis in this library is
 * inherited, so a shivir branch tagged once at its root counted as one where the
 * chip actually reaches fifty-nine. `topics/` still supplies the row — it is
 * the only thing that knows the labels and the order a manager set, and it can
 * add a topic without a deploy.
 */
function TopicRows({
  topics,
  facets,
  state,
  basePath,
}: {
  topics: Topic[];
  facets?: FacetValue[];
  state: FindState;
  basePath: string;
}) {
  const counts = new Map((facets ?? []).map((f) => [f.value, f.count]));
  const live = topics
    .map((t) => ({ topic: t, count: counts.get(t.code) ?? 0 }))
    .filter(({ topic, count }) => (facets ? count > 0 : topic.node_count > 0))
    .sort((a, b) => a.topic.ordering - b.topic.ordering);
  if (live.length === 0) return null;

  return (
    <section>
      <p className="mb-1.5 px-1 text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
        Topics
      </p>
      {live.map(({ topic, count }) => (
        <FacetRow
          key={topic.code}
          href={findHref(basePath, toggleChip(state, "topic", topic.code))}
          /* The one taxonomy label a manager types, shown as they typed it. */
          label={topic.name}
          count={count}
          on={isChipOn(state, "topic", topic.code)}
        />
      ))}
    </section>
  );
}
