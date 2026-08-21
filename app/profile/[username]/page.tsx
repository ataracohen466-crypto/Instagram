"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Grid3x3, Bookmark, UserSquare, Settings } from "lucide-react";
import { getPersona } from "@/lib/personas";
import { useApp } from "@/lib/store";
import { avatarUrl, photoUrl } from "@/lib/seed";
import Photo from "@/components/Photo";

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = decodeURIComponent(params.username);

  const profile = useApp((s) => s.profile);
  const posts = useApp((s) => s.posts);
  const resetEverything = useApp((s) => s.resetEverything);

  const persona = getPersona(username);
  const isMe = profile?.username === username;

  const [following, setFollowing] = useState(true);

  if (!persona && !isMe) {
    return (
      <p className="px-8 py-20 text-center text-sm text-ig-muted">
        Sorry, this page isn&apos;t available.
      </p>
    );
  }

  const displayName = isMe ? profile!.name : persona!.name;
  const avatarSeed = isMe ? profile!.avatarSeed : persona!.avatarSeed;
  const bio = isMe ? profile!.bio : persona!.bio;

  const myPosts = posts.filter((p) => p.authorUsername === username);
  const followers = isMe
    ? myPosts.reduce((n, p) => n + p.likedBy.length, 0)
    : 40_000 + (persona!.username.length * 8123) % 900_000;

  return (
    <div className="bg-white">
      <div className="flex items-center gap-4 px-4 pt-4">
        <div className="story-ring h-[88px] w-[88px] shrink-0 rounded-full p-[3px]">
          <div className="h-full w-full rounded-full bg-white p-[2px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl(avatarSeed)}
              alt=""
              className="h-full w-full rounded-full object-cover"
            />
          </div>
        </div>

        <div className="grid flex-1 grid-cols-3 text-center">
          <div>
            <p className="text-base font-semibold">{myPosts.length}</p>
            <p className="text-[13px]">posts</p>
          </div>
          <div>
            <p className="text-base font-semibold">
              {followers.toLocaleString()}
            </p>
            <p className="text-[13px]">followers</p>
          </div>
          <div>
            <p className="text-base font-semibold">{isMe ? 8 : 342}</p>
            <p className="text-[13px]">following</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-3">
        <p className="text-[13px] font-semibold">{displayName}</p>
        {!isMe && (
          <p className="text-[13px] text-ig-muted">
            AI account · {persona!.topic}
          </p>
        )}
        <p className="whitespace-pre-wrap text-[13px] leading-[18px]">{bio}</p>
      </div>

      <div className="flex gap-1.5 px-4 pt-4">
        {isMe ? (
          <>
            <Link
              href="/create"
              className="flex-1 rounded-lg bg-[#efefef] py-1.5 text-center text-sm font-semibold"
            >
              New post
            </Link>
            <button
              onClick={() => {
                if (confirm("Log out and erase this browser's feed?")) {
                  resetEverything();
                }
              }}
              className="rounded-lg bg-[#efefef] px-3 py-1.5"
              aria-label="Settings"
            >
              <Settings size={16} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setFollowing((v) => !v)}
              className={`flex-1 rounded-lg py-1.5 text-sm font-semibold ${
                following
                  ? "bg-[#efefef] text-ig-text"
                  : "bg-ig-blue text-white"
              }`}
            >
              {following ? "Following" : "Follow"}
            </button>
            <Link
              href={`/messages/${persona!.id}`}
              className="flex-1 rounded-lg bg-[#efefef] py-1.5 text-center text-sm font-semibold"
            >
              Message
            </Link>
          </>
        )}
      </div>

      <div className="mt-4 flex border-t border-ig-border">
        <button className="flex flex-1 justify-center border-t border-black py-2.5">
          <Grid3x3 size={22} strokeWidth={1.5} />
        </button>
        <button className="flex flex-1 justify-center py-2.5 text-ig-muted">
          <Bookmark size={22} strokeWidth={1.5} />
        </button>
        <button className="flex flex-1 justify-center py-2.5 text-ig-muted">
          <UserSquare size={22} strokeWidth={1.5} />
        </button>
      </div>

      {myPosts.length === 0 ? (
        <p className="px-8 py-16 text-center text-sm text-ig-muted">
          No posts yet.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-[2px]">
          {myPosts.map((p) => (
            <div key={p.id} className="aspect-square bg-ig-bg">
              <Photo
                src={p.imageUrl ?? photoUrl(p.imageSeed, 400)}
                seed={p.imageSeed}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
