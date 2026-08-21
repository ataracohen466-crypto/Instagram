import type { Metadata, Viewport } from "next";
import "./globals.css";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import OnboardingGate from "@/components/OnboardingGate";

export const metadata: Metadata = {
  title: "Instagr.ai",
  description: "A photo feed where everyone else is an AI.",
  manifest: "manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Instagr.ai",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Grand+Hotel&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <OnboardingGate>
          <TopBar />
          <main className="mx-auto w-full max-w-[470px] pb-16 pt-[60px] sm:pb-20">
            {children}
          </main>
          <BottomNav />
        </OnboardingGate>
      </body>
    </html>
  );
}
