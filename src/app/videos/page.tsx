import type { Metadata } from "next";
import { YouTubeEmbed } from "@/components/av/YouTubeEmbed";
import { EmptyState, PageContainer, SectionHeading } from "@/components/ui";
import { getPlaylists, getVideos } from "@/lib/api";
import type { Playlist, VideoItem } from "@/lib/types";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Videos",
  description: "Talks and curated playlists.",
};

export default async function VideosPage() {
  const [videos, playlists] = await Promise.all([
    getVideos().catch(() => [] as VideoItem[]),
    getPlaylists().catch(() => [] as Playlist[]),
  ]);

  return (
    <PageContainer wide>
      <h1 className="text-xl font-bold">Videos</h1>

      {playlists.length > 0 &&
        playlists.map((pl) => (
          <section key={pl.id}>
            <SectionHeading>{pl.title_hi || `Playlist ${pl.id}`}</SectionHeading>
            <div className="grid gap-4 sm:grid-cols-2">
              {(pl.videos ?? []).map((v) => (
                <YouTubeEmbed key={v.id} video={v} />
              ))}
            </div>
          </section>
        ))}

      <SectionHeading>All videos</SectionHeading>
      {videos.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {videos.map((v) => (
            <YouTubeEmbed key={v.id} video={v} />
          ))}
        </div>
      ) : (
        <EmptyState title="No videos yet" hint="Published videos will appear here." />
      )}
    </PageContainer>
  );
}
