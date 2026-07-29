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
// Hindi for मूल content, Mukta for Devanagari UI labels. Content faces are
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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MD Study — A. Nagrajji's Literature",
    template: "%s · MD Study",
  },
  description:
    "Read A. Nagrajji's published books (मध्यस्थ दर्शन), listen to discourses, and study translations and resources.",
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

export const viewport: Viewport = {
  themeColor: "#A64E12",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Runs synchronously while the browser parses <head>, so the saved theme and
 * type settings are on <html> before the first paint. Without this a reader
 * with dark mode on gets a full-white flash every time a chapter loads — the
 * one moment where it is most jarring. See next/docs "Preventing Flash".
 * The route test must match READER_ROUTE in lib/routes.ts.
 */
const THEME_SCRIPT = `(function(){try{
var p=JSON.parse(localStorage.getItem("md.prefs.v1")||"{}");
var t=p.theme||"system";
if(t==="system")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
var d=document.documentElement;
d.setAttribute("data-reader-theme",t);
d.setAttribute("data-reader-margin",String(p.margin==null?1:p.margin));
d.setAttribute("data-reader-face",p.face||"serif");
if(p.fontScale)d.style.setProperty("--reader-font-scale",String(p.fontScale));
if(p.lineHeight)d.style.setProperty("--reader-line-height",String(p.lineHeight));
if(/^\\/books\\/[^/]+\\/\\d+$/.test(location.pathname)){
d.style.colorScheme=t==="dark"?"dark":"light";
d.setAttribute("data-reading","1");
}
}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-reader-theme="light"
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
