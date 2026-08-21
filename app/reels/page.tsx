"use client";

import { useApp } from "@/lib/store";
import ReelCard from "@/components/ReelCard";

export default function ReelsPage() {
  const reels = useApp((s) => s.reels);

  return (
    <div className="fixed inset-0 z-30 h-[100dvh] w-full snap-y snap-mandatory overflow-y-scroll bg-black no-scrollbar">
      {reels.map((reel) => (
        <ReelCard key={reel.id} reel={reel} />
      ))}
    </div>
  );
}
