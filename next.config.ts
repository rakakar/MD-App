import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Where the project starts, stated rather than guessed.
   *
   * Turbopack infers the root by walking up for a lockfile, so a stray
   * `package-lock.json` anywhere above this folder wins — a scratch project in
   * the home directory is enough to make `/Users/<you>` the root. Nothing fails
   * loudly when that happens: the dev server starts, prints a warning most
   * people scroll past, and then watches an entire home directory.
   *
   * Pinning it keeps the answer the same on every machine regardless of what
   * else is lying around above the checkout.
   */
  turbopack: {
    root: path.join(__dirname),
  },

  /**
   * Who may load dev resources cross-origin. Development only — the deployed
   * app never sees this.
   *
   * The native shells load the app from `server.url`, so pointing a debug
   * build at this dev server (see `capacitor.config.ts`) makes the request
   * cross-origin and Next blocks HMR and the dev endpoints by default. The
   * page then arrives as SSR HTML that never finishes becoming an app: the
   * shell renders and the routed content stays empty, with the reason only in
   * the terminal — nothing visible on the device says why.
   *
   * `10.0.2.2` is the emulator's name for this machine; the LAN address is for
   * a real phone on the same wifi.
   */
  allowedDevOrigins: ["10.0.2.2", "192.168.31.82"],

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
