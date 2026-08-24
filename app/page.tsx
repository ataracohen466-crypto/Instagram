"use client";

import Link from "next/link";
import StoryBar from "@/components/StoryBar";
import PostCard from "@/components/PostCard";
import { useApp } from "@/lib/store";

export default function FeedPage() {
  const allPosts = useApp((s) => s.posts);
  // Unshared posts stay in the account but off the feed.
  const posts = allPosts.filter((p) => !p.archived);

  return (
    <>
      <StoryBar />
      {posts.length === 0 ? (
        <div className="px-8 py-20 text-center text-sm text-ig-muted">
          <p>Your feed is empty.</p>
          <Link href="/create" className="mt-2 inline-block font-semibold text-ig-blue">
            Share your first photo
          </Link>
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )}
    </>
  );
}
