import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Content Model v3 dissolved the audio and video shelves: a recording is a
   * file inside a folder now, and a YouTube link is a file whose kind is
   * `video`. There is no id space left to map the old URLs onto — the series
   * and playlist rows themselves are gone — so all of them land on the library.
   *
   * A redirect rather than an honest 404 because these were shipped nav slots.
   * They live in PWA histories and on installed home screens, and "not found"
   * on a tab someone saved reads as an app that broke rather than a shelf that
   * moved.
   */
  async redirects() {
    return [
      { source: "/audio", destination: "/resources", permanent: true },
      { source: "/audio/:path*", destination: "/resources", permanent: true },
      { source: "/videos", destination: "/resources", permanent: true },
      { source: "/videos/:path*", destination: "/resources", permanent: true },
    ];
  },
};

export default nextConfig;
