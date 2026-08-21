"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardList,
  Dumbbell,
  GraduationCap,
  Home,
  NotebookPen,
} from "lucide-react";
import { cx } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/learn", label: "Learn", icon: GraduationCap },
  { href: "/notes", label: "Notes", icon: NotebookPen },
  { href: "/practice", label: "Practice", icon: Dumbbell },
  { href: "/tests", label: "Tests", icon: ClipboardList },
  { href: "/progress", label: "Progress", icon: BarChart3 },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-surface-line bg-white/95 backdrop-blur">
      <div className="mx-auto grid max-w-3xl grid-cols-6">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold uppercase tracking-wide transition",
                active ? "text-brand-600" : "text-ink-faint hover:text-ink-muted"
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 1.9} />
              {label}
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
