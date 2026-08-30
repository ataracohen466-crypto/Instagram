import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Inkwell — write your novel",
    short_name: "Inkwell",
    description: "A distraction-free novel writing app with chapters, a story codex, and an AI writing partner.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#faf8f4",
    theme_color: "#faf8f4",
    categories: ["productivity", "writing", "books"],
    icons: [
      { src: "/pwa/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
