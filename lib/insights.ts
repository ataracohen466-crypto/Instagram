// The analysis engine behind Timeline, Insights, Progress, and Reports.
// Everything here runs entirely in the browser over the user's own
// check-ins — no network calls, no external AI. Findings are always
// phrased as observations about the user's own data, never diagnoses.

import type { CheckIn, LifestyleFactor, Emotion } from "./types";
import { dayKey, parseDayKey, withinRange, type RangeKey, monthKey } from "./dates";
import { LIFESTYLE_META, EMOTION_META } from "./mood";

export const HIGHER_BETTER_FIELDS = [
  "overallMood", "energy", "motivation", "sleepQuality",
  "socialConnection", "physicalWellbeing", "confidence",
] as const;
export const LOWER_BETTER_FIELDS = ["anxiety", "schoolWorkStress"] as const;

export type NumericField =
  | (typeof HIGHER_BETTER_FIELDS)[number]
  | (typeof LOWER_BETTER_FIELDS)[number];

export const FIELD_LABELS: Record<NumericField, string> = {
  overallMood: "overall mood",
  energy: "energy",
  motivation: "motivation",
  sleepQuality: "sleep quality",
  socialConnection: "social connection",
  physicalWellbeing: "physical wellbeing",
  confidence: "confidence",
  anxiety: "anxiety",
  schoolWorkStress: "school/work stress",
};

export function isHigherBetter(field: NumericField): boolean {
  return (HIGHER_BETTER_FIELDS as readonly string[]).includes(field);
}

export function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function round1(n: number | null): number | null {
  return n === null ? null : Math.round(n * 10) / 10;
}

function stdev(nums: number[]): number | null {
  if (nums.length < 2) return null;
  const m = avg(nums)!;
  const variance = avg(nums.map((n) => (n - m) ** 2))!;
  return Math.sqrt(variance);
}

export function sortByDate(checkIns: CheckIn[]): CheckIn[] {
  return [...checkIns].sort((a, b) => a.date.localeCompare(b.date));
}

export function inRange(checkIns: CheckIn[], range: RangeKey, from = new Date()): CheckIn[] {
  return sortByDate(checkIns.filter((c) => withinRange(c.date, range, from)));
}

export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 5) return null;
  const mx = avg(xs.slice(0, n))!;
  const my = avg(ys.slice(0, n))!;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  if (denom === 0) return null;
  return num / denom;
}

// ---------- Trend narration ----------

export interface Trend {
  field: NumericField;
  direction: "up" | "down" | "flat";
  improving: boolean;
  firstAvg: number;
  secondAvg: number;
  n: number;
}

export function computeTrend(checkIns: CheckIn[], field: NumericField): Trend | null {
  const values = sortByDate(checkIns)
    .map((c) => c[field] as number | undefined)
    .filter((v): v is number => typeof v === "number");
  if (values.length < 6) return null;
  const mid = Math.floor(values.length / 2);
  const firstAvg = avg(values.slice(0, mid))!;
  const secondAvg = avg(values.slice(mid))!;
  const delta = secondAvg - firstAvg;
  const direction = Math.abs(delta) < 0.4 ? "flat" : delta > 0 ? "up" : "down";
  const higherBetter = isHigherBetter(field);
  const improving = direction === "flat" ? true : direction === "up" ? higherBetter : !higherBetter;
  return { field, direction, improving, firstAvg, secondAvg, n: values.length };
}

export function trendSentence(t: Trend, rangeLabel: string): string {
  const label = FIELD_LABELS[t.field];
  if (t.direction === "flat") {
    return `Your average ${label} has stayed fairly steady over the last ${rangeLabel}.`;
  }
  const verb = t.direction === "up" ? "increased" : "decreased";
  return `Your average ${label} has ${verb} over the last ${rangeLabel}.`;
}

// ---------- Lifestyle factor correlations ----------

export interface FactorInsight {
  id: string;
  factor: LifestyleFactor;
  field: NumericField;
  withAvg: number;
  withoutAvg: number;
  diff: number;
  withCount: number;
  withoutCount: number;
  text: string;
  why: string;
}

const WHY_EXPLANATIONS: Record<LifestyleFactor, string> = {
  exercise: "Physical activity can release endorphins and help the body process stress hormones — that may be part of what's going on.",
  timeOutside: "Natural light and fresh air are linked to mood benefits for a lot of people, which could be a factor here.",
  goodSleep: "Sleep affects the parts of the brain that regulate emotion, so better rest often shows up in how days feel.",
  socialTime: "Connecting with people you're close to is a well-known support for mood — that may be playing a role.",
  screenTime: "Long stretches of screen time can crowd out sleep, movement, or in-person connection, which might explain the pattern.",
  journaled: "Writing things down can help process emotions instead of carrying them around unspoken.",
  music: "Music can shift mood and help regulate emotions for many people.",
  hydrated: "Staying hydrated supports energy and focus, which can ripple into how you feel overall.",
  mindfulness: "Mindfulness practices are associated with lower reactivity to stress for a lot of people.",
  ateWell: "Regular, balanced meals can help keep energy and mood steadier through the day.",
};

export function factorInsight(checkIns: CheckIn[], factor: LifestyleFactor, field: NumericField): FactorInsight | null {
  const withVals: number[] = [];
  const withoutVals: number[] = [];
  for (const c of checkIns) {
    const v = c[field] as number | undefined;
    if (typeof v !== "number") continue;
    if (c.lifestyle[factor]) withVals.push(v);
    else withoutVals.push(v);
  }
  if (withVals.length < 3 || withoutVals.length < 3) return null;
  const withAvg = avg(withVals)!;
  const withoutAvg = avg(withoutVals)!;
  const diff = withAvg - withoutAvg;
  if (Math.abs(diff) < 0.6) return null;

  const higherBetter = isHigherBetter(field);
  const better = (diff > 0) === higherBetter;
  const label = FIELD_LABELS[field];
  const factorLabel = LIFESTYLE_META[factor]?.label.toLowerCase() ?? factor;
  const text = `You seem to report ${better ? "better" : "lower"} ${label} on days when you logged "${factorLabel}".`;

  return {
    id: `${factor}-${field}`,
    factor,
    field,
    withAvg,
    withoutAvg,
    diff,
    withCount: withVals.length,
    withoutCount: withoutVals.length,
    text,
    why: WHY_EXPLANATIONS[factor],
  };
}

export function allFactorInsights(checkIns: CheckIn[]): FactorInsight[] {
  const fields: NumericField[] = ["overallMood", "anxiety", "energy", "confidence"];
  const results: FactorInsight[] = [];
  for (const factor of Object.keys(LIFESTYLE_META) as LifestyleFactor[]) {
    for (const field of fields) {
      const r = factorInsight(checkIns, factor, field);
      if (r) results.push(r);
    }
  }
  return results.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 8);
}

export interface NumericPairInsight {
  id: string;
  a: NumericField;
  b: NumericField;
  r: number;
  text: string;
}

export function sleepHoursMoodInsight(checkIns: CheckIn[]): NumericPairInsight | null {
  const pairs = checkIns
    .filter((c) => typeof c.sleepHours === "number")
    .map((c) => [c.sleepHours as number, c.overallMood] as const);
  if (pairs.length < 5) return null;
  const r = pearson(pairs.map((p) => p[0]), pairs.map((p) => p[1]));
  if (r === null || Math.abs(r) < 0.3) return null;
  const direction = r > 0 ? "more energized and in a better mood" : "less settled";
  return {
    id: "sleepHours-overallMood",
    a: "sleepQuality",
    b: "overallMood",
    r,
    text: `You reported feeling ${direction} on days when you slept longer.`,
  };
}

// ---------- Emotion frequency ----------

export function topEmotions(checkIns: CheckIn[], limit = 3): { emotion: Emotion; count: number }[] {
  const counts = new Map<Emotion, number>();
  for (const c of checkIns) for (const e of c.emotions) counts.set(e, (counts.get(e) ?? 0) + 1);
  return [...counts.entries()]
    .map(([emotion, count]) => ({ emotion, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function topLifestyleFactors(checkIns: CheckIn[], limit = 3): { factor: LifestyleFactor; count: number }[] {
  const counts = new Map<LifestyleFactor, number>();
  for (const c of checkIns)
    for (const [k, v] of Object.entries(c.lifestyle)) if (v) counts.set(k as LifestyleFactor, (counts.get(k as LifestyleFactor) ?? 0) + 1);
  return [...counts.entries()]
    .map(([factor, count]) => ({ factor, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// ---------- Growth areas (Progress dashboard) ----------

export interface GrowthArea {
  id: string;
  label: string;
  score: number; // 0-100
  trend: "improving" | "steady" | "new";
  description: string;
}

function clampScore(n: number): number {
  return Math.max(4, Math.min(100, Math.round(n)));
}

export function computeGrowthAreas(checkIns: CheckIn[], journalCount: number, toolkitUses: number, distinctHelpfulThings: number): GrowthArea[] {
  const recent = inRange(checkIns, "30d");
  if (recent.length < 3) return [];

  const avgEmotionsPerCheckin = avg(recent.map((c) => c.emotions.length)) ?? 0;
  const emotionalAwareness = clampScore((avgEmotionsPerCheckin / 4) * 60 + Math.min(journalCount, 20) * 2);

  const anxietyTrend = computeTrend(checkIns, "anxiety");
  const stressManagement = clampScore(
    50 + (anxietyTrend ? (anxietyTrend.improving ? 1 : -1) * Math.min(Math.abs(anxietyTrend.secondAvg - anxietyTrend.firstAvg) * 10, 30) : 0) + Math.min(toolkitUses * 2, 20)
  );

  const sleepQualities = recent.map((c) => c.sleepQuality);
  const sleepVariance = stdev(sleepQualities) ?? 3;
  const sleepAvg = avg(sleepQualities) ?? 5;
  const sleepConsistency = clampScore(sleepAvg * 6 - sleepVariance * 8 + 20);

  const factorsLogged = recent.reduce((sum, c) => sum + Object.values(c.lifestyle).filter(Boolean).length, 0);
  const healthyRoutines = clampScore((factorsLogged / (recent.length * 4)) * 100);

  const socialAvg = avg(recent.map((c) => c.socialConnection)) ?? 5;
  const socialConnection = clampScore(socialAvg * 9);

  const confidenceTrend = computeTrend(checkIns, "confidence");
  const confidenceAvg = avg(recent.map((c) => c.confidence)) ?? 5;
  const selfConfidence = clampScore(confidenceAvg * 8 + (confidenceTrend?.improving ? 10 : 0));

  const gratitudeCount = recent.filter((c) => c.gratitude?.trim()).length;
  const positiveCoping = clampScore(toolkitUses * 3 + distinctHelpfulThings * 6 + gratitudeCount * 3);

  const motivationAvg = avg(recent.map((c) => c.motivation)) ?? 5;
  const motivation = clampScore(motivationAvg * 9);

  const overallWellbeing = clampScore(
    ((avg(recent.map((c) => c.overallMood)) ?? 5) +
      (avg(recent.map((c) => c.energy)) ?? 5) +
      (10 - (avg(recent.map((c) => c.anxiety)) ?? 5)) +
      confidenceAvg +
      socialAvg) *
      2
  );

  const trendOf = (score: number): GrowthArea["trend"] => (recent.length < 8 ? "new" : score >= 55 ? "improving" : "steady");

  return [
    { id: "emotionalAwareness", label: "Emotional awareness", score: emotionalAwareness, trend: trendOf(emotionalAwareness), description: "How specifically you're able to name what you're feeling." },
    { id: "stressManagement", label: "Stress management", score: stressManagement, trend: trendOf(stressManagement), description: "How your stress levels and coping tools are trending." },
    { id: "sleepConsistency", label: "Sleep consistency", score: sleepConsistency, trend: trendOf(sleepConsistency), description: "How steady your sleep quality has been." },
    { id: "healthyRoutines", label: "Healthy routines", score: healthyRoutines, trend: trendOf(healthyRoutines), description: "How often healthy habits show up in your days." },
    { id: "socialConnection", label: "Social connection", score: socialConnection, trend: trendOf(socialConnection), description: "How connected you've been feeling to people around you." },
    { id: "selfConfidence", label: "Self-confidence", score: selfConfidence, trend: trendOf(selfConfidence), description: "How your self-confidence ratings are trending." },
    { id: "positiveCoping", label: "Positive coping", score: positiveCoping, trend: trendOf(positiveCoping), description: "Use of tools and reflections that help you feel better." },
    { id: "motivation", label: "Motivation", score: motivation, trend: trendOf(motivation), description: "How motivated you've been feeling day to day." },
    { id: "overallWellbeing", label: "Overall wellbeing", score: overallWellbeing, trend: trendOf(overallWellbeing), description: "A blend of mood, energy, calm, confidence, and connection." },
  ];
}

// ---------- Celebrations (non-competitive) ----------

export function consistentWeekStreak(checkIns: CheckIn[]): number {
  if (!checkIns.length) return 0;
  const weeksWithCheckin = new Set(checkIns.map((c) => {
    const d = parseDayKey(c.date);
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    return `${d.getFullYear()}-${week}`;
  }));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 104; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i * 7);
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    const key = `${d.getFullYear()}-${week}`;
    if (weeksWithCheckin.has(key)) streak++;
    else break;
  }
  return streak;
}

export function computeCelebrations(checkIns: CheckIn[], distinctHelpfulThings: number): string[] {
  const items: string[] = [];
  const weeks = consistentWeekStreak(checkIns);
  if (weeks >= 2) items.push(`You've checked in consistently for ${weeks} week${weeks === 1 ? "" : "s"}.`);
  if (distinctHelpfulThings >= 3) items.push(`You've identified ${distinctHelpfulThings} thing${distinctHelpfulThings === 1 ? "" : "s"} that help you feel better.`);

  const early = sortByDate(checkIns).slice(0, Math.min(10, Math.floor(checkIns.length / 2)));
  const recent = sortByDate(checkIns).slice(-Math.min(10, Math.floor(checkIns.length / 2)));
  if (early.length >= 5 && recent.length >= 5) {
    const earlyEmotions = avg(early.map((c) => c.emotions.length)) ?? 0;
    const recentEmotions = avg(recent.map((c) => c.emotions.length)) ?? 0;
    if (recentEmotions - earlyEmotions >= 0.6) items.push("You've become better at recognizing and naming your emotions.");
  }
  if (checkIns.length >= 10) items.push(`You've checked in ${checkIns.length} times — that's ${checkIns.length} moments of self-awareness.`);
  return items.slice(0, 4);
}

export { monthKey };
