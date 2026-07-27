import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrackList } from "@/components/av/TrackList";
import { EmptyState, PageContainer } from "@/components/ui";
import { getAudioSeries, getAudioTracks } from "@/lib/api";
import type { AudioSeries } from "@/lib/types";

export const revalidate = 900;

export const metadata: Metadata = { title: "Audio series" };

function matches(s: AudioSeries, param: string): boolean {
  return String(s.id) === param;
}

export default async function AudioSeriesPage({
  params,
}: {
  params: Promise<{ series: string }>;
}) {
  const { series: param } = await params;
  const all = await getAudioSeries().catch(() => [] as AudioSeries[]);
  const series = all.find((s) => matches(s, decodeURIComponent(param)));
  if (!series && all.length > 0) notFound();

  const tracks = await getAudioTracks({ series: series?.id ?? decodeURIComponent(param) }).catch(
    () => []
  );
  const title = series?.title_hi || "Audio series";

  return (
    <PageContainer>
      <h1 lang="hi" className="hi text-xl font-bold">{title}</h1>
      {series?.description ? (
        <p className="mt-1 text-sm text-ink-soft">{series.description}</p>
      ) : null}
      <div className="mt-5">
        {tracks.length > 0 ? (
          <TrackList tracks={tracks} seriesTitle={title} />
        ) : (
          <EmptyState title="No tracks in this series yet" />
        )}
      </div>
    </PageContainer>
  );
}
