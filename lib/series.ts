import type { CheckIn } from "./types";
import { type RangeKey, lastNDays, formatShort, parseDayKey, dayKey } from "./dates";
import { avg, inRange, round1, type NumericField } from "./insights";
import type { TrendPoint } from "@/components/ui/Charts";

/** Builds a chart-ready series for a field over a range — daily points for
 * short ranges, weekly averages for longer ones so the chart stays legible. */
export function buildSeries(checkIns: CheckIn[], range: RangeKey, field: NumericField): TrendPoint[] {
  const data = inRange(checkIns, range);
  const byDate = new Map(data.map((c) => [c.date, c[field] as number]));

  if (range === "today" || range === "7d") {
    const days = lastNDays(range === "today" ? 1 : 7);
    return days.map((d) => ({ label: formatShort(d), value: byDate.has(d) ? (byDate.get(d) as number) : null }));
  }

  if (range === "30d") {
    const days = lastNDays(30);
    return days.map((d) => ({ label: formatShort(d), value: byDate.has(d) ? (byDate.get(d) as number) : null }));
  }

  // 3m / 6m / 1y — bucket into weeks
  const buckets = new Map<string, number[]>();
  for (const c of data) {
    const d = parseDayKey(c.date);
    const weekOf = new Date(d);
    weekOf.setDate(d.getDate() - d.getDay());
    const key = dayKey(weekOf);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(c[field] as number);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, vals]) => ({ label: formatShort(k), value: round1(avg(vals)) }));
}
