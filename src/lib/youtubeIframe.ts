/**
 * The official YouTube IFrame Player API, loaded once for the whole app.
 *
 * **Official player only** (PRD §3.3): nothing here — or anywhere — downloads or
 * extracts a YouTube stream. Two screens need it and both need it the same way,
 * which is why the loader lives here rather than in either of them: a second
 * copy would append a second `<script>` and, worse, would race for the single
 * global `onYouTubeIframeAPIReady` callback the API insists on calling.
 *
 * The two callers want different things from the player object — the library's
 * `VideoView` asks it where the viewer is, so a two-hour sammelan can resume;
 * the shorts player asks it to start, stop and loop a 60-second clip. So the
 * interface below is the union of both, and each uses the half it needs.
 */

/** What our two players call on a `YT.Player`. */
export interface YouTubePlayer {
  getCurrentTime: () => number;
  getDuration: () => number;
  playVideo?: () => void;
  pauseVideo?: () => void;
  mute?: () => void;
  unMute?: () => void;
  isMuted?: () => boolean;
  getPlayerState?: () => number;
  /** frees the iframe; the element passed at construction is already gone */
  destroy?: () => void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (e: { target: YouTubePlayer }) => void;
            onStateChange?: (e: { data: number; target: YouTubePlayer }) => void;
            onError?: (e: { data: number }) => void;
          };
        }
      ) => YouTubePlayer;
      PlayerState?: {
        UNSTARTED?: number;
        PLAYING: number;
        PAUSED?: number;
        ENDED?: number;
        BUFFERING?: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;

/**
 * Resolves once `window.YT.Player` can be constructed. Safe to call from
 * anywhere, any number of times — the script is fetched at most once per page.
 */
export function loadIframeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      // Chained rather than replaced: the API calls exactly one global hook, and
      // whatever was already waiting on it must still be told.
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve();
      };
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    });
  }
  return apiPromise;
}
