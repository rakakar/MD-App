import { AlbumAudio } from "@/components/resources/AlbumAudio";
import { ImageGallery } from "@/components/resources/ImageGallery";
import { PdfView } from "@/components/resources/PdfView";
import { ProvenanceBadge } from "@/components/resources/ProvenanceBadge";
import { KIND_HI, itemFacts } from "@/components/resources/format";
import { DownloadIcon } from "@/components/shell/icons";
import type { ResourceItem, ResourceKind } from "@/lib/types";

/**
 * A set of items, each kind served as the file it is (contract §13.4):
 * audio through the app's own player in album mode, PDFs in the in-app viewer,
 * images full screen with pinch-zoom, anything else handed over.
 *
 * Shared by the album page and the archivist's folder view, because "how is
 * this consumed" is a property of the item's kind and not of the screen it was
 * reached from — a chart needs the same zoom whichever way you arrived at it.
 */
const KIND_ORDER: ResourceKind[] = ["audio", "pdf", "image", "other"];

export function ItemGroups({
  items,
  collectionTitle,
  coverUrl = null,
}: {
  items: ResourceItem[];
  collectionTitle?: string;
  coverUrl?: string | null;
}) {
  // Audio first: a shivir bundle is mostly recordings, and the handout is the
  // appendix rather than the other way round. Order *within* a kind is the
  // BE's `sequence`, which the list already arrives in.
  const groups = KIND_ORDER.map((kind) => ({
    kind,
    items: items.filter((i) => i.kind === kind),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      {groups.map(({ kind, items: kindItems }) => (
        <section key={kind} className="mt-7">
          {/* Only labelled when there is more than one kind to tell apart — a
              heading over the only thing on the page is noise. */}
          {groups.length > 1 && (
            <h2
              lang="hi"
              className="hi mb-3 text-[11px] font-bold uppercase tracking-[0.09em] text-ink-soft"
            >
              {KIND_HI[kind]} · {kindItems.length}
            </h2>
          )}

          {kind === "audio" && (
            <AlbumAudio
              items={kindItems}
              collectionTitle={collectionTitle}
              coverUrl={coverUrl}
            />
          )}

          {kind === "pdf" && (
            <ul className="flex flex-col gap-3">
              {kindItems.map((item) => (
                <li key={item.id} className="rounded-2xl border border-rule bg-white p-4">
                  <ItemHeading item={item} />
                  <div className="mt-3">
                    <PdfView url={item.url} title={item.title} />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {kind === "image" && <ImageGallery items={kindItems} />}

          {kind === "other" && (
            <ul className="divide-y divide-rule overflow-hidden rounded-2xl border border-rule bg-white">
              {kindItems.map((item) => (
                <li key={item.id}>
                  {/*
                    Nothing sensible to show in place, so the file is handed
                    over. `url` is always present on a published item, so this
                    link is never dead — it may point at our media host or at
                    wherever the file still lives mid-migration, and both are
                    opened exactly the same way.
                  */}
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-black/[.03]"
                  >
                    <span className="min-w-0 flex-1">
                      <ItemHeading item={item} />
                    </span>
                    <span
                      className="shrink-0 self-center"
                      style={{ color: "var(--ws-ink)" }}
                      aria-label="Download"
                    >
                      <DownloadIcon />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </>
  );
}

/** an item's title, its facts, and whose word it is */
function ItemHeading({ item }: { item: ResourceItem }) {
  return (
    <>
      <span lang="hi" className="hi block text-[15px] font-medium leading-snug">
        {item.title}
      </span>
      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
        <span>{itemFacts(item)}</span>
        {/* Already the effective provenance — the item's own override, else
            its collection's — so it is rendered, never recomputed. */}
        <ProvenanceBadge provenance={item.provenance} provenanceHi={item.provenance_hi} />
      </span>
      {item.description && (
        <span lang="hi" className="hi mt-1 block text-xs text-ink-soft">
          {item.description}
        </span>
      )}
    </>
  );
}
