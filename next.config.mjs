/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Stamped into the bundle at build time so the running app can say which
    // build it is — the only reliable way to tell a stale cache from a bad
    // deploy once the site is live.
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
};

export default nextConfig;
