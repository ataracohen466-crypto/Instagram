"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, Music4, Mic, Wrench, Gamepad2, Sparkles, ChevronRight } from "lucide-react";
import { useGuitarAI } from "@/lib/store";
import { PATH_META, type PathKey } from "@/lib/curriculum";
import FeatureTile from "@/components/FeatureTile";
import StatCard from "@/components/StatCard";

const PATH_KEYS: PathKey[] = ["chords", "notes", "tabs"];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const profile = useGuitarAI((s) => s.profile);
  const progress = useGuitarAI((s) => s.progress);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="space-y-8 pb-6">
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">
          {greeting()}{profile.name ? `, ${profile.name}` : ""} <span aria-hidden>🎸</span>
        </h1>
        <p className="mt-1 text-ink-300">Pick a path to learn, or jump into a song you already know.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {PATH_KEYS.map((key) => {
          const meta = PATH_META[key];
          const p = progress.paths[key];
          return (
            <Link key={key} href={`/learning-path/${key}`} className="card flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:border-gold-500">
              <span className="text-2xl">{meta.icon}</span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-base font-semibold">{meta.label}</h2>
                <p className="mt-0.5 truncate text-xs text-ink-400">Level {p.unlockedLevel}/20 · {p.completedLessonIds.length} lessons done</p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-ink-500" />
            </Link>
          );
        })}
      </div>

      <Link href="/learn-song" className="card flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:border-teal-500">
        <span className="text-2xl">⭐</span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-semibold">Popular Songs</h2>
          <p className="mt-0.5 text-xs text-ink-400">Freestyle: play real, well-known songs by chords, tab, or notes.</p>
        </div>
        <ChevronRight size={18} className="shrink-0 text-ink-500" />
      </Link>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Streak" value={`${progress.streakDays} ${progress.streakDays === 1 ? "day" : "days"}`} icon={Flame} accent="coral" />
        <StatCard label="Total practice" value={`${Math.round(progress.totalPracticeMinutes)} min`} icon={Music4} accent="teal" />
        <StatCard label="Chords mastered" value={progress.chordsMastered.length} icon={Music4} accent="gold" />
      </div>

      <div className="card relative overflow-hidden p-6 sm:p-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold-500/10 blur-2xl" />
        <p className="text-sm font-medium uppercase tracking-wide text-gold-400">Today's practice</p>
        <h2 className="mt-1 font-display text-xl font-semibold sm:text-2xl">{profile.minutesPerDay}-minute session</h2>
        <p className="mt-2 max-w-md text-sm text-ink-300">
          A generated practice session{progress.weakAreas[0] ? `, with extra time on ${progress.weakAreas[0].toLowerCase()}` : ""}.
        </p>
        <Link href="/practice" className="btn-primary mt-5">
          Start practice <ChevronRight size={18} />
        </Link>
      </div>

      <div>
        <h3 className="mb-3 font-display text-lg font-semibold">More ways to play</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureTile href="/live-coach" title="Live Coach" description="Play and get real, mic-driven feedback as you go." icon={Mic} accent="teal" />
          <FeatureTile href="/fix-my-playing" title="Fix My Playing" description="Play a full song, then get a targeted improvement report." icon={Wrench} accent="coral" />
          <FeatureTile href="/game" title="Guitar Game" description="Turn practice into a rhythm game with streaks and records." icon={Gamepad2} accent="gold" />
          <FeatureTile href="/create-music" title="Create Music" description="Describe a song and get an original composition to learn." icon={Sparkles} accent="teal" />
        </div>
      </div>
    </div>
  );
}
