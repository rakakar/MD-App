import { PageContainer, Skeleton } from "@/components/ui";

/**
 * A book page on its way. See `components/ui/Skeleton.tsx` for why these files
 * exist; this one is for the tap a reader makes most, a cover on a shelf.
 *
 * The hero is a neutral shape rather than the book's colour: the colour comes
 * from the book's code, and which book was tapped is not something a loading
 * state is told. The frame is the real hero's — full-bleed on a phone, a
 * rounded panel from `sm` — so nothing slides when the page lands.
 *
 * Note this boundary also wraps the chapter route below it; that route has its
 * own `loading.tsx`, which is the nearer one and the one that shows.
 */
export default function Loading() {
  return (
    <PageContainer size="shelf">
      <div className="-mx-4 -mt-5 sm:mx-0 sm:mt-0">
        <Skeleton className="h-60 w-full sm:rounded-hero lg:h-72" />
      </div>
      <Skeleton className="mt-6 h-4 w-full max-w-xl rounded-md" />
      <Skeleton className="mt-2 h-4 w-2/3 max-w-md rounded-md" />
      <ul className="mt-7 flex flex-col gap-2.5">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i}>
            <Skeleton className="h-14 w-full rounded-card" />
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}
