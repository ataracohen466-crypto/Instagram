// Weekly and monthly report generation — pulled together from the stats
// helpers in lib/insights.ts. Pure functions over the user's own data.

import type { CheckIn, Goal, JournalEntry, LifestyleFactor } from "./types";
import { dayKey, weekStartKey, monthKey, monthLabel, addDays, parseDayKey, formatShort } from "./dates";
import {
  avg, round1, sortByDate, computeTrend, allFactorInsights, sleepHoursMoodInsight,
  topEmotions, topLifestyleFactors, FIELD_LABELS, isHigherBetter, type NumericField,
} from "./insights";
import { EMOTION_META, LIFESTYLE_META } from "./mood";

export interface WeeklyReport {
  weekStart: string;
  weekEndLabel: string;
  checkInCount: number;
  avgMood: number | null;
  mostCommonEmotions: string[];
  biggestStressSource: string | null;
  positiveMoments: string[];
  sleepTrendText: string;
  habitTrendText: string;
  biggestImprovement: string | null;
  worthAttention: string | null;
  whatILearned: string[];
  nextWeekSuggestions: string[];
}

function weekCheckIns(checkIns: CheckIn[], weekStart: string): CheckIn[] {
  const start = parseDayKey(weekStart);
  const end = addDays(start, 6);
  return sortByDate(checkIns.filter((c) => {
    const d = parseDayKey(c.date);
    return d >= start && d <= end;
  }));
}

export function buildWeeklyReport(checkIns: CheckIn[], weekStart: string): WeeklyReport {
  const thisWeek = weekCheckIns(checkIns, weekStart);
  const prevWeekStart = dayKey(addDays(parseDayKey(weekStart), -7));
  const prevWeek = weekCheckIns(checkIns, prevWeekStart);

  const avgMood = round1(avg(thisWeek.map((c) => c.overallMood)));
  const emotions = topEmotions(thisWeek, 3).map((e) => EMOTION_META[e.emotion].label);

  const stressedDays = thisWeek.filter((c) => c.schoolWorkStress >= 7 || c.anxiety >= 7);
  const biggestStressSource =
    stressedDays.length === 0
      ? null
      : stressedDays.some((c) => c.schoolWorkStress >= 7)
      ? "School/work workload showed up as a common stress point this week."
      : "A few days carried noticeably higher anxiety than the rest of the week.";

  const positiveMoments = thisWeek
    .flatMap((c) => [c.gratitude, c.wentWell].filter(Boolean) as string[])
    .slice(0, 4);

  const sleepAvgThis = avg(thisWeek.map((c) => c.sleepQuality));
  const sleepAvgPrev = avg(prevWeek.map((c) => c.sleepQuality));
  let sleepTrendText = "Not enough sleep data yet this week to see a trend.";
  if (sleepAvgThis !== null && sleepAvgPrev !== null) {
    const delta = sleepAvgThis - sleepAvgPrev;
    sleepTrendText =
      Math.abs(delta) < 0.4
        ? "Your sleep quality stayed about the same as last week."
        : delta > 0
        ? "Your sleep quality trended up compared to last week."
        : "Your sleep quality trended down a bit compared to last week.";
  } else if (sleepAvgThis !== null) {
    sleepTrendText = `Your average sleep quality this week was ${round1(sleepAvgThis)}/10.`;
  }

  const habits = topLifestyleFactors(thisWeek, 3);
  const habitTrendText = habits.length
    ? `You logged "${LIFESTYLE_META[habits[0].factor].label}" ${habits[0].count} time${habits[0].count === 1 ? "" : "s"} this week${
        habits[1] ? `, and "${LIFESTYLE_META[habits[1].factor].label}" ${habits[1].count} time${habits[1].count === 1 ? "" : "s"}` : ""
      }.`
    : "Log a few lifestyle factors during check-in to see habit trends here.";

  const fields: NumericField[] = ["overallMood", "energy", "confidence", "anxiety", "schoolWorkStress", "sleepQuality", "socialConnection"];
  let biggestImprovement: string | null = null;
  let worthAttention: string | null = null;
  let bestDelta = 0;
  let worstDelta = 0;
  for (const f of fields) {
    const thisAvg = avg(thisWeek.map((c) => c[f] as number));
    const prevAvg = avg(prevWeek.map((c) => c[f] as number));
    if (thisAvg === null || prevAvg === null) continue;
    const raw = thisAvg - prevAvg;
    const signed = isHigherBetter(f) ? raw : -raw;
    if (signed > bestDelta) {
      bestDelta = signed;
      biggestImprovement = `Your ${FIELD_LABELS[f]} improved compared to last week.`;
    }
    if (signed < worstDelta) {
      worstDelta = signed;
      worthAttention = `Your ${FIELD_LABELS[f]} dipped a bit compared to last week — worth keeping an eye on, not a reason to worry.`;
    }
  }

  const factorInsights = allFactorInsights(checkIns).slice(0, 3);
  const sleepMood = sleepHoursMoodInsight(checkIns);
  const whatILearned: string[] = [];
  for (const fi of factorInsights) whatILearned.push(fi.text);
  if (sleepMood) whatILearned.push(sleepMood.text);
  if (emotions.length) whatILearned.push(`${emotions[0]} was the emotion you logged most often this week.`);
  const learned = whatILearned.slice(0, 5);
  if (learned.length === 0) learned.push("Keep checking in — patterns will start to show up here after a couple weeks of data.");

  const nextWeekSuggestions: string[] = [];
  if (factorInsights[0]) {
    nextWeekSuggestions.push(`Consider making more room for "${LIFESTYLE_META[factorInsights[0].factor].label.toLowerCase()}" — it's shown up alongside better days for you.`);
  }
  if (sleepAvgThis !== null && sleepAvgThis < 6) {
    nextWeekSuggestions.push("Your sleep quality has been on the lower side — the Toolkit has a short sleep-support routine if that's helpful.");
  }
  if (thisWeek.length < 5) {
    nextWeekSuggestions.push("Checking in a bit more often next week will make these patterns clearer — no pressure, just when it's easy.");
  }
  if (nextWeekSuggestions.length === 0) nextWeekSuggestions.push("Keep doing what's been working for you this week.");

  return {
    weekStart,
    weekEndLabel: formatShort(dayKey(addDays(parseDayKey(weekStart), 6))),
    checkInCount: thisWeek.length,
    avgMood,
    mostCommonEmotions: emotions,
    biggestStressSource,
    positiveMoments,
    sleepTrendText,
    habitTrendText,
    biggestImprovement,
    worthAttention,
    whatILearned: learned,
    nextWeekSuggestions: nextWeekSuggestions.slice(0, 4),
  };
}

export interface MonthlyReport {
  month: string;
  monthLabel: string;
  checkInCount: number;
  avgMood: number | null;
  avgStress: number | null;
  avgConfidence: number | null;
  moodDeltaVsPrevMonth: number | null;
  moodDeltaVsFirstMonth: number | null;
  goalsCompleted: number;
  goalsInProgress: number;
  mostHelpfulActivities: string[];
  achievements: string[];
  difficultWeeks: string[];
  lookHowFar: string;
}

export function buildMonthlyReport(checkIns: CheckIn[], goals: Goal[], month: string): MonthlyReport {
  const inMonth = sortByDate(checkIns.filter((c) => monthKey(c.date) === month));
  const months = [...new Set(checkIns.map((c) => monthKey(c.date)))].sort();
  const idx = months.indexOf(month);
  const prevMonth = idx > 0 ? months[idx - 1] : null;
  const firstMonth = months[0];

  const inPrev = prevMonth ? checkIns.filter((c) => monthKey(c.date) === prevMonth) : [];
  const inFirst = firstMonth ? checkIns.filter((c) => monthKey(c.date) === firstMonth) : [];

  const avgMood = avg(inMonth.map((c) => c.overallMood));
  const avgStress = avg(inMonth.map((c) => c.schoolWorkStress));
  const avgConfidence = avg(inMonth.map((c) => c.confidence));

  const prevMood = avg(inPrev.map((c) => c.overallMood));
  const firstMood = avg(inFirst.map((c) => c.overallMood));

  const goalsCompleted = goals.filter((g) => g.progress >= 100).length;
  const goalsInProgress = goals.filter((g) => g.progress > 0 && g.progress < 100 && !g.archived).length;

  const helpfulSet = new Set<string>();
  goals.forEach((g) => g.helpfulThings.forEach((h) => helpfulSet.add(h)));
  const mostHelpfulActivities = [...helpfulSet].slice(0, 5);

  const achievements: string[] = [];
  if (inMonth.length >= 15) achievements.push(`You checked in ${inMonth.length} times this month.`);
  if (goalsCompleted > 0) achievements.push(`You completed ${goalsCompleted} goal${goalsCompleted === 1 ? "" : "s"}.`);
  if (avgMood !== null && prevMood !== null && avgMood - prevMood >= 0.7) achievements.push("Your average mood was noticeably higher than last month.");

  const weekBuckets = new Map<string, number[]>();
  for (const c of inMonth) {
    const wk = weekStartKey(c.date);
    if (!weekBuckets.has(wk)) weekBuckets.set(wk, []);
    weekBuckets.get(wk)!.push(c.overallMood);
  }
  const overallAvg = avgMood ?? 5;
  const difficultWeeks: string[] = [];
  for (const [wk, moods] of weekBuckets) {
    const wAvg = avg(moods)!;
    if (wAvg <= overallAvg - 1.2 && moods.length >= 2) {
      difficultWeeks.push(`The week of ${formatShort(wk)} was harder than your month's average — that's normal, and it passed.`);
    }
  }

  let lookHowFar = "Keep checking in — this section fills in nicely after a couple months of data.";
  if (avgMood !== null && firstMood !== null && firstMonth !== month) {
    const delta = avgMood - firstMood;
    lookHowFar =
      Math.abs(delta) < 0.5
        ? `Your average mood this month (${round1(avgMood)}/10) is close to where it started when you began tracking — steady is its own kind of progress.`
        : delta > 0
        ? `Your average mood this month (${round1(avgMood)}/10) is up from ${round1(firstMood)}/10 when you started tracking — look how far you've come.`
        : `Your average mood this month (${round1(avgMood)}/10) is lower than when you started tracking. Moods move in seasons — this is data, not a verdict.`;
  }

  return {
    month,
    monthLabel: monthLabel(month),
    checkInCount: inMonth.length,
    avgMood: round1(avgMood),
    avgStress: round1(avgStress),
    avgConfidence: round1(avgConfidence),
    moodDeltaVsPrevMonth: avgMood !== null && prevMood !== null ? round1(avgMood - prevMood) : null,
    moodDeltaVsFirstMonth: avgMood !== null && firstMood !== null ? round1(avgMood - firstMood) : null,
    goalsCompleted,
    goalsInProgress,
    mostHelpfulActivities,
    achievements,
    difficultWeeks,
    lookHowFar,
  };
}
