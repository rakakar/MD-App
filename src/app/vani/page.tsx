import type { Metadata } from "next";
import { TrackList } from "@/components/av/TrackList";
import { YouTubeEmbed } from "@/components/av/YouTubeEmbed";
import { CollectionGrid } from "@/components/resources/CollectionCard";
import { EmptyState, PageContainer, SectionHeading } from "@/components/ui";
import { getVani } from "@/lib/api";
import type { ResourceLane } from "@/lib/types";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "नागराज जी की वाणी",
  description: "A. Nagraj ji's own words, voice and hand — across the whole library.",
};

/**
 * "नागराज जी की वाणी" (contract §13.6, PRD v2 §5.6.3) — everything published
 * with provenance = मूल, across *all* sections.
 *
 * This is the door that gives his voice the prominence it deserves without
 * breaking anything: the alternative was moving audio into the originals
 * section, which would have quietly extended that shelf's citation promise to
 * material that cannot keep it. Filed where it belongs, surfaced by provenance
 * — and the reader never needs to know that "resources" holds most of it
 * underneath.
 */
export default async function VaniPage() {
  const lane = await getVani().catch(
    () => ({ collections: [], audio: [], video: [] }) as ResourceLane
  );
  const total = lane.collections.length + lane.audio.length + lane.video.length;

  return (
    <PageContainer size="shelf">
      <h1 lang="hi" className="hi text-[22px] font-semibold leading-tight lg:text-3xl">
        नागराज जी की वाणी
      </h1>
      <p lang="hi" className="hi mt-1 text-sm text-ink-soft">
        जो उनके अपने शब्दों, स्वर या हाथ से है — पूरे संग्रह से एक जगह।
      </p>

      {total === 0 && (
        <div className="mt-5">
          <EmptyState
            title="अभी कुछ प्रकाशित नहीं"
            hint="Recordings and originals appear here as they are published and marked मूल."
          />
        </div>
      )}

      {/* Three shapes of one answer, not three tabs — the reader came for his
          words, not to choose a format first. */}
      {lane.collections.length > 0 && (
        <>
          <SectionHeading>
            <span lang="hi" className="hi">संग्रह</span>
          </SectionHeading>
          <CollectionGrid collections={lane.collections} />
        </>
      )}

      {lane.audio.length > 0 && (
        <>
          <SectionHeading>
            <span lang="hi" className="hi">प्रवचन</span>
          </SectionHeading>
          <TrackList tracks={lane.audio} />
        </>
      )}

      {lane.video.length > 0 && (
        <>
          <SectionHeading>
            <span lang="hi" className="hi">वीडियो</span>
          </SectionHeading>
          <div className="grid gap-4 sm:grid-cols-2">
            {lane.video.map((v) => (
              <YouTubeEmbed key={v.id} video={v} />
            ))}
          </div>
        </>
      )}
    </PageContainer>
  );
}
