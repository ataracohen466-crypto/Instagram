/**
 * Prefixes a path in `public/` with the deployment base path.
 * Next rewrites `<Link href>` automatically but not plain `src` strings.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function assetUrl(path: string): string {
  return `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
}
