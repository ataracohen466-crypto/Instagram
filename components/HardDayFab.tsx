"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeartCrack } from "lucide-react";

export default function HardDayFab() {
  const pathname = usePathname();
  if (pathname === "/hard-day" || pathname === "/onboarding") return null;

  return (
    <Link
      href="/hard-day"
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-30 flex items-center gap-2 rounded-full bg-warn px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:opacity-90 active:scale-95 md:bottom-6 md:right-6"
    >
      <HeartCrack size={17} />
      <span className="hidden sm:inline">Having a hard day</span>
    </Link>
  );
}
