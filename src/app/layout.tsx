import type { Metadata, Viewport } from "next";
import {
  Instrument_Sans,
  Mukta,
  Newsreader,
  Tiro_Devanagari_Hindi,
} from "next/font/google";
import { Analytics } from "@/components/consent/ConsentBanner";
import { InlineScript } from "@/components/InlineScript";
import { AppShell } from "@/components/shell/AppShell";
import "./globals.css";

// Type system per the design spec (design_docs/screens): Instrument Sans for
// chrome and English, Newsreader for display/section titles, Tiro Devanagari
// Hindi for book content, Mukta for Devanagari inside chrome lines. Content faces are
// self-hosted via next/font and preloaded — no CLS from font swap (PRD §5).
const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

// Tiro ships a single 400 weight; Devanagari headings that ask for 600/700
// render via synthesized bold, which the spec's own comps accept.
const tiroDevanagariHindi = Tiro_Devanagari_Hindi({
  variable: "--font-tiro-devanagari",
  subsets: ["devanagari", "latin"],
  weight: "400",
  display: "swap",
  preload: true,
});

// Devanagari UI labels (chapter rows, tabs) and the alternate reading face
// (settings → Typeface). Not preloaded: it appears below the fold on most
// first paints, and preloading both Devanagari faces would cost every first
// paint a second download.
const mukta = Mukta({
  variable: "--font-mukta",
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://welfareinfo.net";

/**
 * How stale a page may be, for the whole app — **the one number to change.**
 *
 * The lowest `revalidate` across a route's layout and page wins, so this
 * ceiling reaches every page without touching any of them. Pages that need to
 * be fresher still say so themselves (`/connect` is 300); pages that say 900
 * are agreeing with this rather than overriding it.
 *
 * It cannot read an env var: Next requires the value to be statically
 * analyzable — even `60 * 10` is rejected — so a literal is the only form
 * this can take, and changing it means a deploy.
 *
 * **Alpha: 60.** Restore to 900 for release, together with `API_CACHE_SECONDS`
 * on the backend, which sets the same window on the API's own responses.
 */
export const revalidate = 60;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MD Study — A. Nagrajji's Literature",
    template: "%s · MD Study",
  },
  description:
    "Read A. Nagrajji's published books (Madhyasth Darshan), listen to discourses, and study translations and resources.",
  applicationName: "MD Study",
  manifest: "/manifest.webmanifest",
  // Without these an iOS home-screen install gets a screenshot for an icon and
  // a browser-chrome title bar — most of this audience installs from Safari.
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    title: "MD Study",
    // the reader paints its own background to the top edge (viewport-fit=cover)
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    type: "website",
    siteName: "MD Study",
    locale: "hi_IN",
  },
};

/**
 * **No `themeColor` here on purpose.**
 *
 * It is the phone's status bar, and it has to follow the reader's chosen
 * theme, which is device-local and unknowable on the server. Declaring it here
 * makes it Next-managed metadata, and Next re-applies a route's metadata on
 * every client-side navigation — so the static value overwrote whatever the
 * theme had set, and the bar snapped back to cream on the next tap while the
 * app stayed dark. `data-theme` and `color-scheme` survived, because those are
 * ours; this one tag was not.
 *
 * The tag is written by the pre-paint script below and kept in sync by
 * DisplayProvider. Nothing else may claim it.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Runs synchronously while the browser parses <head>, so the saved theme and
 * type settings are on <html> before the first paint. Without this a reader
 * with dark mode on gets a full-white flash every time a page loads — the one
 * moment where it is most jarring. See next/docs "Preventing Flash".
 *
 * It runs on **every** route now, not only inside a book. While the theme was
 * the reader's alone, painting the shell early was pointless; now the shell is
 * the thing that would flash. `colorScheme` moved out of the reader branch for
 * the same reason — it is what form controls, scrollbars and the iOS
 * overscroll gutter follow, and they are on every screen.
 *
 * It also writes `theme-color`, which the `viewport` export above deliberately
 * does not. Written here it is a tag nobody else owns, so a client-side
 * navigation cannot reset it; written there it was reset on every one.
 * THEME_BG in DisplayProvider must hold the same three values.
 *
 * The route test must match READER_ROUTE **and** PDF_READER_ROUTE in
 * lib/routes.ts — `ownsViewport` is the union, and `data-reading` is what
 * stops iOS rubber-banding to white behind either reader.
 */
const THEME_SCRIPT = `(function(){try{
var p=JSON.parse(localStorage.getItem("md.prefs.v1")||"{}");
var t=p.theme||"system";
if(t==="system")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
var d=document.documentElement;
d.setAttribute("data-theme",t);
d.style.colorScheme=t==="dark"?"dark":"light";
var m=document.querySelector('meta[name="theme-color"]');
if(!m){m=document.createElement("meta");m.setAttribute("name","theme-color");document.head.appendChild(m)}
m.setAttribute("content",t==="dark"?"#14110f":t==="sepia"?"#f5ebdc":"#fdfbf8");
d.setAttribute("data-reader-margin",String(p.margin==null?1:p.margin));
d.setAttribute("data-reader-face",p.face||"serif");
if(p.appTextScale)d.style.setProperty("--app-text-scale",String(p.appTextScale));
if(p.boldText)d.setAttribute("data-bold","1");
if(p.fontScale)d.style.setProperty("--reader-font-scale",String(p.fontScale));
if(p.lineHeight)d.style.setProperty("--reader-line-height",String(p.lineHeight));
if(/^\\/books\\/[^/]+\\/\\d+$|^\\/library\\/\\d+\\/read\\/\\d+$/.test(location.pathname))d.setAttribute("data-reading","1");
}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      data-reader-margin="1"
      data-reader-face="serif"
      suppressHydrationWarning
      className={`${instrumentSans.variable} ${newsreader.variable} ${tiroDevanagariHindi.variable} ${mukta.variable} h-full antialiased`}
    >
      <head>
        <InlineScript html={THEME_SCRIPT} />
      </head>
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
        <Analytics />
      </body>
    </html>
  );
}
