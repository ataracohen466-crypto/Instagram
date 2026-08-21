import type { Metadata, Viewport } from "next";
import { Sora, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import OnboardingGate from "@/components/OnboardingGate";

const sora = Sora({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600", "700"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "600"] });

export const metadata: Metadata = {
  title: "Guitar AI — your AI guitar teacher",
  description: "An AI-powered guitar teacher: live listening feedback, hand-tracking technique tips, song arrangements, a rhythm game, and a real practice plan that adapts to you.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0b0d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${inter.variable} ${mono.variable}`}>
      <body className="font-sans">
        <OnboardingGate>
          <Nav />
          <main className="min-h-dvh pb-20 pt-4 md:ml-64 md:pb-10">
            <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">{children}</div>
          </main>
        </OnboardingGate>
      </body>
    </html>
  );
}
