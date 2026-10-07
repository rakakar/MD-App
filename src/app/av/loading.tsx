import { PageTitle } from "@/components/ui/PageTitle";
import { PageContainer, ShelfControlsSkeleton, ShelfGridSkeleton } from "@/components/ui";

/** See `components/ui/Skeleton.tsx` for why these files exist. */
export default function Loading() {
  return (
    <PageContainer size="shelf">
      {/* written, not fetched — so it is drawn for real, at its real size */}
      <PageTitle
        shelf
        title="Media"
        description="Discourses, satsangs and shivir sessions of Shri A. Nagraj."
      />
      <ShelfControlsSkeleton />
      <ShelfGridSkeleton />
    </PageContainer>
  );
}
