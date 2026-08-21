"use client";

import Link from "next/link";
import { Camera } from "lucide-react";
import { useApp } from "@/lib/store";
import ReelCard from "@/components/ReelCard";

export default function ReelsPage() {
  const reels = useApp((s) => s.reels);

  return (
    <div className="fixed inset-0 z-30 h-[100dvh] w-full snap-y snap-mandatory overflow-y-scroll bg-black no-scrollbar">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 mx-auto flex w-full max-w-[470px] items-center justify-between px-4 pt-4">
        <span className="text-[19px] font-semibold text-white drop-shadow">
          Reels
        </span>
        <Link
          href="/reels/templates"
          aria-label="Create a reel from a template"
          className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[13px] font-semibold text-white backdrop-blur"
        >
          <Camera size={15} /> Create
        </Link>
      </div>

      {reels.map((reel) => (
        <ReelCard key={reel.id} reel={reel} />
      ))}
    </div>
  );
}
