import { PageTitle } from "@/components/ui/PageTitle";
import { PageContainer, ShelfControlsSkeleton, ShelfGridSkeleton } from "@/components/ui";

/** See `components/ui/Skeleton.tsx` for why these files exist. */
export default function Loading() {
  return (
    <PageContainer size="shelf">
      {/* written, not fetched — so it is drawn for real, at its real size */}
      <PageTitle
        shelf
        title="Library"
        description="Compilations, diaries, letters, articles and photos of Shri A. Nagraj."
      />
      <ShelfControlsSkeleton />
      <ShelfGridSkeleton />
    </PageContainer>
  );
}
