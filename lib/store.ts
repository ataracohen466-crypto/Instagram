"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  OnboardingProfile,
  UserProgress,
  FixMyPlayingReport,
  GameScore,
  PracticeSessionRecord,
  PathKey,
  PathProgress,
  SkillLevel,
} from "./types";

const defaultProfile: OnboardingProfile = {
  name: "",
  guitarType: "acoustic",
  skillLevel: "beginner",
  genres: [],
  artists: "",
  goals: [],
  minutesPerDay: 15,
  focus: "mixture",
  completedAt: null,
};

function freshPathProgress(unlockedLevel = 1): PathProgress {
  return { completedLessonIds: [], unlockedLevel };
}

const defaultProgress: UserProgress = {
  level: "beginner",
  chordsMastered: [],
  chordReps: {},
  songsLearned: [],
  streakDays: 0,
  lastPracticeDate: null,
  totalPracticeMinutes: 0,
  sessionHistory: [],
  fixReports: [],
  gameScores: [],
  weakAreas: [],
  paths: { chords: freshPathProgress(), notes: freshPathProgress(), tabs: freshPathProgress() },
};

// Onboarding's 5-tier self-report maps to a starting level (1-20) in each
// path so an intermediate/advanced learner isn't stuck redoing open chords.
const STARTING_LEVEL_BY_SKILL: Record<SkillLevel, number> = {
  "absolute-beginner": 1,
  beginner: 3,
  "early-intermediate": 7,
  intermediate: 11,
  advanced: 15,
};

interface GuitarAIState {
  profile: OnboardingProfile;
  progress: UserProgress;
  setProfile: (p: Partial<OnboardingProfile>) => void;
  completeOnboarding: (p: OnboardingProfile) => void;
  resetOnboarding: () => void;
  logPractice: (minutes: number, focus: string) => void;
  addChordReps: (chordId: string, reps: number) => void;
  completeGeneratedLesson: (path: PathKey, lessonId: string, level: number, lessonsPerLevel: number) => void;
  addSongLearned: (title: string) => void;
  addFixReport: (report: FixMyPlayingReport) => void;
  addGameScore: (score: GameScore) => void;
  setWeakAreas: (areas: string[]) => void;
  setLevel: (level: UserProgress["level"]) => void;
}

function isConsecutiveDay(lastIso: string | null): "same" | "next" | "gap" {
  if (!lastIso) return "gap";
  const last = new Date(lastIso);
  const today = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.round(
    (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) -
      Date.UTC(last.getFullYear(), last.getMonth(), last.getDate())) /
      oneDay
  );
  if (diffDays === 0) return "same";
  if (diffDays === 1) return "next";
  return "gap";
}

export const useGuitarAI = create<GuitarAIState>()(
  persist(
    (set, get) => ({
      profile: defaultProfile,
      progress: defaultProgress,

      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),

      completeOnboarding: (p) =>
        set((s) => {
          const startLevel = STARTING_LEVEL_BY_SKILL[p.skillLevel];
          return {
            profile: { ...p, completedAt: new Date().toISOString() },
            progress: {
              ...s.progress,
              level: p.skillLevel,
              paths: {
                chords: freshPathProgress(startLevel),
                notes: freshPathProgress(startLevel),
                tabs: freshPathProgress(startLevel),
              },
            },
          };
        }),

      resetOnboarding: () => set({ profile: defaultProfile, progress: defaultProgress }),

      logPractice: (minutes, focus) =>
        set((s) => {
          const rel = isConsecutiveDay(s.progress.lastPracticeDate);
          const streakDays = rel === "same" ? s.progress.streakDays : rel === "next" ? s.progress.streakDays + 1 : 1;
          const record: PracticeSessionRecord = { date: new Date().toISOString(), minutes, focus };
          return {
            progress: {
              ...s.progress,
              streakDays,
              lastPracticeDate: new Date().toISOString(),
              totalPracticeMinutes: s.progress.totalPracticeMinutes + minutes,
              sessionHistory: [record, ...s.progress.sessionHistory].slice(0, 200),
            },
          };
        }),

      addChordReps: (chordId, reps) =>
        set((s) => {
          const nextReps = { ...s.progress.chordReps, [chordId]: (s.progress.chordReps[chordId] ?? 0) + reps };
          const mastered = new Set(s.progress.chordsMastered);
          if (nextReps[chordId] >= 30) mastered.add(chordId);
          return { progress: { ...s.progress, chordReps: nextReps, chordsMastered: Array.from(mastered) } };
        }),

      completeGeneratedLesson: (path, lessonId, level, lessonsPerLevel) =>
        set((s) => {
          const current = s.progress.paths[path];
          const completedLessonIds = Array.from(new Set([...current.completedLessonIds, lessonId]));
          const levelTag = `-L${String(level).padStart(2, "0")}-`;
          const doneInLevel = completedLessonIds.filter((id) => id.includes(levelTag)).length;
          const readyToAdvance = doneInLevel >= Math.ceil(lessonsPerLevel * 0.6);
          const unlockedLevel = readyToAdvance ? Math.max(current.unlockedLevel, Math.min(20, level + 1)) : current.unlockedLevel;
          return {
            progress: {
              ...s.progress,
              paths: { ...s.progress.paths, [path]: { completedLessonIds, unlockedLevel } },
            },
          };
        }),

      addSongLearned: (title) =>
        set((s) => ({
          progress: { ...s.progress, songsLearned: Array.from(new Set([...s.progress.songsLearned, title])) },
        })),

      addFixReport: (report) =>
        set((s) => ({
          progress: {
            ...s.progress,
            fixReports: [report, ...s.progress.fixReports].slice(0, 50),
            weakAreas: Array.from(
              new Set([...report.issues.slice(0, 3).map((i) => i.label), ...s.progress.weakAreas])
            ).slice(0, 8),
          },
        })),

      addGameScore: (score) =>
        set((s) => ({ progress: { ...s.progress, gameScores: [score, ...s.progress.gameScores].slice(0, 100) } })),

      setWeakAreas: (areas) => set((s) => ({ progress: { ...s.progress, weakAreas: areas } })),

      setLevel: (level) => set((s) => ({ progress: { ...s.progress, level } })),
    }),
    {
      name: "guitar-ai-storage",
      version: 1,
      migrate: (persisted) => {
        const state = persisted as { profile?: OnboardingProfile; progress?: Partial<UserProgress> };
        if (state?.progress && !state.progress.paths) {
          state.progress.paths = { chords: freshPathProgress(), notes: freshPathProgress(), tabs: freshPathProgress() };
        }
        return state as { profile: OnboardingProfile; progress: UserProgress };
      },
    }
  )
);

export function usePersonalRecord(): GameScore | null {
  const scores = useGuitarAI((s) => s.progress.gameScores);
  if (scores.length === 0) return null;
  return scores.reduce((best, cur) => (cur.accuracy > best.accuracy ? cur : best), scores[0]);
}
