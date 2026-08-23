"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useGuitarAI } from "@/lib/store";
import { PATH_META, type PathKey } from "@/lib/curriculum";
import ProgressRing from "@/components/ProgressRing";

const PATH_KEYS: PathKey[] = ["chords", "notes", "tabs"];

export default function LearningPathHome() {
  const [mounted, setMounted] = useState(false);
  const paths = useGuitarAI((s) => s.progress.paths);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="space-y-6 py-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Learning Path</h1>
        <p className="mt-1 text-ink-300">Three ways to learn guitar — pick one, or work on all three side by side.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {PATH_KEYS.map((key) => {
          const meta = PATH_META[key];
          const p = paths[key];
          const percent = Math.round((p.completedLessonIds.length / 1000) * 100);
          return (
            <Link key={key} href={`/learning-path/${key}`} className="card flex flex-col items-center gap-4 p-6 text-center transition hover:-translate-y-0.5 hover:border-gold-500">
              <span className="text-3xl">{meta.icon}</span>
              <div>
                <h2 className="font-display text-lg font-semibold">{meta.label}</h2>
                <p className="mt-1 text-sm text-ink-300">{meta.description}</p>
              </div>
              <ProgressRing percent={percent} label={`level ${p.unlockedLevel}/20`} size={84} />
              <span className="flex items-center gap-1 text-sm font-medium text-gold-400">
                {p.completedLessonIds.length > 0 ? "Continue" : "Start"} <ChevronRight size={16} />
              </span>
            </Link>
          );
        })}
      </div>

      <div className="card p-5 text-sm text-ink-300">
        Each path has 20 levels, 10 parts per level, 5 lessons per part — 1,000 lessons that keep introducing new material and
        then drilling it in with transitions, strumming/rhythm, speed ramps, and mixed review, the same way a real method book
        paces things.
      </div>
    </div>
  );
}
