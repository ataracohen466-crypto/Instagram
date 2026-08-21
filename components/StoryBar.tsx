"use client";

import Link from "next/link";
import { PERSONAS } from "@/lib/personas";
import { useApp } from "@/lib/store";
import { avatarUrl } from "@/lib/seed";

export default function StoryBar() {
  const profile = useApp((s) => s.profile);

  return (
    <div className="no-scrollbar flex gap-4 overflow-x-auto border-b border-ig-border bg-white px-4 py-3">
      {profile && (
        <Link
          href="/create"
          className="flex w-[66px] shrink-0 flex-col items-center gap-1"
        >
          <div className="relative h-[62px] w-[62px] rounded-full border border-ig-border p-[2px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl(profile.avatarSeed)}
              alt=""
              className="h-full w-full rounded-full object-cover"
            />
            <span className="absolute bottom-0 right-0 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-white bg-ig-blue text-[13px] leading-none text-white">
              +
            </span>
          </div>
          <span className="w-full truncate text-center text-[11px]">
            Your story
          </span>
        </Link>
      )}

      {PERSONAS.map((p) => (
        <Link
          key={p.id}
          href={`/profile?u=${encodeURIComponent(p.username)}`}
          className="flex w-[66px] shrink-0 flex-col items-center gap-1"
        >
          <div className="story-ring h-[62px] w-[62px] rounded-full p-[2px]">
            <div className="h-full w-full rounded-full bg-white p-[2px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl(p.avatarSeed)}
                alt=""
                className="h-full w-full rounded-full object-cover"
              />
            </div>
          </div>
          <span className="w-full truncate text-center text-[11px]">
            {p.username}
          </span>
        </Link>
      ))}
    </div>
  );
}
