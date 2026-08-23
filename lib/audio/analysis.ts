import type { SongArrangement, FixMyPlayingIssue } from "../types";
import { buildBeatGrid, scoreTiming } from "./onset";

export interface ChordWindow {
  chordId: string;
  startMs: number;
  endMs: number;
}

export interface ChordSample {
  expected: string;
  matched: string;
  confidence: number;
  atMs: number;
}

/** Lays the song's chords out along a timeline in ms, evenly dividing each section's bars. */
export function buildChordTimeline(song: SongArrangement): { timeline: ChordWindow[]; totalMs: number; totalBars: number; beatsPerBar: number } {
  const beatsPerBar = Number(song.timeSignature.split("/")[0]) || 4;
  const beatMs = 60000 / song.bpm;
  let t = 0;
  let totalBars = 0;
  const timeline: ChordWindow[] = [];

  for (const section of song.sections) {
    const chordCount = Math.max(1, section.chords.length);
    const barsPerChord = section.bars / chordCount;
    for (const chordId of section.chords) {
      const durationMs = barsPerChord * beatsPerBar * beatMs;
      timeline.push({ chordId, startMs: t, endMs: t + durationMs });
      t += durationMs;
    }
    totalBars += section.bars;
  }

  return { timeline, totalMs: t, totalBars, beatsPerBar };
}

export function expectedChordAt(timeline: ChordWindow[], ms: number): string | null {
  const w = timeline.find((w) => ms >= w.startMs && ms < w.endMs);
  return w?.chordId ?? null;
}

export interface FixAnalysisResult {
  overallAccuracy: number;
  timingScore: number;
  chordAccuracy: Record<string, number>;
  issues: FixMyPlayingIssue[];
}

export function analyzePerformance(
  song: SongArrangement,
  samples: ChordSample[],
  onsets: number[],
  totalBars: number,
  beatsPerBar: number
): FixAnalysisResult {
  const grid = buildBeatGrid(song.bpm, totalBars, beatsPerBar, 0);
  const { accuracy: timingScore } = scoreTiming(onsets, grid);

  const byChord: Record<string, { correct: number; total: number }> = {};
  for (const s of samples) {
    byChord[s.expected] ??= { correct: 0, total: 0 };
    byChord[s.expected].total++;
    if (s.matched === s.expected) byChord[s.expected].correct++;
  }
  const chordAccuracy: Record<string, number> = {};
  for (const [chord, { correct, total }] of Object.entries(byChord)) {
    chordAccuracy[chord] = total > 0 ? Math.round((correct / total) * 100) : 0;
  }

  // Tempo drift: compare average onset spacing in the first vs second half.
  let tempoDriftPct = 0;
  if (onsets.length > 6) {
    const mid = Math.floor(onsets.length / 2);
    const firstIntervals = intervals(onsets.slice(0, mid));
    const secondIntervals = intervals(onsets.slice(mid));
    const firstAvg = avg(firstIntervals);
    const secondAvg = avg(secondIntervals);
    if (firstAvg > 0) tempoDriftPct = Math.round(((firstAvg - secondAvg) / firstAvg) * 100);
  }

  const issues: FixMyPlayingIssue[] = [];
  for (const [chord, acc] of Object.entries(chordAccuracy).sort((a, b) => a[1] - b[1])) {
    if (acc < 85) {
      issues.push({
        label: `${chord} chord`,
        detail: `${acc}% accuracy — the chord wasn't ringing cleanly during its sections.`,
        severity: acc < 60 ? "high" : acc < 80 ? "medium" : "low",
        metric: `${acc}%`,
      });
    }
  }
  if (timingScore < 80) {
    issues.push({
      label: "Strumming timing",
      detail: `Strums landed on the beat about ${timingScore}% of the time — try practicing with the metronome a little slower.`,
      severity: timingScore < 60 ? "high" : "medium",
      metric: `${timingScore}%`,
    });
  }
  if (tempoDriftPct > 12) {
    issues.push({
      label: "Tempo",
      detail: `You sped up roughly ${tempoDriftPct}% over the course of the song, especially in the harder sections.`,
      severity: tempoDriftPct > 25 ? "high" : "medium",
    });
  } else if (tempoDriftPct < -12) {
    issues.push({
      label: "Tempo",
      detail: `You slowed down roughly ${Math.abs(tempoDriftPct)}% over the course of the song.`,
      severity: Math.abs(tempoDriftPct) > 25 ? "high" : "medium",
    });
  }

  const severityWeight = { high: 0, medium: 1, low: 2 } as const;
  issues.sort((a, b) => severityWeight[a.severity] - severityWeight[b.severity]);

  const chordAccVals = Object.values(chordAccuracy);
  const chordAvg = chordAccVals.length ? avg(chordAccVals) : 100;
  const overallAccuracy = Math.round(chordAvg * 0.6 + timingScore * 0.4);

  return { overallAccuracy, timingScore, chordAccuracy, issues };
}

function intervals(arr: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < arr.length; i++) out.push(arr[i] - arr[i - 1]);
  return out;
}

function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
