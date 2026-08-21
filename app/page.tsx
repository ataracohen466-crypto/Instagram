"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, Music4, Mic, Wrench, Gamepad2, Sparkles, Map, ChevronRight } from "lucide-react";
import { useGuitarAI } from "@/lib/store";
import { LEVELS, levelIndex } from "@/lib/levels";
import FeatureTile from "@/components/FeatureTile";
import StatCard from "@/components/StatCard";

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

  const level = LEVELS[levelIndex(progress.level)];
  const nextLesson = level.lessons.find((l) => !progress.completedLessonIds.includes(l.id)) ?? level.lessons[0];

  if (!mounted) return null;

  return (
    <div className="space-y-8 pb-6">
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">
          {greeting()}{profile.name ? `, ${profile.name}` : ""} <span aria-hidden>🎸</span>
        </h1>
        <p className="mt-1 text-ink-300">Ready to make some progress today?</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Streak" value={`${progress.streakDays} ${progress.streakDays === 1 ? "day" : "days"}`} icon={Flame} accent="coral" />
        <StatCard label="Total practice" value={`${Math.round(progress.totalPracticeMinutes)} min`} icon={Map} accent="teal" />
        <StatCard label="Chords mastered" value={progress.chordsMastered.length} icon={Music4} accent="gold" />
      </div>

      <div className="card relative overflow-hidden p-6 sm:p-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold-500/10 blur-2xl" />
        <p className="text-sm font-medium uppercase tracking-wide text-gold-400">Today's practice</p>
        <h2 className="mt-1 font-display text-xl font-semibold sm:text-2xl">{profile.minutesPerDay}-minute session</h2>
        <p className="mt-2 max-w-md text-sm text-ink-300">
          Built around {level.title.toLowerCase()} skills{progress.weakAreas[0] ? ` — with extra time on ${progress.weakAreas[0].toLowerCase()}` : ""}.
        </p>
        <Link href="/practice" className="btn-primary mt-5">
          Start practice <ChevronRight size={18} />
        </Link>
      </div>

      <div className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-teal-400">Continue learning</p>
          <h3 className="mt-1 font-display text-lg font-semibold">{nextLesson.title}</h3>
          <p className="mt-1 text-sm text-ink-300">{nextLesson.summary}</p>
        </div>
        <Link href="/learning-path" className="btn-secondary shrink-0">
          Open lesson <ChevronRight size={16} />
        </Link>
      </div>

      <div>
        <h3 className="mb-3 font-display text-lg font-semibold">Explore</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureTile href="/learn-song" title="Learn a Song" description="Turn any song idea into chords, tabs, and a strumming pattern." icon={Music4} accent="gold" />
          <FeatureTile href="/live-coach" title="Live Coach" description="Play and get real, mic-driven feedback as you go." icon={Mic} accent="teal" />
          <FeatureTile href="/fix-my-playing" title="Fix My Playing" description="Play a full song, then get a targeted improvement report." icon={Wrench} accent="coral" />
          <FeatureTile href="/game" title="Guitar Game" description="Turn practice into a rhythm game with streaks and records." icon={Gamepad2} accent="gold" />
          <FeatureTile href="/create-music" title="Create Music" description="Describe a song and get an original composition to learn." icon={Sparkles} accent="teal" />
          <FeatureTile href="/learning-path" title="Learning Path" description="Five levels from absolute beginner to advanced." icon={Map} accent="coral" />
        </div>
      </div>
    </div>
  );
}
