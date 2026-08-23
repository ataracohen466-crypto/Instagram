import { Post, PostMedia } from "./types";

/**
 * The slides to render for a post.
 *
 * Every post made before carousels existed — the seeded AI feed included —
 * only has `imageSeed`/`imageUrl`, so those are folded into a single slide
 * here. That keeps one render path for old and new posts and means saved
 * accounts need no migration.
 */
export function postSlides(post: Post): PostMedia[] {
  if (post.media && post.media.length) return post.media;
  return [
    {
      id: `${post.id}-0`,
      kind: "image",
      url: post.imageUrl,
      seed: post.imageSeed,
    },
  ];
}

/** The slide used as the post's thumbnail in a profile grid. */
export function coverSlide(post: Post): PostMedia {
  return postSlides(post)[0];
}

export function hasMultipleSlides(post: Post): boolean {
  return postSlides(post).length > 1;
}

export function hasVideo(post: Post): boolean {
  return postSlides(post).some((s) => s.kind === "video");
}
