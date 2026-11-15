import { PageContainer, Skeleton } from "@/components/ui";
import { PageTitle } from "@/components/ui/PageTitle";

/**
 * The glossary while it loads (15 Nov 2026). It searches on the server, so a
 * tap on Paribhasha — or on a defined word in a book — left the old screen up
 * with only the progress line moving. The title is written, not fetched, so
 * it is drawn for real; see `components/ui/Skeleton.tsx`.
 */
export default function Loading() {
  return (
    <PageContainer>
      <PageTitle
        title="Paribhasha"
        description="The vocabulary of Madhyasth Darshan, based on the Paribhasha Samhita."
      />
      <Skeleton className="mt-4 h-12 w-full rounded-tile" />
      <div className="mt-5 flex flex-col gap-2.5">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-card" />
        ))}
      </div>
    </PageContainer>
  );
}
