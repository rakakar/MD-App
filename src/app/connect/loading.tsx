import { PageContainer, Skeleton } from "@/components/ui";

/**
 * Connect while it loads (15 Nov 2026): events, an event's page, centres and
 * links all fetch on the server, and tapping into one left the previous
 * screen up with only the progress line moving. No heading here — this one
 * boundary covers every Connect page, and naming any one of them would be
 * wrong on the others — just the cards' frame, so nothing jumps sideways
 * when they land.
 */
export default function Loading() {
  return (
    <PageContainer size="shelf">
      <div className="flex flex-col gap-4 pt-1">
        <Skeleton className="h-12 w-full rounded-tile" />
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-card" />
        ))}
      </div>
    </PageContainer>
  );
}
