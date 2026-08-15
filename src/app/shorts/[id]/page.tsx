import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShortsPlayer } from "@/components/shorts/ShortsPlayer";
import { FEED_LIMIT, getShorts } from "@/lib/shorts";

export const revalidate = 60;

/**
 * **One short, opened inside the app — and the feed it sits in.**
 *
 * The address is the clip, not the position: `/shorts/{videoId}` is shareable,
 * survives the feed reordering under it, and is what the browser's back button
 * returns from. The *feed* around it is fetched here rather than passed from
 * Home, because a link that arrives cold — pasted, bookmarked, opened from a
 * notification — must still be able to swipe.
 *
 * A route rather than an overlay on Home for that same reason, and because the
 * screen owns the viewport (`lib/routes`): app chrome would be taken out of a
 * 9:16 picture that already fills the screen.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const clip = (await getShorts(FEED_LIMIT)).find((c) => c.videoId === id);
  if (!clip) return { title: "Shorts" };
  return {
    title: clip.title,
    description: `A short clip from ${clip.channel.title}.`,
    // The clip lives on YouTube and its canonical home is there; nothing here
    // should compete with it in search results for the same video.
    robots: { index: false },
  };
}

export default async function ShortPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clips = await getShorts(FEED_LIMIT);
  const startIndex = clips.findIndex((c) => c.videoId === id);

  // Not found rather than "here is a different clip". The feed holds the newest
  // sixty, and a link outside it is either a clip the channel has taken down or
  // one that has aged past the window — in both cases the honest answer is that
  // this address no longer has a video, not a silent substitution of another.
  if (startIndex < 0) notFound();

  return <ShortsPlayer clips={clips} startIndex={startIndex} />;
}
