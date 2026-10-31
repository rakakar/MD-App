import { PageContainer, Skeleton } from "@/components/ui";
import { PageTitle } from "@/components/ui/PageTitle";

/**
 * See `components/ui/Skeleton.tsx` for why these files exist.
 *
 * This page is prerendered, so on a good connection it is prefetched and this
 * never shows. On a weak one the prefetch has not finished when the tab is
 * tapped, and without a boundary the old screen stayed up, unchanged, until
 * the whole shelf arrived — which reads as a tap that did nothing.
 */
export default function Loading() {
  return (
    <PageContainer size="shelf">
      {/* written, not fetched — so it is drawn for real */}
      <PageTitle className="min-w-0" shelf title="Books" />
      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="flex flex-col gap-1">
            <Skeleton className="aspect-[3/4] w-full rounded-cover" />
            <Skeleton className="mt-1.5 h-4 w-5/6 rounded-md" />
            <Skeleton className="h-4 w-1/2 rounded-md" />
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}
