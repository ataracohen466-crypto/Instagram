import { Book, Chapter, Scene } from "./types";

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function sceneWords(scene: Scene): number {
  return countWords(scene.content);
}

export function chapterWords(chapter: Chapter): number {
  return chapter.scenes.reduce((sum, s) => sum + sceneWords(s), 0);
}

export function bookWords(book: Book): number {
  return book.chapters.reduce((sum, c) => sum + chapterWords(c), 0);
}

export function totalWords(books: Book[]): number {
  return books.reduce((sum, b) => sum + bookWords(b), 0);
}

export function formatWords(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n / 1000)}k`;
}

export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 200));
}

/** Local-time YYYY-MM-DD key, so streaks track the user's calendar day, not UTC. */
export function dateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function daysAgoKey(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return dateKey(d);
}

/** Consecutive days (ending today or yesterday) that hit the goal. */
export function computeStreak(
  history: Record<string, number>,
  goal: number
): number {
  if (goal <= 0) return 0;
  let streak = 0;
  let offset = 0;
  const today = daysAgoKey(0);
  if ((history[today] ?? 0) < goal) {
    // Today doesn't count against the streak until it's over —
    // start checking from yesterday instead.
    offset = 1;
  }
  for (let i = offset; i < 3650; i++) {
    const key = daysAgoKey(i);
    if ((history[key] ?? 0) >= goal) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function last7Days(history: Record<string, number>): { key: string; label: string; words: number }[] {
  const out: { key: string; label: string; words: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    out.push({
      key,
      label: d.toLocaleDateString(undefined, { weekday: "narrow" }),
      words: history[key] ?? 0,
    });
  }
  return out;
}
