"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Music2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Reel } from "@/lib/reels";
import { Comment } from "@/lib/types";
import { useApp, MY_ID, uid } from "@/lib/store";
import { avatarUrl, photoUrl } from "@/lib/seed";
import { generateComments } from "@/lib/aiClient";
import Photo from "./Photo";

const FRAME_DURATION = 4200;

export default function ReelCard({ reel }: { reel: Reel }) {
  const profile = useApp((s) => s.profile);
  const toggleReelLike = useApp((s) => s.toggleReelLike);
  const addReelComment = useApp((s) => s.addReelComment);

  const containerRef = useRef<HTMLDivElement>(null);
  const lastTap = useRef(0);

  const [active, setActive] = useState(false);
  const [frame, setFrame] = useState(0);
  const [muted, setMuted] = useState(true);
  const [burst, setBurst] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState("");
  const [replying, setReplying] = useState(false);

  const liked = reel.likedBy.includes(MY_ID);
  const likeCount = reel.likedBy.length;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting && entry.intersectionRatio > 0.6),
      { threshold: [0, 0.6, 1] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!active || reel.frameSeeds.length < 2) return;
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % reel.frameSeeds.length);
    }, FRAME_DURATION);
    return () => clearInterval(id);
  }, [active, reel.frameSeeds.length]);

  function like() {
    if (!liked) toggleReelLike(reel.id);
    setBurst(true);
    setTimeout(() => setBurst(false), 900);
  }

  function onTap() {
    const now = Date.now();
    if (now - lastTap.current < 300) like();
    lastTap.current = now;
  }

  async function submitComment() {
    const text = draft.trim();
    if (!text || !profile) return;

    addReelComment(reel.id, {
      id: uid("rc"),
      authorUsername: profile.username,
      authorAvatarSeed: profile.avatarSeed,
      text,
      createdAt: Date.now(),
      isMe: true,
    });
    setDraft("");

    setReplying(true);
    try {
      const replies = await generateComments(
        `${reel.caption}\n\n${profile.username} just commented: "${text}"`,
        1,
        [reel.authorUsername]
      );
      const reply = replies[0];
      if (reply) {
        addReelComment(reel.id, {
          id: uid("rc"),
          authorUsername: reply.username,
          authorAvatarSeed: reply.avatarSeed,
          text: reply.text,
          createdAt: Date.now(),
        });
      }
    } catch {
      // Comment is already saved either way.
    } finally {
      setReplying(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative h-[100dvh] w-full shrink-0 snap-start snap-always overflow-hidden bg-black"
    >
      {reel.frameSeeds.map((seed, i) => (
        <div
          key={`${seed}-${i === frame ? "on" : "off"}`}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === frame ? "opacity-100" : "opacity-0"
          }`}
        >
          <Photo
            src={photoUrl(seed, 1080)}
            seed={seed}
            className={`h-full w-full object-cover ${
              active && i === frame ? "reel-ken-in" : ""
            }`}
          />
        </div>
      ))}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

      <div onClick={onTap} className="absolute inset-0" />

      {burst && (
        <Heart
          size={110}
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-heart-pop text-white drop-shadow-lg"
          fill="white"
        />
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          setMuted((m) => !m);
        }}
        aria-label={muted ? "Unmute" : "Mute"}
        className="absolute right-3 top-3 z-10 rounded-full bg-black/30 p-1.5 text-white"
      >
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>

      {/* Right action rail */}
      <div className="absolute bottom-[104px] right-3 z-10 flex flex-col items-center gap-5 text-white">
        <button onClick={like} className="flex flex-col items-center gap-1">
          <Heart
            size={28}
            className={liked ? "text-ig-red" : "text-white"}
            fill={liked ? "currentColor" : "none"}
          />
          <span className="text-[11px] font-semibold drop-shadow">
            {likeCount.toLocaleString()}
          </span>
        </button>
        <button
          onClick={() => setShowComments(true)}
          className="flex flex-col items-center gap-1"
        >
          <MessageCircle size={27} />
          <span className="text-[11px] font-semibold drop-shadow">
            {reel.comments.length}
          </span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <Send size={25} />
        </button>
        <button>
          <Bookmark size={25} />
        </button>
        <div className="h-7 w-7 overflow-hidden rounded-md border border-white/70">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl(reel.authorAvatarSeed)}
            alt=""
            className="h-full w-full animate-[spin_6s_linear_infinite] object-cover"
          />
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-[66px] pr-16 text-white">
        <Link
          href={`/profile?u=${encodeURIComponent(reel.authorUsername)}`}
          className="flex items-center gap-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl(reel.authorAvatarSeed)}
            alt=""
            className="h-8 w-8 rounded-full border border-white/70"
          />
          <span className="text-[14px] font-semibold">{reel.authorUsername}</span>
          <span className="rounded border border-white/70 px-2 py-0.5 text-[11px] font-semibold">
            Follow
          </span>
        </Link>
        <p className="mt-2 text-[13px] leading-[17px]">{reel.caption}</p>
        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-white/90">
          <Music2 size={13} /> {reel.audioLabel}
        </p>
      </div>

      {showComments && (
        <div
          className="absolute inset-0 z-20 flex items-end bg-black/40"
          onClick={() => setShowComments(false)}
        >
          <div
            className="max-h-[70%] w-full overflow-y-auto rounded-t-2xl bg-white text-ig-text"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 border-b border-ig-border bg-white px-4 py-3 text-center text-sm font-semibold">
              {reel.comments.length} comments
            </div>
            <div className="space-y-3 px-4 py-3">
              {reel.comments.map((c: Comment) => (
                <div key={c.id} className="flex items-start gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarUrl(c.authorAvatarSeed)}
                    alt=""
                    className="mt-0.5 h-7 w-7 rounded-full"
                  />
                  <p className="text-[13px] leading-[18px]">
                    <span className="font-semibold">{c.authorUsername}</span>{" "}
                    {c.text}
                  </p>
                </div>
              ))}
              {replying && (
                <p className="flex items-center gap-1 text-ig-muted">
                  <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-ig-muted" />
                  <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-ig-muted" />
                  <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-ig-muted" />
                </p>
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitComment();
              }}
              className="sticky bottom-0 flex items-center gap-2 border-t border-ig-border bg-white px-4 py-2.5"
            >
              {profile && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={avatarUrl(profile.avatarSeed)}
                  alt=""
                  className="h-7 w-7 rounded-full"
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
          </div>
        </div>
      )}
    </div>
  );
}
