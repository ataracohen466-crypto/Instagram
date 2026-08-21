import type { Metadata, Viewport } from "next";
import "./globals.css";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "TutorAI — study, practise, pass",
  description:
    "An AI tutor and exam-prep coach: turn your notes into summaries, flashcards, quizzes and a study plan that adapts to what you keep getting wrong.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TopBar />
        <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-[72px]">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
