"use client";

import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronDown, CheckCircle2 } from "lucide-react";
import { useGuitarAI } from "@/lib/store";
import { getCurriculum, PATH_META, type PathKey } from "@/lib/curriculum";
import LessonPlayer from "@/components/LessonPlayer";

export default function LevelPartsPage() {
  const params = useParams<{ path: string; level: string }>();
  const path = params.path as PathKey;
  const level = Number(params.level);
  const [mounted, setMounted] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const pathProgress = useGuitarAI((s) => s.progress.paths[path]);
  const completeGeneratedLesson = useGuitarAI((s) => s.completeGeneratedLesson);
  useEffect(() => setMounted(true), []);

  if (!PATH_META[path] || !Number.isInteger(level) || level < 1 || level > 20) notFound();
  if (!mounted) return null;

  const levelDef = getCurriculum(path).find((l) => l.level === level)!;
  const lessonsPerLevel = levelDef.parts.reduce((a, p) => a + p.lessons.length, 0);

  return (
    <div className="space-y-6 py-4">
      <Link href={`/learning-path/${path}`} className="flex items-center gap-1.5 text-sm text-ink-400 hover:text-ink-200">
        <ArrowLeft size={15} /> {PATH_META[path].label} levels
      </Link>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gold-400">Level {level}</p>
        <h1 className="font-display text-2xl font-semibold">{levelDef.title}</h1>
        <p className="mt-1 text-ink-300">{levelDef.summary}</p>
      </div>

      <div className="space-y-3">
        {levelDef.parts.map((part) => {
          const doneInPart = part.lessons.filter((l) => pathProgress.completedLessonIds.includes(l.id)).length;
          return (
            <div key={part.part} className="card overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Part {part.part}</p>
                  <h3 className="font-display text-base font-semibold">{part.title}</h3>
                </div>
                <span className="text-xs text-ink-400">{doneInPart}/{part.lessons.length}</span>
              </div>
              <div className="space-y-2 border-t border-ink-700 p-4">
                {part.lessons.map((lesson) => {
                  const isDone = pathProgress.completedLessonIds.includes(lesson.id);
                  const isOpen = openSection === lesson.id;
                  return (
                    <div key={lesson.id} className="rounded-lg border border-ink-700">
                      <button
                        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
                        onClick={() => setOpenSection(isOpen ? null : lesson.id)}
                      >
                        <span className="flex items-center gap-2 text-sm">
                          {isDone ? <CheckCircle2 size={15} className="text-teal-400" /> : <span className="h-3.5 w-3.5 rounded-full border-2 border-ink-500" />}
                          Section {lesson.section} · {lesson.title}
                        </span>
                        <ChevronDown size={14} className={`text-ink-400 transition ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isOpen && (
                        <div className="p-3 pt-0">
                          <LessonPlayer
                            lesson={lesson}
                            path={path}
                            completed={isDone}
                            onComplete={() => completeGeneratedLesson(path, lesson.id, level, lessonsPerLevel)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
