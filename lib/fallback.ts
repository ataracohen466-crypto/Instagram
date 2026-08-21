import type { SongArrangement, Composition, FixMyPlayingIssue } from "./types";

// Deterministic, template-based generators used when ANTHROPIC_API_KEY is
// not set (or a live call fails). The app must always produce a usable
// arrangement/report — never a dead end — so these mirror the shape the AI
// route returns, built from real music-theory progressions instead of a
// live model call.

const PROGRESSION_BANK: { chords: string[]; strum: string }[] = [
  { chords: ["G", "Em", "C", "D"], strum: "D DU UDU" },
  { chords: ["Am", "F", "C", "G"], strum: "D D DU D" },
  { chords: ["Em", "C", "G", "D"], strum: "D DU D DU" },
  { chords: ["C", "G", "Am", "F"], strum: "D D U UDU" },
];

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return h;
}

export function fallbackSongArrangement(title: string, genre?: string, difficultyPref?: string): SongArrangement {
  const seed = hash(title + (genre ?? ""));
  const prog = pick(PROGRESSION_BANK, seed);
  const bpm = 70 + (Math.abs(seed) % 6) * 10;
  const difficulty = (difficultyPref === "advanced" ? 4 : difficultyPref === "intermediate" ? 3 : 2) as 1 | 2 | 3 | 4 | 5;

  return {
    title,
    originalNote:
      "This is an original teaching arrangement inspired by your request, written for practice — not a transcription of the original recording.",
    difficulty,
    bpm,
    capo: 0,
    timeSignature: "4/4",
    chordsUsed: prog.chords,
    sections: [
      { name: "Intro", chords: prog.chords.slice(0, 2), strumPattern: "D D D D", bars: 4, notes: "Let each chord ring for a full bar before moving on." },
      { name: "Verse", chords: prog.chords, strumPattern: prog.strum, bars: 8, notes: "Keep your strumming arm moving in constant eighth notes, even where you don't strike a string." },
      { name: "Chorus", chords: [...prog.chords].reverse(), strumPattern: prog.strum, bars: 8, notes: "Try accenting beat 1 a little harder here for energy." },
      { name: "Outro", chords: [prog.chords[0]], strumPattern: "D . . .", bars: 2, notes: "Let the final chord ring out." },
    ],
    versions: {
      beginner: `Play each chord as a single whole-note strum per bar. Chords needed: ${prog.chords.join(", ")}.`,
      intermediate: `Full strum pattern "${prog.strum}" at ${bpm} BPM with clean chord changes on the beat.`,
      advanced: "Add a capo-free embellishment: a hammer-on into the first chord of each section, plus dynamic (loud/soft) contrast between verse and chorus.",
    },
  };
}

export function fallbackComposition(prompt: string): Composition {
  const seed = hash(prompt);
  const base = fallbackSongArrangement(titleFromPrompt(prompt), undefined, undefined);
  const moods = ["dreamy", "upbeat", "melancholic", "playful", "warm"];
  const mood = moods.find((m) => prompt.toLowerCase().includes(m)) ?? pick(moods, seed);
  return {
    ...base,
    prompt,
    mood,
    melodyDescription: `A simple, singable melody that stays mostly within the first three frets, moving mostly stepwise with a few small leaps to match a ${mood} feel. Built to sit comfortably over the chord progression below.`,
  };
}

function titleFromPrompt(prompt: string): string {
  const words = prompt.replace(/[^a-zA-Z0-9 ]/g, "").split(" ").filter(Boolean);
  const meaningful = words.filter((w) => w.length > 3).slice(0, 3);
  const title = (meaningful.length ? meaningful : words.slice(0, 3)).join(" ");
  return title ? `${title[0].toUpperCase()}${title.slice(1)}` : "Untitled Sketch";
}

export function fallbackReportSummary(issues: FixMyPlayingIssue[], overallAccuracy: number): string {
  if (issues.length === 0) {
    return `Strong pass — ${overallAccuracy}% overall accuracy. Keep playing this at tempo and start pushing the BPM up a little each day.`;
  }
  const top = issues[0];
  const detail = /[.!?]$/.test(top.detail.trim()) ? top.detail.trim() : `${top.detail.trim()}.`;
  return `Nice work getting through the whole song. The biggest opportunity right now is ${top.label.toLowerCase()} — ${detail} Fix that first and the rest tends to fall into place.`;
}
