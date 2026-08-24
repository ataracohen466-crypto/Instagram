"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PERSONAS } from "@/lib/personas";
import { useApp } from "@/lib/store";
import { avatarUrl } from "@/lib/seed";
import { activeItems } from "@/lib/stories";
import { deleteMedia } from "@/lib/media";

export default function StoryBar() {
  const router = useRouter();
  const profile = useApp((s) => s.profile);
  const myStory = useApp((s) => s.myStory);
  const pruneStories = useApp((s) => s.pruneStories);
  const hasMyStory = activeItems(myStory).length > 0;

  /**
   * Expired items are already hidden by activeItems, but they'd sit in the
   * vault forever with their clips still on disk. The feed is the one screen
   * every session lands on, so the sweep runs from here.
   */
  useEffect(() => {
    const sweep = () => {
      pruneStories().forEach((id) => {
        deleteMedia(id).catch(() => {
          /* the record is gone from state either way */
        });
      });
    };
    sweep();
    // Catches a story ageing out while the app is left open.
    const timer = setInterval(sweep, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [pruneStories]);

  return (
    <div className="no-scrollbar flex gap-4 overflow-x-auto border-b border-ig-border bg-white px-4 py-3">
      {profile && (
        <div className="flex w-[66px] shrink-0 flex-col items-center gap-1">
          <div className="relative h-[62px] w-[62px]">
            <button
              onClick={() =>
                router.push(hasMyStory ? "/stories/view?owner=me" : "/stories/create")
              }
              aria-label={hasMyStory ? "View your story" : "Add to story"}
              className={`h-full w-full rounded-full p-[2px] ${
                hasMyStory ? "story-ring" : "border border-ig-border"
              }`}
            >
              <div className="h-full w-full rounded-full bg-white p-[2px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl(profile.avatarSeed)}
                  alt=""
                  className="h-full w-full rounded-full object-cover"
                />
              </div>
            </button>
            <button
              onClick={() => router.push("/stories/create")}
              aria-label="Add to story"
              className="absolute bottom-0 right-0 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-white bg-ig-blue text-[13px] leading-none text-white"
            >
              +
            </button>
          </div>
          <span className="w-full truncate text-center text-[11px]">
            Your story
          </span>
        </div>
      )}

      {PERSONAS.map((p) => (
        <Link
          key={p.id}
          href={`/stories/view?owner=${encodeURIComponent(p.id)}`}
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
