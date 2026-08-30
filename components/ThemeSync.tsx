"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { ThemeName } from "@/lib/types";

const PAPER: Record<ThemeName, string> = {
  light: "#faf8f4",
  sepia: "#f1e7d0",
  dark: "#1a1917",
};

/** Keeps <html data-theme> and the browser chrome color in sync with the persisted setting. */
export default function ThemeSync() {
  const theme = useStore((s) => s.settings.theme);

  useEffect(() => {
    if (theme === "light") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }

    // Installed PWAs color their title bar / status bar from this tag, so an
    // active theme switch should repaint it, not just the page background.
    document.querySelectorAll('meta[name="theme-color"]').forEach((el) => el.remove());
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = PAPER[theme];
    document.head.appendChild(meta);
  }, [theme]);

  return null;
}
