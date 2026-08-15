/**
 * **Shorts — the home rail's clips, straight from our own YouTube channels.**
 *
 * This file used to hold the app's one invented list. It no longer does: the BE
 * mirrors the channels hourly (`/panel/shorts/`) and serves them at
 * `shorts/` (contract §2.7), so a short posted on the channel reaches the rail
 * on its own with nothing filed by anyone.
 *
 * What stays here is the seam between the wire and the card: `ShortClip` is what
 * the BE sends, `Short` is what `ShortsRail` draws, and the mapping below is the
 * one place that knows the difference — a card that had to branch on a null
 * duration or an empty poster would be carrying the API's shape into the layout.
 *
 * **These clips are not a stable set.** The BE withdraws anything deleted or
 * made private on the channel, and an editor can hide one, so a clip that was in
 * yesterday's rail can simply be gone. Nothing here caches beyond the page's own
 * ISR window.
 */

import { getShortClips } from "./api";
import type { ShortClip } from "./types";

export interface Short {
  id: string;
  /** the caption laid over the foot of the card */
  title: string;
  /** runtime, for the badge */
  seconds: number;
  /** a still — 9:16 where the channel kept one, else null and the card draws its own */
  poster: string | null;
  href: string;
  /** YouTube's id — the stable identity, and what an in-app route would key on */
  videoId: string;
  /** for an IFrame-API player; `/shorts/…` refuses to be framed, `/embed/…` is the form that works */
  embedUrl: string;
  /** the clip's own page on YouTube */
  watchUrl: string;
  /** false when the uploader disallows playback outside YouTube — such a clip must open `watchUrl` */
  isEmbeddable: boolean;
  publishedAt: string;
  channel: { title: string; handle: string; url: string };
}

/**
 * One wire clip as the card wants it.
 *
 * `href` is our own player at `/shorts/{videoId}` — **including for a clip the
 * uploader has blocked from embedding.** Sending those straight to YouTube from
 * the rail would mean two kinds of card that look identical and behave
 * differently; the player has room to say "this one only plays on YouTube" and
 * offer the link, and it is the only screen that knows enough to say it.
 */
function toShort(clip: ShortClip): Short {
  return {
    id: String(clip.video_id),
    title: clip.title,
    // Guarded by the filter in `getShorts`, so this is a real runtime.
    seconds: clip.seconds ?? 0,
    // "" is how the BE says "no still yet"; the card's own branch is on null.
    poster: clip.poster || null,
    href: shortHref(clip.video_id),
    videoId: clip.video_id,
    embedUrl: clip.embed_url,
    watchUrl: clip.watch_url,
    isEmbeddable: clip.is_embeddable,
    publishedAt: clip.published_at,
    channel: clip.channel,
  };
}

/** One clip in our own player. The feed it swipes through is fetched there. */
export function shortHref(videoId: string): string {
  return `/shorts/${videoId}`;
}

/**
 * How many clips the swipe feed holds — the BE's own ceiling.
 *
 * The rail shows a dozen; the player is a feed somebody keeps flicking, and
 * running out after twelve is the thing that would make it feel like a demo.
 * There is no paging beyond this: a reader who swipes past sixty clips has
 * watched an hour of them, and the honest fix then is a cursor on the endpoint,
 * not a bigger number here.
 */
export const FEED_LIMIT = 60;

/**
 * The clips for Home's Shorts rail, newest first (pinned ones ahead of them).
 *
 * Returns an empty list rather than throwing if it cannot answer, because the
 * rail draws nothing for an empty list — a Home page missing one section is a
 * smaller failure than a Home page that does not render.
 *
 * Clips with no runtime yet are left out. YouTube reports none for a minute or
 * two after an upload while it processes, and the card's badge has nothing
 * honest to show for that: `0:00` reads as broken and a blank pill reads as a
 * bug. The next hourly sync brings the clip in with its length.
 */
export async function getShorts(limit = 12): Promise<Short[]> {
  try {
    const clips = await getShortClips(limit);
    return clips.filter((c) => (c.seconds ?? 0) > 0).map(toShort);
  } catch {
    return [];
  }
}

/** `48` → `0:48`, `72` → `1:12`. The badge in the card's top corner. */
export function shortDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
