export function uid(prefix = ""): string {
  const random = Math.random().toString(36).slice(2, 10);
  const stamp = Date.now().toString(36);
  return `${prefix}${prefix ? "_" : ""}${stamp}${random}`;
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** yyyy-mm-dd in the viewer's local timezone. */
export function isoDay(date: Date | number = new Date()): string {
  const d = typeof date === "number" ? new Date(date) : date;
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export function parseIsoDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(iso: string, days: number): string {
  const d = parseIsoDay(iso);
  d.setDate(d.getDate() + days);
  return isoDay(d);
}

export function daysUntil(iso: string, from = new Date()): number {
  const target = parseIsoDay(iso).getTime();
  const start = parseIsoDay(isoDay(from)).getTime();
  return Math.round((target - start) / (24 * 60 * 60 * 1000));
}

export function formatDay(iso: string): string {
  const d = parseIsoDay(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return "Still up?";
  if (h < 12) return "Good morning!";
  if (h < 17) return "Good afternoon!";
  if (h < 22) return "Good evening!";
  return "Late night session?";
}

export function levelForXp(xp: number): number {
  // 100 XP for level 2, then each level costs 50 more than the last.
  let level = 1;
  let needed = 100;
  let remaining = xp;
  while (remaining >= needed) {
    remaining -= needed;
    level += 1;
    needed += 50;
  }
  return level;
}

export function xpProgress(xp: number): { into: number; needed: number } {
  let needed = 100;
  let remaining = xp;
  while (remaining >= needed) {
    remaining -= needed;
    needed += 50;
  }
  return { into: remaining, needed };
}

export function pct(value: number): string {
  return `${Math.round(value)}%`;
}

/** Loose text comparison used by the offline auto-grader. */
export function normalizeAnswer(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Splits raw note text into rough "sentences" for the offline generators. */
export function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);
}

export function titleFrom(text: string): string {
  const first = text.trim().split(/\n|\.\s/)[0] ?? "";
  const clipped = first.slice(0, 60).trim();
  return clipped.length > 0 ? clipped : "Untitled note";
}

export function clampText(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n…[truncated]`;
}
