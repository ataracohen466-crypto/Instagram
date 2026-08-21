"use client";

import Link from "next/link";
import { useApp } from "@/lib/store";
import { avatarUrl, photoUrl } from "@/lib/seed";
import Photo from "@/components/Photo";
import { timeAgo } from "@/lib/time";

export default function ActivityPage() {
  const posts = useApp((s) => s.posts);
  const profile = useApp((s) => s.profile);

  const events = posts
    .filter((p) => p.isMine)
    .flatMap((p) =>
      p.comments
        .filter((c) => !c.isMe)
        .map((c) => ({
          key: c.id,
          username: c.authorUsername,
          avatarSeed: c.authorAvatarSeed,
          text: `commented: ${c.text}`,
          createdAt: c.createdAt,
          thumb: p.imageUrl ?? photoUrl(p.imageSeed, 200),
          thumbSeed: p.imageSeed,
        }))
    )
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="bg-white">
      <h1 className="px-4 py-3 text-base font-semibold">Notifications</h1>

      {events.length === 0 ? (
        <div className="px-8 py-16 text-center text-sm text-ig-muted">
          <p>Nothing yet.</p>
          <p className="mt-1">
            When the AI accounts react to your posts, it shows up here.
          </p>
          <Link
            href="/create"
            className="mt-3 inline-block font-semibold text-ig-blue"
          >
            Share a photo
          </Link>
        </div>
      ) : (
        events.map((e) => (
          <div key={e.key} className="flex items-center gap-3 px-4 py-2">
            <Link href={`/profile/${e.username}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl(e.avatarSeed)}
                alt=""
                className="h-11 w-11 rounded-full"
              />
            </Link>
            <p className="flex-1 text-[14px] leading-[18px]">
              <Link href={`/profile/${e.username}`} className="font-semibold">
                {e.username}
              </Link>{" "}
              {e.text}{" "}
              <span className="text-ig-muted">{timeAgo(e.createdAt)}</span>
            </p>
            <Link href={`/profile/${profile?.username}`}>
              <Photo
                src={e.thumb}
                seed={e.thumbSeed}
                className="h-11 w-11 object-cover"
              />
            </Link>
          </div>
        ))
      )}
    </div>
  );
}
