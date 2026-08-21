"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, Clock3, Music4, Trophy, TrendingDown, TrendingUp, ChevronRight } from "lucide-react";
import { useGuitarAI } from "@/lib/store";
import { LEVELS, levelIndex } from "@/lib/levels";
import { CHORDS } from "@/lib/chords";
import StatCard from "@/components/StatCard";
import ProgressRing from "@/components/ProgressRing";

export default function ProgressPage() {
  const [mounted, setMounted] = useState(false);
  const progress = useGuitarAI((s) => s.progress);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const level = LEVELS[levelIndex(progress.level)];
  const nextLesson = level.lessons.find((l) => !progress.completedLessonIds.includes(l.id));

  const accuracySamples = [
    ...progress.fixReports.map((r) => r.overallAccuracy),
    ...progress.gameScores.map((g) => g.accuracy),
  ];
  const avgAccuracy = accuracySamples.length ? Math.round(accuracySamples.reduce((a, b) => a + b, 0) / accuracySamples.length) : 0;

  const strongest = [...progress.chordsMastered]
    .sort((a, b) => (progress.chordReps[b] ?? 0) - (progress.chordReps[a] ?? 0))
    .slice(0, 4);

  return (
    <div className="space-y-8 py-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Progress</h1>
        <p className="mt-1 text-ink-300">Your growth, tracked honestly — no vanity metrics.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Level" value={level.title} icon={Trophy} accent="gold" />
        <StatCard label="Streak" value={`${progress.streakDays}d`} icon={Flame} accent="coral" />
        <StatCard label="Total practice" value={`${Math.round(progress.totalPracticeMinutes)}m`} icon={Clock3} accent="teal" />
        <StatCard label="Songs learned" value={progress.songsLearned.length} icon={Music4} accent="gold" />
      </div>

      <div className="card flex flex-col items-center gap-6 p-6 sm:flex-row">
        <ProgressRing percent={avgAccuracy} label="accuracy" size={110} />
        <div className="flex-1">
          <h3 className="font-display text-lg font-semibold">Average accuracy</h3>
          <p className="mt-1 text-sm text-ink-300">
            Averaged across your Fix My Playing sessions and Guitar Game rounds. Play more of either to sharpen this number.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <h3 className="flex items-center gap-2 font-display font-semibold text-teal-400">
            <TrendingUp size={18} /> Strongest
          </h3>
          {strongest.length === 0 ? (
            <p className="mt-2 text-sm text-ink-400">Keep practicing chords to see your strengths here.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-ink-200">
              {strongest.map((c) => (
                <li key={c}>{CHORDS[c]?.name ?? c} <span className="text-ink-500">· {progress.chordReps[c] ?? 0} reps</span></li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-5">
          <h3 className="flex items-center gap-2 font-display font-semibold text-coral-400">
            <TrendingDown size={18} /> Needs work
          </h3>
          {progress.weakAreas.length === 0 ? (
            <p className="mt-2 text-sm text-ink-400">No weak spots flagged yet — try Fix My Playing.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-ink-200">
              {progress.weakAreas.slice(0, 5).map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-display font-semibold">Chords learned ({progress.chordsMastered.length})</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.values(CHORDS).map((c) => {
            const mastered = progress.chordsMastered.includes(c.id);
            return (
              <span
                key={c.id}
                className={`rounded-full px-3 py-1 text-xs font-medium ${mastered ? "bg-gold-500/15 text-gold-400" : "bg-ink-800 text-ink-500"}`}
              >
                {c.id}
              </span>
            );
          })}
        </div>
      </div>

      {nextLesson && (
        <div className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-teal-400">Recommended next</p>
            <h3 className="mt-1 font-display text-lg font-semibold">{nextLesson.title}</h3>
            <p className="mt-1 text-sm text-ink-300">{nextLesson.summary}</p>
          </div>
          <Link href="/learning-path" className="btn-secondary shrink-0">
            Open lesson <ChevronRight size={16} />
          </Link>
        </div>
      )}

      {progress.gameScores.length > 0 && (
        <div className="card p-5">
          <h3 className="font-display font-semibold">Recent Guitar Game rounds</h3>
          <div className="mt-3 space-y-2">
            {progress.gameScores.slice(0, 5).map((g, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-ink-900/50 px-3 py-2 text-sm">
                <span className="text-ink-200">{g.songTitle}</span>
                <span className="text-ink-400">{g.accuracy}% · streak {g.bestStreak}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
