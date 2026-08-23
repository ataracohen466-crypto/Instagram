"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { Lock, CheckCircle2 } from "lucide-react";
import { useGuitarAI } from "@/lib/store";
import { getCurriculum, PATH_META, type PathKey } from "@/lib/curriculum";

export default function PathLevelsPage() {
  const params = useParams<{ path: string }>();
  const path = params.path as PathKey;
  const [mounted, setMounted] = useState(false);
  const pathProgress = useGuitarAI((s) => s.progress.paths[path]);
  useEffect(() => setMounted(true), []);

  if (!PATH_META[path]) notFound();
  if (!mounted) return null;

  const levels = getCurriculum(path);
  const meta = PATH_META[path];

  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{meta.icon}</span>
        <div>
          <h1 className="font-display text-2xl font-semibold">{meta.label} Path</h1>
          <p className="mt-1 text-ink-300">{meta.description}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {levels.map((level) => {
          const unlocked = level.level <= pathProgress.unlockedLevel;
          const lessonIdsInLevel = level.parts.flatMap((p) => p.lessons.map((l) => l.id));
          const doneCount = lessonIdsInLevel.filter((id) => pathProgress.completedLessonIds.includes(id)).length;
          const donePct = Math.round((doneCount / lessonIdsInLevel.length) * 100);

          const content = (
            <div className={`card flex items-center justify-between gap-3 p-4 ${unlocked ? "hover:border-gold-500" : "opacity-50"}`}>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Level {level.level}</p>
                <h3 className="font-display text-sm font-semibold">{level.title}</h3>
                {unlocked && <p className="mt-1 text-xs text-ink-400">{doneCount}/{lessonIdsInLevel.length} lessons · {donePct}%</p>}
              </div>
              {unlocked ? (
                donePct === 100 ? <CheckCircle2 size={20} className="shrink-0 text-teal-400" /> : <span className="shrink-0 text-xs text-ink-400">{donePct}%</span>
              ) : (
                <Lock size={18} className="shrink-0 text-ink-500" />
              )}
            </div>
          );

          return unlocked ? (
            <Link key={level.level} href={`/learning-path/${path}/${level.level}`}>
              {content}
            </Link>
          ) : (
            <div key={level.level}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
