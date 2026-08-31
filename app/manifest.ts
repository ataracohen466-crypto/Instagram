import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Bloom — mental health & wellness tracker",
    short_name: "Bloom",
    description:
      "A private, on-device mental health progress tracker for teens and young adults: daily check-ins, patterns, goals, journaling, and a skin wellness tracker.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f5fb",
    theme_color: "#f7f5fb",
    categories: ["health", "lifestyle", "wellness"],
    icons: [
      { src: "/pwa/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
