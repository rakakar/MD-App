import { PageContainer, ShelfControlsSkeleton, ShelfGridSkeleton } from "@/components/ui";

/** See `components/ui/Skeleton.tsx` for why these files exist. */
export default function Loading() {
  return (
    <PageContainer size="shelf">
      {/* written, not fetched — so it is drawn for real, at its real size */}
      <h1 className="font-display text-[1.625rem] font-medium leading-tight tracking-[-0.015em] lg:text-4xl">
        Library
      </h1>
      <p className="mt-0.5 text-sm text-ink-soft">
        Compilations, diaries, letters, articles and photos of Shri A. Nagraj.
      </p>
      <ShelfControlsSkeleton />
      <ShelfGridSkeleton />
    </PageContainer>
  );
}
