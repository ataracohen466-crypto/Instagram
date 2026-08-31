// Skin tracking analysis: trends, routine consistency, and gentle
// correlations with lifestyle/mental wellness data the user already
// tracks. Never ranks appearance, never diagnoses a skin condition.

import type { AppData, SkinCheckIn, CheckIn, SkinRoutineLog } from "./types";
import { avg, round1, pearson } from "./insights";
import { withinRange, type RangeKey } from "./dates";

export function skinInRange(skinCheckIns: SkinCheckIn[], range: RangeKey): SkinCheckIn[] {
  return [...skinCheckIns].filter((c) => withinRange(c.date, range)).sort((a, b) => a.date.localeCompare(b.date));
}

export interface SkinTrend {
  field: keyof Pick<SkinCheckIn, "clarity" | "breakouts" | "redness" | "dryness" | "oiliness" | "irritation" | "texture">;
  label: string;
  current30dAvg: number | null;
  priorAvg: number | null;
  text: string;
}

const SKIN_FIELD_LABELS: Record<SkinTrend["field"], string> = {
  clarity: "clarity",
  breakouts: "breakouts",
  redness: "redness",
  dryness: "dryness",
  oiliness: "oiliness",
  irritation: "irritation",
  texture: "texture",
};

const LOWER_BETTER: SkinTrend["field"][] = ["breakouts", "redness", "dryness", "oiliness", "irritation"];

export function skinTrends(skinCheckIns: SkinCheckIn[]): SkinTrend[] {
  const last30 = skinInRange(skinCheckIns, "30d");
  const priorWindow = skinCheckIns
    .filter((c) => !last30.some((r) => r.id === c.id))
    .slice(-30);

  return (Object.keys(SKIN_FIELD_LABELS) as SkinTrend["field"][]).map((field) => {
    const current = avg(last30.map((c) => c[field] as number));
    const prior = avg(priorWindow.map((c) => c[field] as number));
    let text = `Not enough recorded ${SKIN_FIELD_LABELS[field]} data yet to show a trend.`;
    if (current !== null && prior !== null) {
      const delta = current - prior;
      const lowerBetter = LOWER_BETTER.includes(field);
      const improved = lowerBetter ? delta < 0 : delta > 0;
      if (Math.abs(delta) < 0.5) {
        text = `Your recorded ${SKIN_FIELD_LABELS[field]} has been steady compared with your prior average.`;
      } else {
        text = `Your recorded ${SKIN_FIELD_LABELS[field]} appears ${improved ? "improved" : "a bit higher"} compared with your prior average.`;
      }
    } else if (current !== null) {
      text = `Your 30-day average recorded ${SKIN_FIELD_LABELS[field]} is ${round1(current)}/10.`;
    }
    return { field, label: SKIN_FIELD_LABELS[field], current30dAvg: round1(current), priorAvg: round1(prior), text };
  });
}

export interface SkinLifestyleConnection {
  id: string;
  text: string;
}

export function skinLifestyleConnections(skinCheckIns: SkinCheckIn[], checkIns: CheckIn[]): SkinLifestyleConnection[] {
  const byDate = new Map(checkIns.map((c) => [c.date, c]));
  const pairs: { stress: number; redness: number; dryness: number; sleep: number; hydrated: boolean; irritation: number }[] = [];
  for (const s of skinCheckIns) {
    const c = byDate.get(s.date);
    if (!c) continue;
    pairs.push({
      stress: c.schoolWorkStress,
      redness: s.redness,
      dryness: s.dryness,
      sleep: c.sleepQuality,
      hydrated: !!c.lifestyle.hydrated,
      irritation: s.irritation,
    });
  }
  const out: SkinLifestyleConnection[] = [];
  if (pairs.length >= 5) {
    const rStress = pearson(pairs.map((p) => p.stress), pairs.map((p) => p.redness));
    if (rStress !== null && rStress >= 0.3) {
      out.push({ id: "stress-redness", text: "On days you logged higher stress, you also tended to record more redness in your skin check-ins." });
    } else if (rStress !== null && rStress <= -0.3) {
      out.push({ id: "stress-redness", text: "On days you logged lower stress, you also tended to record less redness." });
    }
    const rSleepDry = pearson(pairs.map((p) => p.sleep), pairs.map((p) => -p.dryness));
    if (rSleepDry !== null && rSleepDry >= 0.3) {
      out.push({ id: "sleep-dryness", text: "Better-rated sleep nights tended to line up with lower recorded dryness the next check-in." });
    }
    const hydratedPairs = pairs.filter((p) => p.hydrated);
    const notHydratedPairs = pairs.filter((p) => !p.hydrated);
    if (hydratedPairs.length >= 3 && notHydratedPairs.length >= 3) {
      const withAvg = avg(hydratedPairs.map((p) => p.dryness))!;
      const withoutAvg = avg(notHydratedPairs.map((p) => p.dryness))!;
      if (withoutAvg - withAvg >= 0.6) {
        out.push({ id: "hydration-dryness", text: "You recorded lower dryness on days you also logged staying hydrated." });
      }
    }
  }
  return out;
}

export function skinMentalConnection(skinCheckIns: SkinCheckIn[], checkIns: CheckIn[]): string {
  const byDate = new Map(checkIns.map((c) => [c.date, c]));
  const pairs: { mood: number; clarity: number }[] = [];
  for (const s of skinCheckIns) {
    const c = byDate.get(s.date);
    if (c) pairs.push({ mood: c.overallMood, clarity: s.clarity });
  }
  if (pairs.length < 8) {
    return "Keep logging both check-ins for a few more weeks to see how your mood and skin patterns relate — they're often more independent than it feels day to day.";
  }
  const r = pearson(pairs.map((p) => p.mood), pairs.map((p) => p.clarity));
  if (r === null || Math.abs(r) < 0.25) {
    return "Your mood and your recorded skin clarity haven't moved together much in your data — a good reminder that skin doesn't determine how you feel, or vice versa.";
  }
  return r > 0
    ? "Your mood and recorded skin clarity have tended to rise and fall together somewhat — remember correlation isn't causation, and your worth isn't tied to either."
    : "Interestingly, your mood and recorded skin clarity haven't moved in the same direction — your wellbeing doesn't depend on your skin.";
}

export function routineConsistency(logs: SkinRoutineLog[], range: RangeKey = "30d"): { amPct: number; pmPct: number; days: number } {
  const inRangeLogs = logs.filter((l) => withinRange(l.date, range));
  const days = inRangeLogs.length || 1;
  const amPct = Math.round((inRangeLogs.filter((l) => l.amDone).length / days) * 100);
  const pmPct = Math.round((inRangeLogs.filter((l) => l.pmDone).length / days) * 100);
  return { amPct, pmPct, days: inRangeLogs.length };
}
