import Link from "next/link";
import { ProvenanceBadge } from "@/components/resources/ProvenanceBadge";
import { kindsSummary } from "@/components/resources/format";
import { CoverTile } from "@/components/shelf/CoverTile";
import type { ResourceCollection } from "@/lib/types";

/**
 * One collection on the shelf — **a cover, never a filename** (contract §13.3).
 *
 * The cover falls back to the book shelf's own generated one rather than to a
 * grey box: `CoverTile` already draws the designer's 150° gradient in a hue
 * derived from a stable key, with the title's first अक्षर set large. Reusing it
 * (keyed by the collection id) is the point — a second hue helper would give
 * the same shelf two different visual languages for the same absence.
 *
 * The provenance badge rides on every card. It is the one thing here that is
 * not description: it tells the reader whether what is behind this cover is
 * प्रमाण or someone's understanding, before they open it.
 */
export function CollectionCard({ collection }: { collection: ResourceCollection }) {
  const c = collection;
  // Year and place are what a seeker actually remembers about a shivir
  // ("अमरकंटक 2005") — so they, not the door, are the card's second line.
  const facts = [c.year, c.place].filter(Boolean).join(" · ");
  const contents = kindsSummary(c.kinds, c.item_count);

  return (
    <Link
      href={`/resources/collections/${c.id}`}
      className="group flex h-full flex-col gap-2.5 rounded-[18px] border border-rule bg-white p-3 transition-shadow hover:shadow-md"
    >
      <CoverTile
        book={{ title_hi: c.title_hi, cover_image: c.cover_url, code: `collection-${c.id}` }}
        size="grid"
      />
      <span
        lang="hi"
        className="hi line-clamp-2 text-[13.5px] font-semibold leading-snug group-hover:underline"
      >
        {c.title_hi}
      </span>
      {facts && (
        <span lang="hi" className="hi -mt-1 block truncate text-[11px] text-ink-soft">
          {facts}
        </span>
      )}
      <span className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1">
        <ProvenanceBadge provenance={c.provenance} provenanceHi={c.provenance_hi} />
        {contents && (
          <span lang="hi" className="hi text-[11px] font-medium text-ink-soft">
            {contents}
          </span>
        )}
      </span>
    </Link>
  );
}

/** The cards, as the grid the spec asks for — with the shelf's empty state. */
export function CollectionGrid({
  collections,
  empty,
}: {
  collections: ResourceCollection[];
  empty?: React.ReactNode;
}) {
  if (collections.length === 0) return <>{empty}</>;
  return (
    <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {collections.map((c) => (
        <li key={c.id}>
          <CollectionCard collection={c} />
        </li>
      ))}
    </ul>
  );
}
