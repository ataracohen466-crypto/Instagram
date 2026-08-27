"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Music2,
} from "lucide-react";
import { Post } from "@/lib/types";
import PostMediaCarousel from "./PostMediaCarousel";
import { postSlides } from "@/lib/postMedia";
import { useApp, MY_ID, uid } from "@/lib/store";
import { avatarUrl, photoUrl } from "@/lib/seed";
import { getMediaUrl } from "@/lib/media";
import { shareFile, safeFilename, extensionFor } from "@/lib/share";
import { timeAgo } from "@/lib/time";
import { generateComments } from "@/lib/aiClient";

export default function PostCard({ post }: { post: Post }) {
  const profile = useApp((s) => s.profile);
  const toggleLike = useApp((s) => s.toggleLike);
  const addComment = useApp((s) => s.addComment);
  const deletePost = useApp((s) => s.deletePost);
  const setPostArchived = useApp((s) => s.setPostArchived);
  const router = useRouter();

  const [draft, setDraft] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [expandCaption, setExpandCaption] = useState(false);
  const [burst, setBurst] = useState(false);
  const [replying, setReplying] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const lastTap = useRef(0);

  const muted = useApp((s) => s.reelsMuted);
  const cardRef = useRef<HTMLElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [onScreen, setOnScreen] = useState(false);

  // Decrypt the post's track only if it has one.
  useEffect(() => {
    let cancelled = false;
    if (!post.musicMediaId) {
      setMusicUrl(null);
      return;
    }
    getMediaUrl(post.musicMediaId).then((url) => {
      if (!cancelled) setMusicUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [post.musicMediaId]);

  /**
   * Only the post you're actually looking at plays. Without this every post
   * with a track would sound off at once as the feed scrolls.
   */
  useEffect(() => {
    const el = cardRef.current;
    if (!el || !post.musicMediaId) return;
    const observer = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting && entry.intersectionRatio > 0.6),
      { threshold: [0, 0.6, 1] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [post.musicMediaId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = post.musicVolume ?? 0.8;
    if (onScreen && !muted) audio.play().catch(() => {});
    else audio.pause();
  }, [onScreen, muted, musicUrl, post.musicVolume]);

  const liked = post.likedBy.includes(MY_ID);
  const likeCount = post.likedBy.length;
  const slides = postSlides(post);

  function like() {
    if (!post.likedBy.includes(MY_ID)) toggleLike(post.id);
    setBurst(true);
    setTimeout(() => setBurst(false), 900);
  }

  function onImageTap() {
    const now = Date.now();
    if (now - lastTap.current < 300) like();
    lastTap.current = now;
  }

  async function submitComment() {
    const text = draft.trim();
    if (!text || !profile) return;

    addComment(post.id, {
      id: uid("c"),
      authorUsername: profile.username,
      authorAvatarSeed: profile.avatarSeed,
      text,
      createdAt: Date.now(),
      isMe: true,
    });
    setDraft("");
    setShowAll(true);

    // The post's author replies to you.
    setReplying(true);
    try {
      const replies = await generateComments(
        `${post.caption}\n\n${profile.username} just commented: "${text}"`,
        1,
        [post.authorUsername]
      );
      const reply = replies[0];
      if (reply) {
        addComment(post.id, {
          id: uid("c"),
          authorUsername: reply.username,
          authorAvatarSeed: reply.avatarSeed,
          text: reply.text,
          createdAt: Date.now(),
        });
      }
    } catch {
      // Network hiccup — the user's own comment is already saved.
    } finally {
      setReplying(false);
    }
  }

  /** Hands the post's first slide to the OS share sheet, or downloads it. */
  async function shareOut() {
    if (sharing) return;
    setSharing(true);
    try {
      const slide = slides[0];
      const url = slide.mediaId
        ? await getMediaUrl(slide.mediaId)
        : slide.url ?? photoUrl(slide.seed ?? post.imageSeed, 1080);
      if (!url) return;
      const blob = await (await fetch(url)).blob();
      const result = await shareFile({
        blob,
        filename: safeFilename(
          post.caption || "post",
          extensionFor(blob, slide.kind === "video" ? "mp4" : "jpg")
        ),
        title: post.caption || "Post",
        text: post.caption || undefined,
      });
      if (result === "downloaded") {
        alert("Saved to your downloads — share it from there.");
      }
    } catch {
      alert("Couldn't prepare that post for sharing.");
    } finally {
      setSharing(false);
    }
  }

  const visibleComments = showAll ? post.comments : post.comments.slice(-2);
  const captionLong = post.caption.length > 90;

  return (
    <article ref={cardRef} className="border-b border-ig-border bg-white pb-3">
      <header className="flex items-center gap-3 px-4 py-3">
        <Link href={`/profile?u=${encodeURIComponent(post.authorUsername)}`}>
          <div className="story-ring h-8 w-8 rounded-full p-[2px]">
            <div className="h-full w-full rounded-full bg-white p-[1.5px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl(post.authorAvatarSeed)}
                alt=""
                className="h-full w-full rounded-full object-cover"
              />
            </div>
          </div>
        </Link>

        <div className="min-w-0 flex-1">
          <Link
            href={`/profile?u=${encodeURIComponent(post.authorUsername)}`}
            className="text-[13px] font-semibold"
          >
            {post.authorUsername}
          </Link>
          <span className="text-[13px] text-ig-muted">
            {" "}
            • {timeAgo(post.createdAt)}
          </span>
          {!post.isMine && (
            <p className="text-[11px] leading-3 text-ig-muted">AI account</p>
          )}
        </div>

        <div className="relative">
          <button onClick={() => setMenuOpen((v) => !v)} aria-label="More">
            <MoreHorizontal size={20} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-6 z-20 w-36 overflow-hidden rounded-lg border border-ig-border bg-white text-sm shadow-lg">
              {post.isMine ? (
                <>
                  <button
                    onClick={() => {
                      setPostArchived(post.id, true);
                      router.push(`/create?edit=${encodeURIComponent(post.id)}`);
                    }}
                    className="w-full px-4 py-2.5 text-left font-semibold"
                  >
                    Unshare &amp; edit
                  </button>
                  <button
                    onClick={() => deletePost(post.id)}
                    className="w-full px-4 py-2.5 text-left font-semibold text-ig-red"
                  >
                    Delete
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-full px-4 py-2.5 text-left"
                >
                  Not interested
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="relative">
        <PostMediaCarousel
          slides={slides}
          onTap={onImageTap}
          hasMusic={Boolean(post.musicMediaId)}
        />
        {post.musicMediaId && musicUrl && (
          /* eslint-disable-next-line jsx-a11y/media-has-caption */
          <audio ref={audioRef} src={musicUrl} loop className="hidden" />
        )}
        {post.musicTitle && (
          <span className="pointer-events-none absolute bottom-3 left-3 flex max-w-[70%] items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] text-white">
            <Music2 size={12} className="shrink-0" />
            <span className="truncate">{post.musicTitle}</span>
          </span>
        )}
        {burst && (
          <Heart
            size={96}
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-heart-pop text-white drop-shadow-lg"
            fill="white"
          />
        )}
      </div>

      <div className="flex items-center gap-4 px-4 pt-3">
        <button onClick={() => toggleLike(post.id)} aria-label="Like">
          <Heart
            size={24}
            strokeWidth={1.8}
            className={liked ? "text-ig-red" : ""}
            fill={liked ? "currentColor" : "none"}
          />
        </button>
        <button onClick={() => setShowAll(true)} aria-label="Comment">
          <MessageCircle size={24} strokeWidth={1.8} className="-scale-x-100" />
        </button>
        <button
          onClick={shareOut}
          disabled={sharing}
          aria-label="Share post outside the app"
          className="disabled:opacity-50"
        >
          <Send size={24} strokeWidth={1.8} />
        </button>
        <button className="ml-auto" aria-label="Save">
          <Bookmark size={24} strokeWidth={1.8} />
        </button>
      </div>

      <div className="px-4 pt-2 text-[14px]">
        <p className="font-semibold">
          {likeCount.toLocaleString()} {likeCount === 1 ? "like" : "likes"}
        </p>

        {post.caption && (
          <p className="mt-1 leading-[18px]">
            <Link
              href={`/profile?u=${encodeURIComponent(post.authorUsername)}`}
              className="font-semibold"
            >
              {post.authorUsername}
            </Link>{" "}
            {captionLong && !expandCaption ? (
              <>
                {post.caption.slice(0, 90)}…{" "}
                <button
                  onClick={() => setExpandCaption(true)}
                  className="text-ig-muted"
                >
                  more
                </button>
              </>
            ) : (
              post.caption
            )}
          </p>
        )}

        {post.comments.length > 2 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="mt-1 text-ig-muted"
          >
            View all {post.comments.length} comments
          </button>
        )}

        <div className="mt-1 space-y-1">
          {visibleComments.map((c) => (
            <p key={c.id} className="leading-[18px]">
              <Link
                href={c.isMe ? "#" : `/profile?u=${encodeURIComponent(c.authorUsername)}`}
                className="font-semibold"
              >
                {c.authorUsername}
              </Link>{" "}
              {c.text}
            </p>
          ))}
          {replying && (
            <p className="flex items-center gap-1 text-ig-muted">
              <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-ig-muted" />
              <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-ig-muted" />
              <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-ig-muted" />
            </p>
          )}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitComment();
        }}
        className="mt-2 flex items-center gap-2 px-4"
      >
        {profile && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={avatarUrl(profile.avatarSeed)}
            alt=""
            className="h-6 w-6 rounded-full"
          />
        )}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a comment…"
          className="flex-1 bg-transparent py-1 text-[14px] outline-none placeholder:text-ig-muted"
        />
        {draft.trim() && (
          <button
            type="submit"
            className="text-[14px] font-semibold text-ig-blue"
          >
            Post
          </button>
        )}
      </form>
    </article>
  );
}
