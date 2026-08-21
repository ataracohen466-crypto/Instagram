"use client";

import { useState } from "react";
import { Lock, CheckCircle2, ChevronDown } from "lucide-react";
import { LEVELS, levelIndex } from "@/lib/levels";
import { useGuitarAI } from "@/lib/store";
import ChordDiagram from "@/components/ChordDiagram";
import type { Lesson } from "@/lib/types";

export default function LearningPathPage() {
  const progress = useGuitarAI((s) => s.progress);
  const profile = useGuitarAI((s) => s.profile);
  const completeLesson = useGuitarAI((s) => s.completeLesson);
  const addChordReps = useGuitarAI((s) => s.addChordReps);
  const [openLesson, setOpenLesson] = useState<string | null>(null);

  const startingLevelIdx = levelIndex(profile.skillLevel);

  function levelUnlocked(levelIdx: number): boolean {
    if (levelIdx === 0) return true;
    // Onboarding already places the learner at their reported skill level —
    // don't trap an intermediate/advanced player behind absolute-beginner lessons.
    if (levelIdx <= startingLevelIdx) return true;
    const prevLessons = LEVELS[levelIdx - 1].lessons.map((l) => l.id);
    const doneCount = prevLessons.filter((id) => progress.completedLessonIds.includes(id)).length;
    return doneCount >= Math.ceil(prevLessons.length * 0.6);
  }

  function markComplete(lesson: Lesson) {
    completeLesson(lesson.id);
    lesson.chordsTaught.forEach((c) => addChordReps(c, 10));
  }

  return (
    <div className="space-y-6 py-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Learning Path</h1>
        <p className="mt-1 text-ink-300">Five levels, from your first note to full command of the neck.</p>
      </div>

      <div className="space-y-5">
        {LEVELS.map((level, idx) => {
          const unlocked = levelUnlocked(idx);
          const lessonIds = level.lessons.map((l) => l.id);
          const doneCount = lessonIds.filter((id) => progress.completedLessonIds.includes(id)).length;

          return (
            <div key={level.id} className={`card p-5 ${!unlocked ? "opacity-50" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-700 font-display text-sm font-semibold text-gold-400">
                    {level.id}
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-semibold">{level.title}</h2>
                    <p className="text-sm text-ink-300">{level.description}</p>
                  </div>
                </div>
                {!unlocked && <Lock size={18} className="text-ink-400" />}
                {unlocked && (
                  <span className="text-xs text-ink-400">
                    {doneCount}/{lessonIds.length} lessons
                  </span>
                )}
              </div>

              {unlocked && (
                <div className="mt-4 space-y-2">
                  {level.lessons.map((lesson) => {
                    const isDone = progress.completedLessonIds.includes(lesson.id);
                    const isOpen = openLesson === lesson.id;
                    return (
                      <div key={lesson.id} className="rounded-xl border border-ink-700 bg-ink-900/50">
                        <button
                          className="flex w-full items-center justify-between px-4 py-3 text-left"
                          onClick={() => setOpenLesson(isOpen ? null : lesson.id)}
                        >
                          <div className="flex items-center gap-2">
                            {isDone ? (
                              <CheckCircle2 size={18} className="text-teal-400" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border-2 border-ink-500" />
                            )}
                            <span className="font-medium">{lesson.title}</span>
                          </div>
                          <ChevronDown size={16} className={`text-ink-400 transition ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                        {isOpen && (
                          <div className="space-y-4 border-t border-ink-700 px-4 py-4">
                            <p className="text-sm text-ink-300">{lesson.summary}</p>
                            {lesson.chordsTaught.length > 0 && (
                              <div className="flex flex-wrap gap-4">
                                {lesson.chordsTaught.map((c) => (
                                  <ChordDiagram key={c} chordId={c} size={96} />
                                ))}
                              </div>
                            )}
                            <div className="space-y-2">
                              {lesson.exercises.map((ex) => (
                                <div key={ex.id} className="rounded-lg bg-ink-800/60 p-3 text-sm">
                                  <span className="font-medium text-ink-100">{ex.title}</span>{" "}
                                  <span className="text-ink-400">· {ex.minutes} min</span>
                                  <p className="mt-1 text-ink-300">{ex.instructions}</p>
                                </div>
                              ))}
                            </div>
                            <button className="btn-secondary" onClick={() => markComplete(lesson)} disabled={isDone}>
                              {isDone ? "Completed" : "Mark lesson complete"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="pt-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Technique challenges</p>
                    <ul className="mt-1 list-inside list-disc text-sm text-ink-300">
                      {level.techniqueChallenges.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
