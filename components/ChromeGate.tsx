"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SideNav, BottomNav } from "./Nav";
import HardDayFab from "./HardDayFab";
import InstallBanner from "./InstallBanner";
import { useStore } from "@/lib/store";

export default function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const onboardingComplete = useStore((s) => s.settings.onboardingComplete);
  const bare = pathname === "/onboarding";

  useEffect(() => {
    if (!onboardingComplete && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [onboardingComplete, pathname, router]);

  if (bare) return <>{children}</>;
  if (!onboardingComplete) return null;

  return (
    <div className="min-h-dvh md:pl-60">
      <SideNav />
      <InstallBanner />
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-4 sm:px-6 md:pb-10 md:pt-8">{children}</main>
      <BottomNav />
      <HardDayFab />
    </div>
  );
}
