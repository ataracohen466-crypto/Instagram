import { SrsState } from "./types";

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Review grades, mapped onto SM-2's 0-5 quality scale:
 *   again → 1 (total blank), hard → 3, good → 4, easy → 5
 */
export type ReviewGrade = "again" | "hard" | "good" | "easy";

const QUALITY: Record<ReviewGrade, number> = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
};

export function newSrsState(now = Date.now()): SrsState {
  return {
    interval: 0,
    easeFactor: 2.5,
    dueDate: now,
    lastReviewed: null,
    repetitions: 0,
  };
}

/**
 * A compact SM-2. Anything graded below "good" resets the repetition count and
 * puts the card back in today's queue; everything else grows the interval by
 * the card's ease factor.
 */
export function schedule(
  state: SrsState,
  grade: ReviewGrade,
  now = Date.now()
): SrsState {
  const q = QUALITY[grade];

  let easeFactor =
    state.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;
  if (easeFactor > 3.0) easeFactor = 3.0;

  let repetitions = state.repetitions;
  let interval: number;

  if (q < 3) {
    repetitions = 0;
    interval = 0; // due again in this same session
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 3;
    else interval = Math.round(Math.max(1, state.interval) * easeFactor);
    if (grade === "hard") interval = Math.max(1, Math.round(interval * 0.6));
    interval = Math.min(interval, 180);
  }

  return {
    interval,
    easeFactor,
    repetitions,
    lastReviewed: now,
    dueDate: now + interval * DAY_MS + (interval === 0 ? 60 * 1000 : 0),
  };
}

export function isDue(state: SrsState, now = Date.now()): boolean {
  return state.dueDate <= now;
}

/** Due cards first (oldest due first), then the rest by soonest due. */
export function sortByDue<T extends { srs: SrsState }>(
  cards: T[],
  now = Date.now()
): T[] {
  return [...cards].sort((a, b) => {
    const aDue = isDue(a.srs, now) ? 0 : 1;
    const bDue = isDue(b.srs, now) ? 0 : 1;
    if (aDue !== bDue) return aDue - bDue;
    return a.srs.dueDate - b.srs.dueDate;
  });
}

export function describeInterval(state: SrsState): string {
  if (state.repetitions === 0) return "New";
  if (state.interval === 0) return "Again today";
  if (state.interval === 1) return "Tomorrow";
  if (state.interval < 30) return `In ${state.interval} days`;
  return `In ${Math.round(state.interval / 30)} months`;
}
