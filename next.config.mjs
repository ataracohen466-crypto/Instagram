/**
 * TutorAI runs as a normal Next.js server app (Vercel or `next start`) because
 * the Claude calls live in server-side API routes under `app/api/ai/*` — the
 * Anthropic key must never reach the browser, so a static export is not an
 * option here.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
