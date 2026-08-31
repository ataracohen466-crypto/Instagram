"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Flower2, Menu, X } from "lucide-react";
import { PRIMARY_NAV, MOBILE_TABS } from "@/lib/nav";
import { useStore } from "@/lib/store";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function SideNav() {
  const pathname = usePathname();
  const skinEnabled = useStore((s) => s.settings.skinModuleEnabled);
  const items = PRIMARY_NAV.filter((i) => skinEnabled || i.href !== "/skin");
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-surface px-4 py-6 md:flex">
      <Link href="/" className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-calm text-white">
          <Flower2 size={17} />
        </div>
        <span className="font-display text-lg font-semibold text-ink">Bloom</span>
      </Link>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto no-scrollbar">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-primary-soft text-primary"
                  : "text-ink-soft hover:bg-surface-raised hover:text-ink"
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.3 : 2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const skinEnabled = useStore((s) => s.settings.skinModuleEnabled);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)]">
          {MOBILE_TABS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium"
              >
                <Icon
                  size={21}
                  strokeWidth={active ? 2.4 : 1.8}
                  className={active ? "text-primary" : "text-ink-faint"}
                />
                <span className={active ? "text-primary" : "text-ink-faint"}>{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium"
          >
            <Menu size={21} strokeWidth={1.8} className="text-ink-faint" />
            <span className="text-ink-faint">More</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-3xl border-t border-border bg-surface p-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] animate-fade-in">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-base font-semibold text-ink">More</span>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
                className="rounded-full p-1.5 text-ink-faint hover:bg-surface-raised"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {PRIMARY_NAV.filter((i) => !MOBILE_TABS.some((t) => t.href === i.href) && (skinEnabled || i.href !== "/skin")).map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex flex-col items-center gap-2 rounded-2xl border px-2 py-4 text-xs font-medium transition ${
                      active
                        ? "border-primary/30 bg-primary-soft text-primary"
                        : "border-border bg-surface-raised text-ink-soft"
                    }`}
                  >
                    <Icon size={20} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
