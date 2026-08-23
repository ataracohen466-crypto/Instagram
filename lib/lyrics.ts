import type { SongArrangement } from "./types";

export interface TimedLyricLine {
  text: string;
  chordId: string;
  sectionName: string;
  startMs: number;
  endMs: number;
}

/** Lays a song's lyric lines out along a timeline in ms, evenly dividing each section's duration among its lines. */
export function buildLyricTimeline(song: SongArrangement): { lines: TimedLyricLine[]; totalMs: number } {
  const beatsPerBar = Number(song.timeSignature.split("/")[0]) || 4;
  const beatMs = 60000 / song.bpm;
  let t = 0;
  const lines: TimedLyricLine[] = [];

  for (const section of song.sections) {
    const sectionMs = section.bars * beatsPerBar * beatMs;
    if (section.lyrics?.length) {
      const perLine = sectionMs / section.lyrics.length;
      section.lyrics.forEach((line, i) => {
        lines.push({ text: line.text, chordId: line.chordId, sectionName: section.name, startMs: t + i * perLine, endMs: t + (i + 1) * perLine });
      });
    }
    t += sectionMs;
  }
  return { lines, totalMs: t };
}

export function hasLyrics(song: SongArrangement): boolean {
  return song.sections.some((s) => s.lyrics && s.lyrics.length > 0);
}
