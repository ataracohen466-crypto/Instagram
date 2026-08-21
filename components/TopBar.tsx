"use client";

import Link from "next/link";
import { Flame, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";

export default function TopBar() {
  const hydrated = useStore((s) => s.hydrated);
  const profile = useStore((s) => s.profile);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-surface-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Sparkles size={16} />
          </span>
          <span className="text-[17px] font-bold tracking-tight text-ink">
            Tutor<span className="text-brand-600">AI</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {hydrated ? (
            <>
              <Link
                href="/progress"
                className="chip"
                title={`${profile.xp} XP total`}
              >
                Lv {profile.level}
              </Link>
              <Link
                href="/progress"
                className="chip gap-1"
                title="Study streak"
              >
                <Flame
                  size={13}
                  className={
                    profile.streakDays > 0 ? "text-orange-500" : "text-ink-faint"
                  }
                />
                {profile.streakDays}
              </Link>
            </>
          ) : (
            <div className="skeleton h-7 w-24" />
          )}
        </div>
      </div>
    </header>
  );
}
