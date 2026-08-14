"use client";

import { ViewToggle, useCollectionView } from "./CollectionLayout";

/**
 * The layout switch, and whichever of the two shapes it is showing.
 *
 * Takes both as already-rendered children rather than rendering them itself:
 * the cards and rows are server components built from data this file never
 * sees, and the only thing that has to be on the client is which of them is on
 * screen. Both are built either way, which for a page of a dozen collections is
 * cheaper than the round trip that would avoid it.
 */
export function CollectionViewport({
  summary,
  grid,
  list,
}: {
  /** the shelf's own count line, which shares the toggle's row */
  summary: React.ReactNode;
  grid: React.ReactNode;
  list: React.ReactNode;
}) {
  const [view, setView] = useCollectionView();

  return (
    <>
      {/* The toggle sits on the count's line rather than a line of its own,
          which is what closes the empty half-row it was leaving. They belong
          together anyway: one says how much there is, the other how to look
          at it. */}
      <div className="mt-4 flex items-center justify-between gap-3">
        {summary}
        <ViewToggle view={view} onView={setView} />
      </div>
      <div className="mt-2.5">{view === "grid" ? grid : list}</div>
    </>
  );
}
