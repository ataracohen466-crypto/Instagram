import type { Metadata, Viewport } from "next";
import { Source_Serif_4, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ThemeSync from "@/components/ThemeSync";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import AuthGate from "@/components/AuthGate";

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Inkwell — write your novel",
  description:
    "A distraction-free novel writing app: chapters and scenes, a story codex, daily word-count goals, and an AI writing partner when you want one.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Inkwell",
  },
};

// No themeColor here on purpose: the chosen theme (paper/sepia/ink) is a
// stored setting rather than an OS preference, so the tag is written by the
// init script below and kept current by ThemeSync. Emitting one here too
// would win on ordering and pin the chrome to the wrong color.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Applies the saved theme before first paint so there's no flash of the
// wrong palette while React hydrates.
const THEME_INIT_SCRIPT = `
(function () {
  var PAPER = { light: "#faf8f4", sepia: "#f1e7d0", dark: "#1a1917" };
  var theme = "light";
  try {
    var raw = localStorage.getItem("inkwell.theme");
    if (raw && PAPER[raw]) theme = raw;
  } catch (e) {}
  try {
    if (theme !== "light") document.documentElement.setAttribute("data-theme", theme);
    var m = document.createElement("meta");
    m.name = "theme-color";
    m.setAttribute("data-inkwell-theme-color", "");
    m.content = PAPER[theme];
    document.head.appendChild(m);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeSync />
        <ServiceWorkerRegister />
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
