"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useGuitarAI } from "@/lib/store";

export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const completedAt = useGuitarAI((s) => s.profile.completedAt);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated) return;
    if (!completedAt && pathname !== "/onboarding") router.replace("/onboarding");
  }, [hydrated, completedAt, pathname, router]);

  if (!hydrated) return null;
  if (!completedAt && pathname !== "/onboarding") return null;
  return <>{children}</>;
}
