"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Timer,
  Map,
  Mic,
  Music4,
  Wrench,
  Gamepad2,
  Sparkles,
  BarChart3,
  Guitar,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/practice", label: "Practice", icon: Timer },
  { href: "/learning-path", label: "Learning Path", icon: Map },
  { href: "/live-coach", label: "Live Coach", icon: Mic },
  { href: "/learn-song", label: "Learn a Song", icon: Music4 },
  { href: "/fix-my-playing", label: "Fix My Playing", icon: Wrench },
  { href: "/game", label: "Guitar Game", icon: Gamepad2 },
  { href: "/create-music", label: "Create Music", icon: Sparkles },
  { href: "/progress", label: "Progress", icon: BarChart3 },
];

// Mobile bottom bar shows a curated subset; the rest live behind "More" on the sidebar drawer.
const MOBILE_ITEMS = [NAV_ITEMS[0], NAV_ITEMS[1], NAV_ITEMS[3], NAV_ITEMS[6], NAV_ITEMS[8]];

export default function Nav() {
  const pathname = usePathname();

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-ink-700 bg-ink-900/80 backdrop-blur md:flex">
        <div className="flex items-center gap-2 px-6 py-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 text-ink-950 shadow-glow">
            <Guitar size={20} strokeWidth={2.25} />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight text-ink-100">Guitar AI</span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-ink-800 text-gold-400"
                    : "text-ink-300 hover:bg-ink-800/60 hover:text-ink-100"
                }`}
              >
                <Icon size={18} strokeWidth={2} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="px-6 py-5 text-xs text-ink-400">
          Your teacher, always tuned in.
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-ink-700 bg-ink-900/95 backdrop-blur md:hidden">
        {MOBILE_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                active ? "text-gold-400" : "text-ink-400"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.25 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
