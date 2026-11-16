import localFont from "next/font/local";

// The reader is the one route that preloads the book face. The root layout
// declares DPS Shree (`--font-dps-shree`) with preload off, so Home and the rest
// no longer fetch two files they may never draw. Here the same two files are
// declared again with preload on: next/font preloads by the layout that calls it,
// and the file URL is content-hashed, so this warms the cache the root's face
// reads from rather than downloading a second copy. Keep the files, weights and
// size-adjust identical to the root layout's `dpsShree`.
const dpsShreePreload = localFont({
  variable: "--font-dps-shree-reader",
  src: [
    { path: "../../../fonts/dps-shree-medium.woff2", weight: "400", style: "normal" },
    { path: "../../../fonts/dps-shree-bold.woff2", weight: "700", style: "normal" },
  ],
  declarations: [{ prop: "size-adjust", value: "126%" }],
  adjustFontFallback: false,
  display: "swap",
  preload: true,
});

export default function ChapterLayout({ children }: { children: React.ReactNode }) {
  // `contents`: the wrapper takes part in no layout, it only carries the class.
  return <div className={`${dpsShreePreload.variable} contents`}>{children}</div>;
}
