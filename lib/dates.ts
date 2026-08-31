import {
  format, parseISO, startOfDay, subDays, subMonths, subYears,
  isAfter, isEqual, startOfWeek, differenceInCalendarDays, addDays,
} from "date-fns";
import type { DayKey } from "./types";

export function dayKey(d: Date = new Date()): DayKey {
  return format(d, "yyyy-MM-dd");
}

export function parseDayKey(k: DayKey): Date {
  return parseISO(k);
}

export function formatFriendly(k: DayKey): string {
  return format(parseDayKey(k), "EEEE, MMM d");
}

export function formatShort(k: DayKey): string {
  return format(parseDayKey(k), "MMM d");
}

export type RangeKey = "today" | "7d" | "30d" | "3m" | "6m" | "1y";

export const RANGE_LABELS: Record<RangeKey, string> = {
  today: "Today",
  "7d": "7 days",
  "30d": "30 days",
  "3m": "3 months",
  "6m": "6 months",
  "1y": "1 year",
};

export function rangeStart(range: RangeKey, from: Date = new Date()): Date {
  const today = startOfDay(from);
  switch (range) {
    case "today": return today;
    case "7d": return subDays(today, 6);
    case "30d": return subDays(today, 29);
    case "3m": return subMonths(today, 3);
    case "6m": return subMonths(today, 6);
    case "1y": return subYears(today, 1);
  }
}

export function withinRange(k: DayKey, range: RangeKey, from: Date = new Date()): boolean {
  const start = rangeStart(range, from);
  const d = startOfDay(parseDayKey(k));
  return (isAfter(d, start) || isEqual(d, start)) && !isAfter(d, startOfDay(from));
}

export function weekStartKey(k: DayKey): DayKey {
  return dayKey(startOfWeek(parseDayKey(k), { weekStartsOn: 1 }));
}

export function monthKey(k: DayKey): string {
  return format(parseDayKey(k), "yyyy-MM");
}

export function monthLabel(k: string): string {
  return format(parseISO(`${k}-01`), "MMMM yyyy");
}

export function daysBetween(a: DayKey, b: DayKey): number {
  return Math.abs(differenceInCalendarDays(parseDayKey(a), parseDayKey(b)));
}

export function lastNDays(n: number, from: Date = new Date()): DayKey[] {
  const out: DayKey[] = [];
  const today = startOfDay(from);
  for (let i = n - 1; i >= 0; i--) out.push(dayKey(subDays(today, i)));
  return out;
}

export function isToday(k: DayKey): boolean {
  return k === dayKey();
}

export function isYesterday(k: DayKey): boolean {
  return k === dayKey(subDays(new Date(), 1));
}

export { addDays, startOfDay };
