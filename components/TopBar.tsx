"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Heart, MessageCircle, PlusSquare, ChevronLeft } from "lucide-react";
import { useApp } from "@/lib/store";

function TopBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const profile = useApp((s) => s.profile);

  const isChat = /^\/messages\/chat\/?$/.test(pathname);
  if (isChat) return null;

  const onProfile = /^\/profile\/?$/.test(pathname);
  const viewingSomeoneElse =
    onProfile && searchParams.get("u") !== profile?.username;

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-ig-border bg-white">
      <div className="mx-auto flex h-[60px] w-full max-w-[470px] items-center justify-between px-4">
        {viewingSomeoneElse ? (
          <Link href="/" aria-label="Back">
            <ChevronLeft size={26} />
          </Link>
        ) : (
          <Link href="/" className="ig-logo text-[28px] leading-none">
            Instagr.ai
          </Link>
        )}

        <nav className="flex items-center gap-5">
          <Link href="/create" aria-label="Create post">
            <PlusSquare size={24} strokeWidth={1.8} />
          </Link>
          <Link href="/activity" aria-label="Activity">
            <Heart size={24} strokeWidth={1.8} />
          </Link>
          <Link href="/messages" aria-label="Messages" className="relative">
            <MessageCircle size={24} strokeWidth={1.8} />
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default function TopBar() {
  return (
    <Suspense
      fallback={
        <header className="fixed inset-x-0 top-0 z-40 h-[60px] border-b border-ig-border bg-white" />
      }
    >
      <TopBarInner />
    </Suspense>
  );
}
