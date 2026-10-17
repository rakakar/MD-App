import { PageContainer, ShelfControlsSkeleton, ShelfGridSkeleton, Skeleton } from "@/components/ui";

/**
 * See `components/ui/Skeleton.tsx` for why these files exist: this route
 * reads `searchParams`, so without one a tap on a folder showed the old screen
 * until the server answered, and the folder was never prefetched.
 *
 * Unlike the shelves, a folder's name is fetched rather than written, so the
 * title is a shape too.
 */
export default function Loading() {
  return (
    <PageContainer size="shelf">
      <Skeleton className="mt-2 h-8 w-2/3 max-w-md rounded-control" />
      <Skeleton className="mt-3 h-4 w-1/2 max-w-sm rounded-control" />
      <ShelfControlsSkeleton />
      <ShelfGridSkeleton />
    </PageContainer>
  );
}
