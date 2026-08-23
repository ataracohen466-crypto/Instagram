// Shared types across the app: onboarding, progress, songs, lessons, sessions.

export type GuitarType = "acoustic" | "electric" | "classical" | "bass";

export type SkillLevel = "absolute-beginner" | "beginner" | "early-intermediate" | "intermediate" | "advanced";

export type FocusPreference = "songs" | "technique" | "theory" | "mixture";

// The three parallel 20-level learning paths (lib/curriculum.ts).
export type PathKey = "chords" | "notes" | "tabs";

export interface PathProgress {
  completedLessonIds: string[]; // e.g. "chords-L03-P02-S04"
  unlockedLevel: number; // highest level (1-20) unlocked so far
}

export interface OnboardingProfile {
  name: string;
  guitarType: GuitarType;
  skillLevel: SkillLevel;
  genres: string[];
  artists: string;
  goals: string[];
  minutesPerDay: number; // preferred daily practice length
  focus: FocusPreference;
  completedAt: string | null;
}

export interface ChordDef {
  id: string; // e.g. "G", "Em", "F"
  name: string;
  // Six strings, low E to high E. null = muted, 0 = open.
  frets: (number | null)[];
  fingers: (number | null)[];
  barre?: { fret: number; fromString: number; toString: number };
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export interface LyricLine {
  text: string;
  chordId: string; // chord to play under this line
}

export interface SongSection {
  name: string; // "Intro", "Verse 1", "Chorus"...
  chords: string[]; // chord ids in order
  strumPattern: string; // e.g. "D DU UDU"
  bars: number;
  tab?: string; // ASCII tab block, optional
  notes?: string; // short teaching note for this section
  lyrics?: LyricLine[]; // original lyrics, line-by-line, each tagged with its chord — built-in songs only, never AI-generated (never copyrighted)
}

export interface SongArrangement {
  title: string;
  originalNote: string; // clarifies this is an original teaching arrangement
  difficulty: 1 | 2 | 3 | 4 | 5;
  bpm: number;
  capo: number;
  timeSignature: string;
  chordsUsed: string[];
  sections: SongSection[];
  versions: {
    beginner: string;
    intermediate: string;
    advanced: string;
  };
}

export interface Composition extends SongArrangement {
  prompt: string;
  melodyDescription: string;
  mood: string;
}

export interface PracticeExercise {
  id: string;
  title: string;
  minutes: number;
  kind: "chord" | "transition" | "strumming" | "technique" | "theory" | "song" | "rhythm";
  targetChords?: string[];
  instructions: string;
}

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  chordsTaught: string[];
  exercises: PracticeExercise[];
}

export interface LevelDef {
  id: number;
  key: SkillLevel;
  title: string;
  description: string;
  lessons: Lesson[];
  techniqueChallenges: string[];
  testChords: string[];
}

export interface PracticeSessionRecord {
  date: string; // ISO date
  minutes: number;
  focus: string;
}

export interface FixMyPlayingIssue {
  label: string;
  detail: string;
  severity: "high" | "medium" | "low";
  metric?: string;
}

export interface FixMyPlayingReport {
  songTitle: string;
  overallAccuracy: number;
  timingScore: number;
  chordAccuracy: Record<string, number>;
  issues: FixMyPlayingIssue[];
  summary: string;
  routine: PracticeExercise[];
  createdAt: string;
}

export interface GameScore {
  date: string;
  songTitle: string;
  accuracy: number;
  timingAccuracy: number;
  bestStreak: number;
  notesHit: number;
  notesTotal: number;
}

export interface UserProgress {
  level: SkillLevel;
  chordsMastered: string[]; // chord ids the learner has "mastered" (practiced enough)
  chordReps: Record<string, number>;
  songsLearned: string[];
  streakDays: number;
  lastPracticeDate: string | null;
  totalPracticeMinutes: number;
  sessionHistory: PracticeSessionRecord[];
  fixReports: FixMyPlayingReport[];
  gameScores: GameScore[];
  weakAreas: string[]; // free-text labels like "F chord", "C→G transition"
  paths: Record<PathKey, PathProgress>;
}
