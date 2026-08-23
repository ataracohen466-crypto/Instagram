// Static export so the app can be hosted on GitHub Pages (no server runtime).
// NEXT_PUBLIC_BASE_PATH is set to "/Instagram" by the Pages build, and left
// empty for local `next dev` / `next start`.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath,
  env: {
    // Stamped into the bundle at build time so the running app can say which
    // build it is — the only reliable way to tell a stale cache from a bad
    // deploy once the site is on someone's phone.
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  // GitHub Pages serves directories, so emit `route/index.html`.
  trailingSlash: true,
  images: {
    // No Next image optimiser exists on a static host.
    unoptimized: true,
  },
};

export default nextConfig;
