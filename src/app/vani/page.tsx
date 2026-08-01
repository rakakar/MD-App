import type { Metadata } from "next";
import { NodeCardView } from "@/components/library/NodeCard";
import { EmptyState, PageContainer } from "@/components/ui";
import { getVani } from "@/lib/api";
import { shelfMap } from "@/lib/library";
import type { LocatedNodeCard } from "@/lib/types";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "नागराज जी की वाणी",
  description: "A. Nagraj ji's own words, voice and hand — across the whole library.",
};

/**
 * "नागराज जी की वाणी" (contract §13.7) — every visible folder whose resolved
 * provenance is मूल, across *all* workspaces.
 *
 * This is the door that gives his voice the prominence it deserves without
 * breaking anything: the alternative was moving recordings onto the originals
 * shelf, which would have quietly extended that shelf's citation promise to
 * material that cannot keep it. Filed where it belongs, surfaced by
 * provenance — and the reader never needs to know that संसाधन holds most of
 * it underneath.
 *
 * One flat list now, not three arrays to merge, because provenance is
 * inherited: a folder marked मूल at the door level answers for its whole
 * branch. Every row shows its path, and this is the list that most needs it —
 * three shivirs contribute three rows all called "दिन 1".
 */
export default async function VaniPage() {
  const [folders, shelves] = await Promise.all([
    getVani().catch(() => [] as LocatedNodeCard[]),
    shelfMap(),
  ]);

  return (
    <PageContainer size="shelf">
      <h1 lang="hi" className="hi text-[22px] font-semibold leading-tight lg:text-3xl">
        नागराज जी की वाणी
      </h1>
      <p lang="hi" className="hi mt-1 text-sm text-ink-soft">
        जो उनके अपने शब्दों, स्वर या हाथ से है — पूरे संग्रह से एक जगह।
      </p>

      {folders.length > 0 ? (
        <ul className="mt-5 flex flex-col gap-3">
          {folders.map((card) => (
            <li key={card.id}>
              <NodeCardView card={card} shelves={shelves} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5">
          <EmptyState
            title="अभी कुछ प्रकाशित नहीं"
            hint="Recordings and originals appear here as they are published and marked मूल."
          />
        </div>
      )}
    </PageContainer>
  );
}
