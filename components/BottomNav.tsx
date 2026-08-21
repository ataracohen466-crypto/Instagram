"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, PlusSquare, Clapperboard } from "lucide-react";
import { useApp } from "@/lib/store";
import { avatarUrl } from "@/lib/seed";

export default function BottomNav() {
  const rawPath = usePathname();
  const profile = useApp((s) => s.profile);

  // Static export uses trailing slashes; normalise so route checks still match.
  const pathname =
    rawPath.length > 1 ? rawPath.replace(/\/$/, "") : rawPath;

  if (/^\/messages(\/.*)?$/.test(pathname)) return null;

  const items = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/explore", icon: Search, label: "Explore" },
    { href: "/create", icon: PlusSquare, label: "Create" },
    { href: "/activity", icon: Clapperboard, label: "Activity" },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ig-border bg-white">
      <div className="mx-auto flex h-[50px] w-full max-w-[470px] items-center justify-around px-4">
        {items.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} aria-label={label}>
              <Icon
                size={25}
                strokeWidth={active ? 2.5 : 1.8}
                fill={active ? "currentColor" : "none"}
              />
            </Link>
          );
        })}

        {profile && (
          <Link href={`/profile?u=${encodeURIComponent(profile.username)}`} aria-label="Profile">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl(profile.avatarSeed)}
              alt=""
              className={`h-6 w-6 rounded-full ${
                pathname.startsWith("/profile") ? "ring-2 ring-black" : ""
              }`}
            />
          </Link>
        )}
      </div>
    </nav>
  );
}
