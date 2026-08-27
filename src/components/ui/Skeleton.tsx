/**
 * **The placeholders the shelves show while their data is in flight.**
 *
 * Why they exist at all: `/originals`, `/resources`, `/translations` and `/av`
 * all read `searchParams`, which opts a page into dynamic rendering at request
 * time — and Next skips prefetching a dynamic route entirely *unless* it has a
 * `loading.tsx`. So until these existed, tapping a workspace in the tab bar
 * started a server round trip from cold and showed the reader the old screen,
 * unchanged, until it came back. The `loading.tsx` files buy back the partial
 * prefetch and give the tap something to land on.
 *
 * **What is skeletonised, and what is not.** Every one of these pages opens
 * with a heading and a standfirst that are *written*, not fetched — "Library",
 * "Media", "Student Materials", "Translations". Those are drawn for real,
 * immediately, at their real size. Only what the API owns gets a grey shape.
 * A reader who taps Media should see the word Media, not a grey bar where they
 * know a word goes; it is also the honest picture, since the title genuinely
 * is known and the shelf genuinely is not.
 *
 * The shapes deliberately do not chase a pixel match with the finished page.
 * They hold the same *frame* — the same container, the same grid, the same
 * gaps — so nothing jumps sideways when the real cards land.
 *
 * The headings themselves are written out in each `loading.tsx` rather than
 * shared from here, because the shelf h1 carries an arbitrary type size that
 * the lint rule rightly refuses inside `components/` — and because a loading
 * state that imported the page's own header would have to import the page,
 * which is the thing that has not loaded.
 */

/** One placeholder shape. Radius and size come from the caller, in tokens. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton ${className}`} />;
}

/** Search field + Filters button, at the height the real controls stand at. */
export function ShelfControlsSkeleton() {
  return (
    <div className="mt-4 flex gap-2.5">
      <Skeleton className="h-13 flex-1 rounded-control" />
      <Skeleton className="h-13 w-32 rounded-control" />
    </div>
  );
}

/**
 * A grid of collection cards.
 *
 * Six, because that is a little over one phone screen — enough that the grid
 * reads as a grid rather than as three lonely tiles, and not so many that the
 * page scrolls into placeholders nobody asked to see. The columns and gaps are
 * `WorkspaceShelf`'s own.
 */
export function ShelfGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="mt-5">
      <Skeleton className="h-4 w-40 rounded-md" />
      <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
        {Array.from({ length: count }, (_, i) => (
          <li key={i} className="rounded-card border border-rule bg-card p-4">
            {/* icon tile, title, and the count pill under it — the three things
                a real card always has, so the heights land in the same place */}
            <Skeleton className="h-12 w-12 rounded-tile" />
            <Skeleton className="mt-3 h-4 w-full rounded-md" />
            <Skeleton className="mt-1.5 h-4 w-2/3 rounded-md" />
            <Skeleton className="mt-3 h-6 w-24 rounded-full" />
          </li>
        ))}
      </ul>
    </div>
  );
}
