// Generates "My Mental Health Story" — a month-by-month narrative of
// gradual growth, built entirely from the user's own check-ins.

import type { CheckIn, StoryMilestone } from "./types";
import { monthKey, monthLabel } from "./dates";
import { avg, pearson, round1 } from "./insights";

function monthStats(checkIns: CheckIn[]) {
  return {
    n: checkIns.length,
    avgMood: avg(checkIns.map((c) => c.overallMood)),
    avgAnxiety: avg(checkIns.map((c) => c.anxiety)),
    avgConfidence: avg(checkIns.map((c) => c.confidence)),
    avgEmotionsLogged: avg(checkIns.map((c) => c.emotions.length)),
    sleepMoodCorr: pearson(
      checkIns.map((c) => c.sleepQuality),
      checkIns.map((c) => c.overallMood)
    ),
  };
}

export function generateStoryMilestones(checkIns: CheckIn[]): StoryMilestone[] {
  if (checkIns.length === 0) return [];

  const byMonth = new Map<string, CheckIn[]>();
  for (const c of checkIns) {
    const m = monthKey(c.date);
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m)!.push(c);
  }
  const months = [...byMonth.keys()].sort();

  const milestones: StoryMilestone[] = [];
  let prevStats: ReturnType<typeof monthStats> | null = null;

  months.forEach((m, i) => {
    const entries = byMonth.get(m)!;
    if (entries.length === 0) return;
    const stats = monthStats(entries);
    const lastDate = entries[entries.length - 1].date;

    let title: string;
    let detail: string;

    if (i === 0) {
      title = "Starting to notice how you feel";
      detail = `You began checking in and put words to your emotions ${stats.n} time${stats.n === 1 ? "" : "s"} this month — that first step is a big one.`;
    } else if (stats.n >= 18 && (prevStats?.n ?? 0) < 12) {
      title = "Building a more consistent routine";
      detail = `You checked in ${stats.n} times this month, more regularly than before — consistency like this is what makes patterns visible.`;
    } else if (stats.sleepMoodCorr !== null && Math.abs(stats.sleepMoodCorr) >= 0.4 && (prevStats?.sleepMoodCorr === null || Math.abs(prevStats?.sleepMoodCorr ?? 0) < 0.4)) {
      title = "Noticing sleep affects your mood";
      detail = "Your check-ins this month show a real link between how you slept and how your days went — worth keeping in mind.";
    } else if (prevStats && stats.avgMood !== null && prevStats.avgMood !== null && stats.avgMood - prevStats.avgMood >= 0.8) {
      title = "More positive days";
      detail = `Your average mood this month (${round1(stats.avgMood)}/10) was noticeably higher than the month before.`;
    } else if (prevStats && stats.avgConfidence !== null && prevStats.avgConfidence !== null && stats.avgConfidence - prevStats.avgConfidence >= 0.8) {
      title = "Growing self-confidence";
      detail = "Your self-confidence check-ins trended upward this month compared to last.";
    } else if (prevStats && stats.avgAnxiety !== null && prevStats.avgAnxiety !== null && prevStats.avgAnxiety - stats.avgAnxiety >= 0.8) {
      title = "Learning to manage stress";
      detail = "Your reported anxiety was lower on average this month than the month before.";
    } else if (prevStats && stats.avgEmotionsLogged !== null && prevStats.avgEmotionsLogged !== null && stats.avgEmotionsLogged - prevStats.avgEmotionsLogged >= 0.5) {
      title = "Better emotional awareness";
      detail = "You've been naming a wider range of emotions in your check-ins — a sign of growing self-awareness.";
    } else {
      title = "Continuing to build self-awareness";
      detail = `You checked in ${stats.n} time${stats.n === 1 ? "" : "s"} this month, adding to a picture of how you've been doing.`;
    }

    milestones.push({
      id: `auto-${m}`,
      date: lastDate,
      title: `${monthLabel(m)}: ${title}`,
      detail,
      kind: "auto",
    });
    prevStats = stats;
  });

  return milestones;
}
