import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemGroups } from "@/components/resources/ItemGroups";
import { ProvenanceBadge } from "@/components/resources/ProvenanceBadge";
import { itemsSummary } from "@/components/resources/format";
import { CoverTile } from "@/components/shelf/CoverTile";
import { BackIcon } from "@/components/shell/icons";
import { PageContainer } from "@/components/ui";
import { getCollection } from "@/lib/api";
import { bookHue } from "@/lib/bookHue";

export const revalidate = 900;
export const dynamicParams = true;

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const key = parseId(id);
  const collection = key === null ? null : await getCollection(key).catch(() => null);
  if (!collection) return { title: "संसाधन" };
  return {
    title: `${collection.title_hi} · संसाधन`,
    description: collection.description || undefined,
    alternates: { canonical: `/resources/collections/${collection.id}` },
    openGraph: {
      title: collection.title_hi,
      description: collection.description || undefined,
      images: collection.cover_url ? [collection.cover_url] : undefined,
    },
  };
}

/**
 * The album view (contract §13.4): one collection, its facts, and its items
 * served as the files they are.
 *
 * Each kind is consumed the way that kind wants to be — audio through the
 * app's own player in album mode, PDFs in the in-app viewer, images full
 * screen with pinch-zoom. Nothing here routes into the reader: an item has no
 * chapters, no paragraphs and no canonical ref, so there is nothing to cite
 * and nothing to read aloud.
 */
export default async function CollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const key = parseId(id);
  if (key === null) notFound();

  const collection = await getCollection(key);
  // 404 here is the ordinary "unpublished, or nothing openable behind it"
  // answer — a collection is only servable once a reader can actually open
  // something in it.
  if (!collection) notFound();

  const hue = bookHue(`collection-${collection.id}`);
  const facts = [
    collection.year,
    collection.place,
    collection.people,
    collection.language_label,
  ].filter(Boolean);

  return (
    <PageContainer size="shelf">
      <div
        className="-mx-4 -mt-5 px-4 pb-5 pt-4 sm:mx-0 sm:mt-0 sm:rounded-3xl sm:p-6"
        style={{
          background: `linear-gradient(165deg, ${hue.from}, ${hue.to} 70%, color-mix(in srgb, ${hue.to} 82%, #000))`,
        }}
      >
        <Link
          href={`/resources/doors/${encodeURIComponent(collection.door)}`}
          aria-label={`Back to ${collection.door_name_hi}`}
          className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <BackIcon />
        </Link>

        <div className="flex items-end gap-4">
          <div className="w-24 shrink-0">
            <CoverTile
              book={{
                title_hi: collection.title_hi,
                cover_image: collection.cover_url,
                code: `collection-${collection.id}`,
              }}
              size="grid"
            />
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <p lang="hi" className="hi text-[11.5px] font-semibold text-white/70">
              {collection.door_name_hi}
            </p>
            <h1 lang="hi" className="hi mt-0.5 text-[21px] font-semibold leading-tight text-white">
              {collection.title_hi}
            </h1>
            {facts.length > 0 && (
              <p lang="hi" className="hi mt-2 text-[12.5px] font-medium text-white/75">
                {facts.join(" · ")}
              </p>
            )}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {/* The badge rides on the album too, not only on the card: this
                  is the screen where someone actually reads or listens, and it
                  is the last place to say whose word this is. */}
              <ProvenanceBadge
                provenance={collection.provenance}
                provenanceHi={collection.provenance_hi}
                tone="dark"
              />
              <span lang="hi" className="hi text-[11.5px] font-semibold text-white/75">
                {itemsSummary(collection.items)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {collection.description && (
        <p lang="hi" className="hi mt-6 text-sm leading-relaxed text-ink-soft">
          {collection.description}
        </p>
      )}

      <ItemGroups
        items={collection.items}
        collectionTitle={collection.title_hi}
        coverUrl={collection.cover_url}
      />
    </PageContainer>
  );
}
