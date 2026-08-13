import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MD Study — Madhyasth Darshan",
    short_name: "MD Study",
    description:
      "Read A. Nagrajji's books, listen to discourses, study translations and resources.",
    start_url: "/",
    display: "standalone",
    // browsers that support it get the edge-to-edge treatment; the rest fall
    // back down the list to plain standalone
    display_override: ["standalone", "minimal-ui"],
    background_color: "#fdfbf8",
    // The two must agree, and both are the light surface rather than the
    // accent. This pair is what the installed app shows *before* a page runs —
    // the splash and the first frame of the system bars — and the page's own
    // `theme-color` takes over the moment the pre-paint script runs. Terracotta
    // here meant every cold start flashed a band of accent above a cream app,
    // and now that the app can be dark it flashed above a black one too.
    //
    // A static manifest cannot know a device-local theme, so a dark reader
    // still gets a light splash for that one frame. That is the trade the
    // format forces; agreeing with `background_color` at least makes it one
    // colour rather than two.
    theme_color: "#fdfbf8",
    lang: "hi",
    dir: "ltr",
    categories: ["books", "education", "lifestyle"],
    // long-press the installed icon — the three things people actually open
    shortcuts: [
      { name: "Read", short_name: "Read", url: "/books" },
      { name: "Search", short_name: "Search", url: "/search" },
      { name: "My Journey", short_name: "Journey", url: "/me" },
    ],
    // `any` and `maskable` are two different drawings of the same mark, and
    // that is the point: the plain icons keep the designer's rounded tile with
    // its corners clear, while the maskable one bleeds terracotta to all four
    // edges so Android's circle crop lands on background instead of cutting
    // the tile's corners off. Pointing both purposes at one file — which this
    // did — means one of the two is wrong wherever it is shown.
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
