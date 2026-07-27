import type { Metadata, Viewport } from "next";
import { Geist, Noto_Serif_Devanagari } from "next/font/google";
import { Analytics } from "@/components/consent/ConsentBanner";
import { AppShell } from "@/components/shell/AppShell";
import "./globals.css";

// UI chrome: Latin sans; Hindi content: Noto Serif Devanagari, self-hosted
// via next/font and preloaded — no CLS from font swap (PRD §5).
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const notoSerifDevanagari = Noto_Serif_Devanagari({
  variable: "--font-noto-serif-devanagari",
  subsets: ["devanagari", "latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  preload: true,
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
  openGraph: {
    type: "website",
    siteName: "MD Study",
    locale: "hi_IN",
  },
};

export const viewport: Viewport = {
  themeColor: "#C8621A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${notoSerifDevanagari.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
        <Analytics />
      </body>
    </html>
  );
}
