import type { CapacitorConfig } from "@capacitor/cli";

/*
 * The native shells (`android/`, `ios/`) do not bundle the app — they load it
 * over the network from `server.url`.
 *
 * Bundling would mean `output: "export"`, and this app cannot be exported: it
 * runs on ISR (`revalidate` in fourteen route files), `dynamicParams: true`
 * on the library, books and reader routes, and the `/audio` → `/resources`
 * redirects in `next.config.ts` — every one of them is on Next's unsupported
 * list for a static export. Exporting would mean moving the whole tree to
 * client-side fetching and making the web app slower and SEO-blind so that a
 * store build could exist. The shell loads the same deployment the browser
 * does instead, and the web app is not touched at all.
 *
 * What that costs: a cold start needs the network. The service worker in
 * `public/sw.js` already covers this — it caches the shell, the offline page
 * and downloaded chapter audio, and WKWebView honours service workers on a
 * remote https origin, so iOS gets the same offline reading Android does.
 *
 * Auth crosses over unchanged: `src/lib/me.ts` carries the session in an
 * `X-Session-Token` header out of localStorage, not a cookie, so none of the
 * third-party-cookie rules that shaped that decision apply differently here.
 */

/*
 * The deployed app. A build pointed here needs no dev server and no shared
 * wifi — it works on mobile data, like any installed app should.
 *
 * The backend allows this exact origin (`Access-Control-Allow-Origin`, with
 * `x-session-token` among the allowed headers), so signed-in reading crosses
 * into the shell unchanged.
 *
 * To point a build at this machine's dev server instead — LAN address, not
 * `localhost`, which on a phone means the phone:
 *
 *     CAP_SERVER_URL=http://192.168.31.82:3000 npx cap sync android
 */
const SERVER_URL =
  process.env.CAP_SERVER_URL ?? "https://md-app-liart.vercel.app";

const config: CapacitorConfig = {
  appId: "net.welfareinfo.mdstudy",
  appName: "MD Study",

  // Unused while `server.url` is set — every asset comes from the server. It
  // must still name a real directory for the CLI's sake.
  webDir: "public",

  server: {
    url: SERVER_URL,
    // Plain http to the dev server. Android blocks cleartext by default and
    // this is the flag that opens it; drop both this and the http URL before
    // any build that leaves this machine.
    cleartext: SERVER_URL.startsWith("http://"),
  },

  /*
   * No `android` or `ios` block on purpose.
   *
   * Edge-to-edge needs no setting — Android enforces it from 15 onwards and
   * the web layer already draws to the full height, which the reader on a
   * booted emulator confirms.
   *
   * iOS needs none either. The worry was `ios.contentInset`: the app positions
   * itself with `env(safe-area-inset-*)`, and if WKWebView added its own
   * insets the padding would be applied twice. Capacitor's default is `never`,
   * which adds no inset of its own (`CAPInstanceDescriptor.m`), so the
   * default is already the value this app needs. The first device run, on an
   * iPhone 14 Plus under iOS 27 (October 2026), showed nothing doubled.
   *
   * The one iOS-only fix is native, not config: iOS 26+ frosts web content
   * under the status bar, and `MainViewController` in
   * `ios/App/App/SceneDelegate.swift` switches that off.
   */
};

export default config;
