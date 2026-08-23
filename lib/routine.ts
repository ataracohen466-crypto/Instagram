import { LEVELS } from "./levels";
import type { PracticeExercise, UserProgress } from "./types";

const ALL_EXERCISES: PracticeExercise[] = LEVELS.flatMap((l) => l.lessons.flatMap((les) => les.exercises));

/** Builds a practice-time-boxed routine, prioritizing the learner's weak areas/chords first. */
export function buildRoutine(minutes: number, progress: UserProgress): PracticeExercise[] {
  const weakChordHints = progress.weakAreas.map((w) => w.toLowerCase());

  const scored = ALL_EXERCISES.map((ex) => {
    let score = 0;
    if (ex.targetChords?.some((c) => weakChordHints.some((w) => w.includes(c.toLowerCase())))) score += 10;
    if (weakChordHints.some((w) => w.includes(ex.kind))) score += 3;
    if (ex.targetChords?.some((c) => !progress.chordsMastered.includes(c))) score += 2;
    return { ex, score };
  }).sort((a, b) => b.score - a.score);

  const routine: PracticeExercise[] = [];
  let used = 0;
  // Always warm up first.
  const warmup = ALL_EXERCISES.find((e) => e.kind === "technique");
  if (warmup && minutes >= 5) {
    routine.push(warmup);
    used += warmup.minutes;
  }
  for (const { ex } of scored) {
    if (used + ex.minutes > minutes) continue;
    if (routine.find((r) => r.id === ex.id)) continue;
    routine.push(ex);
    used += ex.minutes;
    if (used >= minutes) break;
  }
  return routine;
}

export function buildFixRoutine(issueLabels: string[], minutes = 15): PracticeExercise[] {
  const lower = issueLabels.map((l) => l.toLowerCase());
  const scored = ALL_EXERCISES.map((ex) => {
    let score = 0;
    if (ex.targetChords?.some((c) => lower.some((w) => w.includes(c.toLowerCase())))) score += 10;
    if (lower.some((w) => w.includes(ex.kind))) score += 4;
    return { ex, score };
  }).sort((a, b) => b.score - a.score);

  const routine: PracticeExercise[] = [];
  let used = 0;
  for (const { ex, score } of scored) {
    if (score === 0) continue;
    if (used + ex.minutes > minutes) continue;
    routine.push(ex);
    used += ex.minutes;
    if (used >= minutes) break;
  }
  if (routine.length === 0) routine.push(...ALL_EXERCISES.slice(0, 2));
  return routine;
}
