// The "AI Personal Wellness Assistant" — entirely local pattern-matching
// and statistics over the user's own data. No text is sent anywhere; this
// runs synchronously in the browser. It never diagnoses anything, and
// always separates "observed from your data" from "possible explanation".

import type { AppData } from "./types";
import { monthKey, monthLabel } from "./dates";
import {
  avg, round1, sortByDate, allFactorInsights, sleepHoursMoodInsight,
  computeGrowthAreas, computeCelebrations, FIELD_LABELS,
} from "./insights";
import { LIFESTYLE_META } from "./mood";

export const AI_DISCLAIMER =
  "This reflects patterns in your own check-ins, computed on this device — it isn't a diagnosis or professional opinion, and nothing here is sent to a server.";

export interface AssistantAnswer {
  observed: string[];
  possible: string[];
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function happiestDays(data: AppData): AssistantAnswer {
  const checkIns = data.checkIns;
  if (checkIns.length < 7) {
    return { observed: ["Not quite enough check-ins yet to see a day-of-week pattern — a few more weeks will help."], possible: [] };
  }
  const byWeekday = new Map<number, number[]>();
  for (const c of checkIns) {
    const day = new Date(`${c.date}T12:00:00`).getDay();
    if (!byWeekday.has(day)) byWeekday.set(day, []);
    byWeekday.get(day)!.push(c.overallMood);
  }
  const ranked = [...byWeekday.entries()]
    .filter(([, vals]) => vals.length >= 2)
    .map(([day, vals]) => ({ day, avgMood: avg(vals)! }))
    .sort((a, b) => b.avgMood - a.avgMood);
  if (!ranked.length) return { observed: ["Not enough repeat data per weekday yet."], possible: [] };
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  const factors = allFactorInsights(checkIns).slice(0, 2);
  return {
    observed: [
      `${WEEKDAYS[best.day]}s have your highest average mood (${round1(best.avgMood)}/10) in your check-ins so far.`,
      ranked.length > 1 ? `${WEEKDAYS[worst.day]}s tend to average lower (${round1(worst.avgMood)}/10).` : "",
    ].filter(Boolean),
    possible: factors.length
      ? factors.map((f) => f.why)
      : ["Different days often carry different routines — school/work load, sleep, and social time can all shift with the day of the week."],
  };
}

function affectingMood(data: AppData): AssistantAnswer {
  const factors = allFactorInsights(data.checkIns).slice(0, 4);
  const sleepMood = sleepHoursMoodInsight(data.checkIns);
  const observed: string[] = [];
  const possible: string[] = [];
  for (const f of factors) {
    observed.push(f.text);
    possible.push(f.why);
  }
  if (sleepMood) {
    observed.push(sleepMood.text);
    possible.push("Sleep strongly affects mood regulation for most people, so this tracks with what's generally understood.");
  }
  if (!observed.length) {
    observed.push("Not enough check-ins with matching lifestyle tags yet to spot a pattern — keep logging what you did that day alongside your mood.");
  }
  return { observed, possible };
}

function helpfulHabits(data: AppData): AssistantAnswer {
  const factors = allFactorInsights(data.checkIns).filter((f) => f.field === "overallMood" && f.diff > 0);
  const helpful = new Set<string>();
  data.goals.forEach((g) => g.helpfulThings.forEach((h) => helpful.add(h)));
  const observed = factors.slice(0, 4).map((f) => `${LIFESTYLE_META[f.factor].label} shows up alongside better moods in your data (${round1(f.withAvg)}/10 vs ${round1(f.withoutAvg)}/10).`);
  if (helpful.size) observed.push(`You've personally noted these as helpful on your goals: ${[...helpful].slice(0, 5).join(", ")}.`);
  if (!observed.length) observed.push("Keep logging lifestyle factors at check-in — habits will surface here once there's enough data.");
  return {
    observed,
    possible: factors.slice(0, 3).map((f) => f.why),
  };
}

function stressThisMonth(data: AppData): AssistantAnswer {
  const now = new Date();
  const thisMonth = monthKey(now.toISOString().slice(0, 10));
  const [y, m] = thisMonth.split("-").map(Number);
  const prevDate = new Date(y, m - 2, 1);
  const prevMonth = monthKey(prevDate.toISOString().slice(0, 10));

  const inThis = data.checkIns.filter((c) => monthKey(c.date) === thisMonth);
  const inPrev = data.checkIns.filter((c) => monthKey(c.date) === prevMonth);
  const avgThis = avg(inThis.map((c) => c.schoolWorkStress));
  const avgPrev = avg(inPrev.map((c) => c.schoolWorkStress));

  if (avgThis === null) return { observed: ["No check-ins yet this month to compare."], possible: [] };
  if (avgPrev === null) {
    return { observed: [`Your average school/work stress this month is ${round1(avgThis)}/10.`], possible: [] };
  }
  const delta = avgThis - avgPrev;
  const observed =
    Math.abs(delta) < 0.4
      ? [`Your school/work stress this month (${round1(avgThis)}/10) is about the same as last month (${round1(avgPrev)}/10).`]
      : delta > 0
      ? [`Your school/work stress is up this month — ${round1(avgThis)}/10 versus ${round1(avgPrev)}/10 last month.`]
      : [`Your school/work stress is down this month — ${round1(avgThis)}/10 versus ${round1(avgPrev)}/10 last month.`];
  return {
    observed,
    possible: ["Workload naturally shifts with the calendar — deadlines, exams, and busy stretches at work all move this number without anything being wrong."],
  };
}

function progressSummary(data: AppData): AssistantAnswer {
  const distinctHelpful = new Set(data.goals.flatMap((g) => g.helpfulThings)).size;
  const celebrations = computeCelebrations(data.checkIns, distinctHelpful);
  const areas = computeGrowthAreas(data.checkIns, data.journalEntries.length, data.toolkitUses.length, distinctHelpful)
    .filter((a) => a.trend === "improving")
    .slice(0, 3);
  const observed = [...celebrations];
  if (areas.length) observed.push(`Areas trending upward lately: ${areas.map((a) => a.label.toLowerCase()).join(", ")}.`);
  if (!observed.length) observed.push("Keep checking in — progress becomes visible here after a couple weeks of data.");
  return { observed, possible: [] };
}

const HANDLERS: { test: RegExp; fn: (data: AppData) => AssistantAnswer }[] = [
  { test: /happ(y|iest)|best day|good day/i, fn: happiestDays },
  { test: /affect(ing)? my mood|what.*mood/i, fn: affectingMood },
  { test: /habit|help(s|ed)? me|what helps/i, fn: helpfulHabits },
  { test: /stress.*month|month.*stress/i, fn: stressThisMonth },
  { test: /progress|how (am|have) i (doing|done)/i, fn: progressSummary },
];

export const SUGGESTED_QUESTIONS = [
  "What has been affecting my mood lately?",
  "What days do I seem happiest?",
  "What habits seem to help me?",
  "How has my stress changed this month?",
  "What progress have I made?",
];

export function askAssistant(query: string, data: AppData): AssistantAnswer {
  for (const h of HANDLERS) {
    if (h.test.test(query)) return h.fn(data);
  }
  return {
    observed: [
      "I can only answer from patterns in your own check-ins. Try one of the suggested questions, or ask about mood, sleep, stress, habits, or progress.",
    ],
    possible: [],
  };
}
