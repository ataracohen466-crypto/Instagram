import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import ThemeSync from "@/components/ThemeSync";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import AppShell from "@/components/AppShell";
import ChromeGate from "@/components/ChromeGate";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "Bloom — mental health & wellness tracker",
  description:
    "A private, on-device mental health progress tracker for teens and young adults: daily check-ins, gentle pattern insights, goals, journaling, a calming toolkit, and an integrated skin wellness tracker.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Bloom" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5fb" },
    { media: "(prefers-color-scheme: dark)", color: "#16131f" },
  ],
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var theme = "system";
    var lockRaw = localStorage.getItem("bloom.lock-meta");
    var encrypted = lockRaw && JSON.parse(lockRaw).encryptData;
    if (!encrypted) {
      var raw = localStorage.getItem("bloom.data");
      if (raw) theme = (JSON.parse(raw).settings || {}).theme || "system";
    }
    var dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.setAttribute("data-theme", "dark");
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeSync />
        <ServiceWorkerRegister />
        <AppShell>
          <ChromeGate>{children}</ChromeGate>
        </AppShell>
      </body>
    </html>
  );
}
