// Static export so the app can be hosted on GitHub Pages (no server runtime).
// NEXT_PUBLIC_BASE_PATH is set to "/Instagram" by the Pages build, and left
// empty for local `next dev` / `next start`.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath,
  // GitHub Pages serves directories, so emit `route/index.html`.
  trailingSlash: true,
  images: {
    // No Next image optimiser exists on a static host.
    unoptimized: true,
  },
};

export default nextConfig;
