import Link from "next/link";
import { KIND_HI, KIND_ORDER } from "./format";
import { chipLabel, AXIS_HI } from "./Sieve";
import { yearBands, yearSpan } from "./years";
import {
  ChevronDown,
  DocumentIcon,
  FilterIcon,
  FolderIcon,
  HeadphonesIcon,
  ImageIcon,
  TagIcon,
  VideoIcon,
} from "@/components/shell/icons";
import {
  FIND_AXES,
  clearAxis,
  findHref,
  isChipOn,
  toggleChip,
  toggleGroup,
  type FindAxis,
  type FindState,
} from "@/lib/find";
import type { FacetValue, FileKind, LibraryFacets, Topic } from "@/lib/types";

/**
 * The shelf's filters on a phone — **two closed cards, above the collections**
 * (designer, "ui 1", both states).
 *
 * This replaces a single `छाँटें` fold holding six chip rows, and the change is
 * as much about where the controls are as what they look like. They used to sit
 * *below* the grid: counted over a whole shelf the chips ran to some five
 * hundred pixels, and above the tiles that pushed the second collection off a
 * phone, so the whole block was moved to the foot of the page. That fixed the
 * fold and broke the search box, which went with it — and nobody scrolls past
 * six collections looking for a search box they have no reason to think exists.
 *
 * The designer's answer keeps both: the panels are *closed*, so the chrome
 * above the grid is two 64px rows rather than five hundred pixels of chips, and
 * each row says what is behind it before it is opened — "6 topics · filters
 * every collection", "1997–2015 · audio, video, PDF, photos". A reader who
 * wants to browse sees collections; a reader who wants to narrow sees where to.
 *
 * Still `<details>`: no JavaScript, no client component, the browser keeps the
 * state, and a panel opens by itself whenever one of its own chips is on —
 * a filtered page must always show the control that filtered it.
 *
 * The rail is the desktop's copy of all this and is drawn separately
 * (`RailFacets`), which is why this whole block is `lg:hidden` at its caller.
 */
export function FilterCards({
  topics,
  facets,
  state,
  basePath,
  itemCount,
}: {
  topics: Topic[];
  facets: LibraryFacets;
  state: FindState;
  basePath: string;
  /** how much is in scope right now — the number in each panel's footer */
  itemCount: number;
}) {
  return (
    // `empty:hidden`: a shelf whose material is all one year, one kind and
    // untagged draws neither panel, and the margin of a block that is not there
    // is a hole in the page above the collections.
    <div className="mt-3 flex flex-col gap-2.5 empty:hidden">
      <TopicCard
        topics={topics}
        facets={facets.topic}
        state={state}
        basePath={basePath}
        itemCount={itemCount}
      />
      <SieveCard
        facets={facets}
        state={state}
        basePath={basePath}
        itemCount={itemCount}
      />
    </div>
  );
}

/**
 * विषय — **and it narrows in place now.**
 *
 * The chips used to be links onto `/library?topic=`: a reader tapping अस्तित्व
 * दर्शन on this shelf lost the shelf and landed on a flat list from every depth
 * of every workspace. The designer draws the opposite, and says why in the
 * mockup: selecting a topic filters every collection at once, the tile counts
 * below update in place, and the chip persists as you move into a collection.
 * The endpoint always supported it — `topic` is an axis in `catalogue.AXES`
 * like any other, and the counts here are its facet.
 *
 * **The door survives at the foot of the panel**, as a link rather than as the
 * only behaviour. "Everything filed under व्यवस्था wherever it lives" is a real
 * question; it just is not the one being asked by someone looking at this
 * shelf's collections, and it cost them the shelf to ask it by accident.
 */
function TopicCard({
  topics,
  facets,
  state,
  basePath,
  itemCount,
}: {
  topics: Topic[];
  facets?: FacetValue[];
  state: FindState;
  basePath: string;
  itemCount: number;
}) {
  const counts = new Map((facets ?? []).map((f) => [f.value, f.count]));
  const live = topics
    // Before the facets arrive there is nothing honest to count with, so the
    // row falls back to "is this topic used anywhere at all" rather than
    // printing a number it cannot stand behind. A chip that filters to nothing
    // is a dead control either way.
    .map((topic) => ({ topic, count: counts.get(topic.code) ?? 0 }))
    .filter(({ topic, count }) => (facets ? count > 0 : topic.node_count > 0))
    .sort((a, b) => a.topic.ordering - b.topic.ordering);
  if (live.length === 0) return null;

  const on = state.selection.topic ?? [];
  // One topic selected has somewhere to go; several do not — `?topic=` takes
  // one code, and a link that silently dropped two of three would be worse
  // than no link.
  const single = on.length === 1 ? live.find((row) => row.topic.code === on[0]) : undefined;

  return (
    <Panel
      icon={<TagIcon className="h-4.5 w-4.5" />}
      title="Browse by topic"
      titleHi="विषय"
      summary={
        on.length > 0
          ? `${on.length} selected · ${itemCount} items`
          : `${live.length} topics · filters every collection`
      }
      selected={on.length}
      open={on.length > 0}
      footer={
        <Footer
          clearHref={findHref(basePath, clearAxis(state, "topic"))}
          clear={on.length > 0}
          itemCount={itemCount}
        />
      }
    >
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="विषय">
        {live.map(({ topic, count }) => (
          <Chip
            key={topic.code}
            href={findHref(basePath, toggleChip(state, "topic", topic.code))}
            on={isChipOn(state, "topic", topic.code)}
            /* The one taxonomy label that arrives in Hindi and is shown as a
               manager typed it — they add topics without a deploy, so the FE
               cannot hold a label it has never seen. */
            label={topic.name}
            count={count}
          />
        ))}
      </div>
      {single && (
        <p className="mt-3 border-t border-rule pt-2.5">
          <Link
            href={`/library?topic=${encodeURIComponent(single.topic.code)}`}
            className="text-[11.5px] font-semibold"
            style={{ color: "var(--ws-ink)" }}
          >
            <span lang="hi" className="hi">
              {single.topic.name} — पूरी लाइब्रेरी में देखें
            </span>{" "}
            →
          </Link>
        </p>
      )}
    </Panel>
  );
}

/**
 * वर्ष व प्रकार, in one panel — because they answer the same question.
 *
 * *Which slice of the archive?* Topic is about subject matter and users combine
 * it with any category; these two are the cut a reader makes inside whatever
 * they have already chosen, so the designer stacks them in one sheet and that
 * is right.
 *
 * प्रकार leads as a grid of labelled buttons rather than as chips: it is the
 * shortest axis, the one with icons, and the one most often tapped on a phone
 * ("सिर्फ़ audio दिखाओ, चलते-फिरते सुनना है"). The other four axes — प्रमाण,
 * स्थान, व्यक्ति, भाषा — keep the chip rows underneath, since a shelf that has
 * them still has to offer them and a grid of place names would be a wall.
 */
function SieveCard({
  facets,
  state,
  basePath,
  itemCount,
}: {
  facets: LibraryFacets;
  state: FindState;
  basePath: string;
  itemCount: number;
}) {
  const kinds = orderedKinds(facets.kind);
  const bands = yearBands(facets.year);
  // The same rule the sieve always applied: one option narrows nothing, so the
  // row would be an instruction to press a button that changes nothing. An
  // axis stays on screen once it is in use however narrow the scope has become,
  // so a shared link never hides the control that produced what is on it.
  const rows = FIND_AXES.filter((axis) => axis !== "kind" && axis !== "year").filter(
    (axis) => (facets[axis] ?? []).length > 1 || (state.selection[axis]?.length ?? 0) > 0
  );

  const showKinds = kinds.length > 1 || (state.selection.kind?.length ?? 0) > 0;
  const showYears = bands.length > 1 || (state.selection.year?.length ?? 0) > 0;
  if (!showKinds && !showYears && rows.length === 0) return null;

  const axes: FindAxis[] = ["kind", "year", ...rows];
  const selected = axes.reduce((n, axis) => n + (state.selection[axis]?.length ?? 0), 0);
  const span = yearSpan(facets.year);
  const kindWords = kinds.map((k) => KIND_HI[k.value as FileKind] ?? k.value).join(", ");

  return (
    <Panel
      icon={<FilterIcon className="h-4.5 w-4.5" />}
      title="Year & category"
      titleHi="वर्ष व प्रकार"
      summary={
        selected > 0
          ? `${selected} selected · ${itemCount} items`
          : [span, kindWords].filter(Boolean).join(" · ")
      }
      selected={selected}
      open={selected > 0}
      footer={
        <Footer
          clearHref={findHref(
            basePath,
            axes.reduce((next, axis) => clearAxis(next, axis), state)
          )}
          clear={selected > 0}
          itemCount={itemCount}
        />
      }
    >
      {showKinds && (
        <section>
          <Legend en="By category" hi={AXIS_HI.kind} />
          {/* Two per row of icon + word + count. As chips these were the axis a
              thumb missed most: five short words wrapped into a hedge, and the
              count that tells you whether the tap is worth making was set in
              70% grey beside them. */}
          <div className="grid grid-cols-2 gap-1.5" role="group" aria-label={AXIS_HI.kind}>
            {kinds.map((chip) => {
              const on = isChipOn(state, "kind", chip.value);
              return (
                <Link
                  key={chip.value}
                  href={findHref(basePath, toggleChip(state, "kind", chip.value))}
                  aria-current={on ? "true" : undefined}
                  className="flex min-h-11 items-center gap-2 rounded-xl border px-2.5 py-2 text-[13px] font-medium transition-colors"
                  style={
                    on
                      ? {
                          borderColor: "var(--ws-color)",
                          background: "color-mix(in srgb, var(--ws-color) 9%, #fff)",
                          color: "var(--ws-ink)",
                        }
                      : { borderColor: "var(--color-rule)", background: "#fff" }
                  }
                >
                  <span className="shrink-0" style={{ color: on ? undefined : "var(--color-ink-soft)" }}>
                    <KindIcon kind={chip.value as FileKind} />
                  </span>
                  <span lang="hi" className="hi min-w-0 flex-1 truncate">
                    {chipLabel("kind", chip)}
                  </span>
                  <span className="shrink-0 text-[11.5px] tabular-nums text-ink-soft">
                    {chip.count}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {showYears && (
        <section className={showKinds ? "mt-3.5" : undefined}>
          <Legend en="By year" hi={AXIS_HI.year} note={bands.length > 1 ? span : ""} />
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={AXIS_HI.year}>
            {bands.map((band) => (
              <Chip
                key={band.label}
                href={findHref(basePath, toggleGroup(state, "year", band.values))}
                on={band.values.every((v) => isChipOn(state, "year", v))}
                label={band.label}
                count={band.count}
                numeric
              />
            ))}
          </div>
        </section>
      )}

      {rows.map((axis) => (
        <section key={axis} className="mt-3.5">
          <Legend en={AXIS_EN[axis]} hi={AXIS_HI[axis]} />
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={AXIS_HI[axis]}>
            {(facets[axis] ?? []).map((chip) => (
              <Chip
                key={chip.value}
                href={findHref(basePath, toggleChip(state, axis, chip.value))}
                on={isChipOn(state, axis, chip.value)}
                label={chipLabel(axis, chip)}
                count={chip.count}
              />
            ))}
          </div>
        </section>
      ))}
    </Panel>
  );
}

const AXIS_EN: Record<FindAxis, string> = {
  provenance: "By provenance",
  year: "By year",
  place: "By place",
  person: "By person",
  language: "By language",
  kind: "By category",
  topic: "By topic",
};

/**
 * One card: a row that says what is inside it, and the inside.
 *
 * The summary is a real sentence rather than a label — a closed panel has to
 * earn the tap that opens it, and "6 topics · filters every collection" says
 * both what is behind it and what it will do, which "छाँटें" never did.
 */
function Panel({
  icon,
  title,
  titleHi,
  summary,
  selected,
  open,
  footer,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  titleHi: string;
  summary: string;
  selected: number;
  open: boolean;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <details open={open} className="group rounded-2xl border border-rule bg-white">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "var(--color-accent-tint)", color: "var(--ws-ink)" }}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-semibold leading-tight">
            {title}
            <span lang="hi" className="hi font-medium text-ink-soft">
              {" "}
              · {titleHi}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-[11.5px] leading-snug text-ink-soft">
            {summary}
          </span>
        </span>
        {selected > 0 && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
            style={{ background: "var(--ws-color)" }}
          >
            {selected}
          </span>
        )}
        <ChevronDown
          aria-hidden
          className="h-4 w-4 shrink-0 text-ink-soft transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="border-t border-rule px-3 py-3">{children}</div>
      {footer}
    </details>
  );
}

/**
 * The foot of a panel: the way out on the left, how much is left on the right.
 *
 * "Clear all" clears **this panel's axes only**, never the whole find — a
 * reader emptying the year panel has not asked to lose the topic they chose in
 * the one above it. The find-wide way back is `साफ़ करें`, which sits with the
 * results.
 */
function Footer({
  clearHref,
  clear,
  itemCount,
}: {
  clearHref: string;
  clear: boolean;
  itemCount: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-rule px-3 py-2.5">
      {clear ? (
        <Link href={clearHref} className="text-xs font-medium text-ink-soft hover:text-ink">
          Clear all
        </Link>
      ) : (
        <span className="text-xs text-muted">Clear all</span>
      )}
      <span
        className="text-xs font-semibold tabular-nums"
        style={{ color: "var(--ws-ink)" }}
      >
        {itemCount} items
      </span>
    </div>
  );
}

function Legend({ en, hi, note }: { en: string; hi: string; note?: string }) {
  return (
    <p className="mb-1.5 flex items-baseline justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.09em] text-ink-soft">
      <span>
        {en} ·{" "}
        <span lang="hi" className="hi">
          {hi}
        </span>
      </span>
      {note && <span className="font-medium tabular-nums normal-case tracking-normal">{note}</span>}
    </p>
  );
}

function Chip({
  href,
  on,
  label,
  count,
  numeric,
}: {
  href: string;
  on: boolean;
  label: string;
  count: number;
  numeric?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={on ? "true" : undefined}
      // Tapping a lit chip clears it — the only way back out of one on a phone
      // without a second control beside every row.
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        on ? "border-transparent text-white" : "border-rule bg-white text-ink"
      }`}
      style={on ? { background: "var(--ws-color)" } : undefined}
    >
      <span lang="hi" className={numeric ? "tabular-nums" : "hi"}>
        {label}
      </span>
      <span className="ms-1 tabular-nums opacity-70">{count}</span>
    </Link>
  );
}

/** प्रकार in the order files are shown in, not in the order they were counted. */
function orderedKinds(facets: FacetValue[] | undefined): FacetValue[] {
  const by = new Map((facets ?? []).map((f) => [f.value, f]));
  const known = KIND_ORDER.map((k) => by.get(k)).filter((f): f is FacetValue => !!f);
  const rest = (facets ?? []).filter((f) => !KIND_ORDER.includes(f.value as FileKind));
  return [...known, ...rest];
}

function KindIcon({ kind }: { kind: FileKind }) {
  const className = "h-4 w-4";
  if (kind === "audio") return <HeadphonesIcon className={className} />;
  if (kind === "video") return <VideoIcon className={className} />;
  if (kind === "image") return <ImageIcon className={className} />;
  if (kind === "pdf") return <DocumentIcon className={className} />;
  return <FolderIcon className={className} />;
}
