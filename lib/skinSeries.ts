import type { SkinCheckIn } from "./types";
import { lastNDays, formatShort } from "./dates";
import type { TrendPoint } from "@/components/ui/Charts";

export function buildSkinSeries(skinCheckIns: SkinCheckIn[], field: keyof Pick<SkinCheckIn, "clarity" | "breakouts" | "redness" | "dryness" | "oiliness" | "irritation" | "texture" | "hydrationFeel">): TrendPoint[] {
  const byDate = new Map(skinCheckIns.map((c) => [c.date, c[field] as number]));
  const days = lastNDays(30);
  return days.map((d) => ({ label: formatShort(d), value: byDate.has(d) ? (byDate.get(d) as number) : null }));
}
