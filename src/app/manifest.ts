import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MD Study — मध्यस्थ दर्शन",
    short_name: "MD Study",
    description:
      "Read A. Nagrajji's books, listen to discourses, study translations and resources.",
    start_url: "/",
    display: "standalone",
    // browsers that support it get the edge-to-edge treatment; the rest fall
    // back down the list to plain standalone
    display_override: ["standalone", "minimal-ui"],
    background_color: "#faf7f2",
    theme_color: "#A54F14",
    lang: "hi",
    dir: "ltr",
    categories: ["books", "education", "lifestyle"],
    // long-press the installed icon — the three things people actually open
    shortcuts: [
      { name: "Read · ग्रंथ", short_name: "Read", url: "/books" },
      { name: "Search · खोज", short_name: "Search", url: "/search" },
      { name: "My Journey", short_name: "Journey", url: "/me" },
    ],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
