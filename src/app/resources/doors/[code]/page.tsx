import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CollectionGrid } from "@/components/resources/CollectionCard";
import {
  ClearFilters,
  FacetRow,
  SECONDARY_AXES,
  facetOptions,
  type FacetSelection,
} from "@/components/resources/FacetChips";
import { BackIcon } from "@/components/shell/icons";
import { EmptyState, PageContainer } from "@/components/ui";
import { getCollections, getResourceDoors, getResourceTopics } from "@/lib/api";
import type { ResourceCollection, ResourceFacet, ResourceKind } from "@/lib/types";

export const revalidate = 900;
export const dynamicParams = true;

export async function generateStaticParams() {
  const doors = await getResourceDoors().catch(() => [] as ResourceFacet[]);
  return doors.map((d) => ({ code: d.code }));
}

async function findDoor(code: string): Promise<ResourceFacet | null> {
  const doors = await getResourceDoors().catch(() => [] as ResourceFacet[]);
  return doors.find((d) => d.code === code) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const door = await findDoor(decodeURIComponent(code));
  if (!door) return { title: "Resources · संसाधन" };
  return {
    title: `${door.name_hi} · संसाधन`,
    description: door.description || undefined,
    alternates: { canonical: `/resources/doors/${encodeURIComponent(door.code)}` },
  };
}

/**
 * Inside a door: facet chips, then a grid of collection covers.
 *
 * The chips filter through the BE (contract §13.3) rather than in here, so the
 * documented filters are the ones actually exercised — `year` is a prefix
 * match and `place`/`person` are substring matches, and reimplementing that
 * locally would drift the moment either side changed.
 *
 * The chips themselves are derived from the door's *whole* set, which is why
 * that set is fetched even when a filter is on: chips computed from an already
 * filtered list would vanish as soon as you used one, so a reader could never
 * widen a choice, only start over.
 */
export default async function DoorPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<FacetSelection>;
}) {
  const { code } = await params;
  const doorCode = decodeURIComponent(code);
  const selection = await searchParams;
  const filtered = Object.values(selection).some(Boolean);

  const [door, topics, all] = await Promise.all([
    findDoor(doorCode),
    getResourceTopics().catch(() => [] as ResourceFacet[]),
    getCollections({ door: doorCode }).catch(() => ({
      results: [] as ResourceCollection[],
      truncated: false,
    })),
  ]);

  // A door the BE does not return is a door with nothing published behind it —
  // or one a manager retired. Either way there is nothing here to show.
  if (!door) notFound();

  const shown = filtered
    ? await getCollections({
        door: doorCode,
        topic: selection.topic,
        year: selection.year,
        place: selection.place,
        person: selection.person,
        language: selection.language,
        kind: selection.kind as ResourceKind | undefined,
      })
        .then((r) => r.results)
        .catch(() => [] as ResourceCollection[])
    : all.results;

  const basePath = `/resources/doors/${encodeURIComponent(door.code)}`;
  const topicChips = facetOptions(all.results, "topic", topics);
  const secondary = SECONDARY_AXES.map((axis) => ({
    axis,
    options: facetOptions(all.results, axis, topics),
  })).filter((row) => row.options.length > 1);
  const secondaryActive = secondary.some(({ axis }) => selection[axis]);

  return (
    <PageContainer size="shelf">
      <Link
        href="/resources"
        aria-label="Back to Resources"
        className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rule bg-white text-ink-soft transition-colors hover:bg-black/[.03]"
      >
        <BackIcon />
      </Link>

      <h1 lang="hi" className="hi text-[22px] font-semibold leading-tight lg:text-3xl">
        {door.name_hi}
      </h1>
      {door.description && (
        <p lang="hi" className="hi mt-1 text-sm text-ink-soft">
          {door.description}
        </p>
      )}

      {(topicChips.length > 1 || secondary.length > 0) && (
        <div className="mt-4 rounded-2xl border border-rule bg-white px-3 py-2">
          <FacetRow
            axis="topic"
            options={topicChips}
            selection={selection}
            basePath={basePath}
          />

          {/*
            वर्ष · स्थान · व्यक्ति · भाषा · प्रकार, folded away. Six rows of
            chips is most of a phone screen before a single cover is visible —
            and विषय is the question a seeker actually starts from. Opened
            automatically when one of them is already in use, so a shared link
            never hides the filter that produced it.
          */}
          {secondary.length > 0 && (
            <details open={secondaryActive} className="group">
              <summary className="cursor-pointer list-none py-1.5 text-xs font-semibold text-ink-soft marker:hidden">
                <span lang="hi" className="hi">और छाँटें</span> · More filters
                <span aria-hidden className="ms-1 inline-block group-open:rotate-180">
                  ⌄
                </span>
              </summary>
              {secondary.map(({ axis, options }) => (
                <FacetRow
                  key={axis}
                  axis={axis}
                  options={options}
                  selection={selection}
                  basePath={basePath}
                />
              ))}
            </details>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft">
        <span lang="hi" className="hi">
          {shown.length} संग्रह
          {filtered && all.results.length > 0 ? ` / ${all.results.length}` : ""}
        </span>
        <ClearFilters basePath={basePath} selection={selection} />
      </div>

      <CollectionGrid
        collections={shown}
        empty={
          <div className="mt-5">
            <EmptyState
              title="इस छाँट पर कुछ नहीं मिला"
              hint={
                filtered
                  ? "Nothing published under these filters yet — clear one and try again."
                  : "Collections appear here as they are published."
              }
            />
          </div>
        }
      />

      {/* The shelf is cursor-paginated. Saying so is better than a grid that
          quietly stops: a door this large needs the facets above, not more
          scrolling. */}
      {all.truncated && !filtered && (
        <p className="mt-4 text-center text-xs text-ink-soft">
          Showing the {shown.length} most recent —{" "}
          <span lang="hi" className="hi">ऊपर की छाँट से आगे खोजें</span>
        </p>
      )}
    </PageContainer>
  );
}
