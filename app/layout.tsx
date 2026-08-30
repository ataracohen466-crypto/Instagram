import type { Metadata, Viewport } from "next";
import { Source_Serif_4, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ThemeSync from "@/components/ThemeSync";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f4" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1917" },
  ],
};

// Applies the saved theme before first paint so there's no flash of the
// wrong palette while React hydrates.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var raw = localStorage.getItem("inkwell.store");
    if (!raw) return;
    var theme = JSON.parse(raw).state.settings.theme;
    if (theme && theme !== "light") {
      document.documentElement.setAttribute("data-theme", theme);
    }
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
        {children}
      </body>
    </html>
  );
}
