import { PageContainer, Skeleton } from "@/components/ui";

/**
 * See `components/ui/Skeleton.tsx` for why these files exist.
 *
 * Its own file rather than the shelf one: this page is `text`-width, its
 * heading is the smaller `text-2xl`, and what it lists is book covers on a
 * four-column grid — so the shelf skeleton would have held the wrong frame and
 * moved the page when the real one arrived, which is the one thing a loading
 * state must not do.
 */
export default function Loading() {
  return (
    <PageContainer>
      {/* written, not fetched — so it is drawn for real */}
      <h1 className="font-display text-2xl font-medium">Translations</h1>
      <p className="mt-1 text-sm text-ink-soft">
        The published original works, rendered into other languages by students.
      </p>
      {/* the counted "4 books · 740 pages" line, which the API owns */}
      <Skeleton className="mt-1 h-5 w-40 rounded-md" />

      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="flex flex-col gap-1">
            {/* a cover, then its title — the shape of every card on this shelf */}
            <Skeleton className="aspect-[3/4] w-full rounded-cover" />
            <Skeleton className="mt-1.5 h-4 w-5/6 rounded-md" />
            <Skeleton className="h-4 w-1/2 rounded-md" />
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}
