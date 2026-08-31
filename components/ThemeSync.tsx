"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

// Only toggles the data-theme attribute on <html> — a plain DOM attribute
// React never manages itself. It deliberately does NOT touch <meta
// name="theme-color">: that tag is rendered by Next's metadata system as a
// real React-managed node, and manually removing/re-adding it here would
// fight React's own reconciliation of that node on the next commit
// (surfaces as a "Cannot read properties of null (reading 'removeChild')"
// crash on the very next client-side navigation).
export default function ThemeSync() {
  const theme = useStore((s) => s.settings.theme);
  const hydrated = useStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;

    const apply = () => {
      const resolved =
        theme === "system"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : theme;

      if (resolved === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
    };

    apply();
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme, hydrated]);

  return null;
}
