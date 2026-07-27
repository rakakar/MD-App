import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MD Study — मध्यस्थ दर्शन",
    short_name: "MD Study",
    description:
      "Read A. Nagrajji's books, listen to discourses, study translations and resources.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7f2",
    theme_color: "#C8621A",
    lang: "hi",
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
