"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

/** Keeps <html data-theme> in sync with the persisted setting after hydration. */
export default function ThemeSync() {
  const theme = useStore((s) => s.settings.theme);

  useEffect(() => {
    if (theme === "light") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme]);

  return null;
}
