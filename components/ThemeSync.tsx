"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { ThemeName } from "@/lib/types";

const PAPER: Record<ThemeName, string> = {
  light: "#faf8f4",
  sepia: "#f1e7d0",
  dark: "#1a1917",
};

// Marks the one tag this component owns. Next.js renders its own metadata
// into <head>; removing those nodes here made React fail on removeChild
// during navigation, so this only ever touches its own tag.
const OWNED = "data-inkwell-theme-color";

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
    let meta = document.head.querySelector<HTMLMetaElement>(`meta[${OWNED}]`);
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.setAttribute(OWNED, "");
      document.head.appendChild(meta);
    }
    meta.content = PAPER[theme];

    // The real setting lives in the encrypted vault, which can't be read
    // until someone logs in — so the theme is mirrored here in the clear.
    // It lets the boot script paint the lock screen in the right theme
    // instead of flashing white. Nothing private about a color preference.
    try {
      localStorage.setItem("inkwell.theme", theme);
    } catch {
      /* storage disabled — the lock screen just starts on paper */
    }
  }, [theme]);

  return null;
}
