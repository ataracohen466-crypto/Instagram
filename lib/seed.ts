import { PERSONAS } from "./personas";
import { Post, Comment } from "./types";
import { fallbackCaption, fallbackComment } from "./fallback";

let counter = 0;
export function uid(prefix = "id"): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function svgDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Avatars are generated locally so they render instantly and never 404. */
export function avatarUrl(seed: string): string {
  const h = hash(seed);
  const hue = h % 360;
  const initial = (seed.replace(/^me-/, "")[0] ?? "?").toUpperCase();
  return svgDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0%" stop-color="hsl(${hue} 72% 62%)"/>` +
      `<stop offset="100%" stop-color="hsl(${(hue + 48) % 360} 72% 46%)"/>` +
      `</linearGradient></defs>` +
      `<rect width="100" height="100" fill="url(#g)"/>` +
      `<text x="50" y="50" fill="#fff" font-family="Helvetica,Arial,sans-serif" ` +
      `font-size="46" font-weight="600" text-anchor="middle" dominant-baseline="central">${initial}</text>` +
      `</svg>`
  );
}

/** Shown while a photo loads, and kept if the photo host is unreachable. */
export function photoPlaceholder(seed: string): string {
  const h = hash(seed);
  const hue = h % 360;
  return svgDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0%" stop-color="hsl(${hue} 55% 72%)"/>` +
      `<stop offset="55%" stop-color="hsl(${(hue + 35) % 360} 58% 58%)"/>` +
      `<stop offset="100%" stop-color="hsl(${(hue + 75) % 360} 52% 44%)"/>` +
      `</linearGradient></defs>` +
      `<rect width="100" height="100" fill="url(#g)"/>` +
      `</svg>`
  );
}

export function photoUrl(seed: string, size = 1080): string {
  return `https://picsum.photos/seed/${encodeURIComponent(
    seed
  )}/${size}/${size}`;
}

export function buildSeedFeed(): Post[] {
  const now = Date.now();
  const posts: Post[] = [];

  PERSONAS.forEach((persona, i) => {
    const count = i < 3 ? 2 : 1;
    for (let j = 0; j < count; j++) {
      const commenters = PERSONAS.filter((p) => p.id !== persona.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 2);

      const comments: Comment[] = commenters.map((c) => ({
        id: uid("c"),
        authorUsername: c.username,
        authorAvatarSeed: c.avatarSeed,
        text: fallbackComment(),
        createdAt: now - Math.floor(Math.random() * 6_000_000),
      }));

      posts.push({
        id: uid("p"),
        authorUsername: persona.username,
        authorAvatarSeed: persona.avatarSeed,
        imageSeed: `${persona.id}-${j}-${persona.topic}`,
        caption: fallbackCaption(persona),
        likedBy: PERSONAS.filter(() => Math.random() > 0.4).map((p) => p.username),
        comments,
        createdAt: now - (i * 2 + j) * 3_600_000 - Math.floor(Math.random() * 3_600_000),
      });
    }
  });

  return posts.sort((a, b) => b.createdAt - a.createdAt);
}
