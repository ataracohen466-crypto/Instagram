"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  Achievement,
  ChatMessage,
  CramPlan,
  Flashcard,
  MasteryStatus,
  Note,
  NoteSummary,
  Profile,
  StudyGuide,
  StudyPlan,
  Subject,
  SummaryLength,
  Test,
  TestAttempt,
  TopicMastery,
} from "./types";
import { ReviewGrade, isDue, newSrsState, schedule, sortByDue } from "./srs";
import { isoDay, levelForXp, uid } from "./utils";

const STORAGE_KEY = "tutorai.v1";

function defaultSubjects(): Subject[] {
  const now = Date.now();
  return [
    { id: "biology", name: "Biology", color: "#16a34a", icon: "Leaf", createdAt: now },
    { id: "history", name: "World History", color: "#b45309", icon: "Landmark", createdAt: now },
    { id: "algebra", name: "Algebra II", color: "#4f46e5", icon: "Sigma", createdAt: now },
  ];
}

function defaultProfile(): Profile {
  return {
    name: "Student",
    level: 1,
    xp: 0,
    streakDays: 0,
    lastStudyDate: null,
    achievements: [],
    dailyMinutes: 30,
    gradeLevel: "High school",
  };
}

const ACHIEVEMENTS: Record<string, Omit<Achievement, "earnedAt">> = {
  "first-note": {
    id: "first-note",
    label: "First notes in",
    description: "Added your first set of notes.",
    icon: "FileText",
  },
  "first-test": {
    id: "first-test",
    label: "Test taker",
    description: "Completed your first practice test.",
    icon: "ClipboardCheck",
  },
  "perfect-score": {
    id: "perfect-score",
    label: "Flawless",
    description: "Scored 100% on a test.",
    icon: "Trophy",
  },
  "streak-3": {
    id: "streak-3",
    label: "Three in a row",
    description: "Studied three days running.",
    icon: "Flame",
  },
  "streak-7": {
    id: "streak-7",
    label: "Week strong",
    description: "Seven-day study streak.",
    icon: "Flame",
  },
  "cards-50": {
    id: "cards-50",
    label: "Card shark",
    description: "Reviewed 50 flashcards.",
    icon: "Layers",
  },
  "mastered-5": {
    id: "mastered-5",
    label: "Topic master",
    description: "Got five topics to mastered.",
    icon: "Star",
  },
};

interface Stats {
  cardsReviewed: number;
  questionsAnswered: number;
  minutesStudied: number;
}

export interface AppState {
  hydrated: boolean;
  profile: Profile;
  subjects: Subject[];
  notes: Note[];
  flashcards: Flashcard[];
  tests: Test[];
  attempts: TestAttempt[];
  mastery: TopicMastery[];
  plans: StudyPlan[];
  guides: StudyGuide[];
  cramPlans: CramPlan[];
  chats: Record<string, ChatMessage[]>;
  stats: Stats;
  activeSubjectId: string;

  markHydrated: () => void;
  setActiveSubject: (id: string) => void;
  updateProfile: (patch: Partial<Profile>) => void;

  addSubject: (name: string, color: string, icon: string) => Subject;
  updateSubject: (id: string, patch: Partial<Subject>) => void;
  removeSubject: (id: string) => void;

  addNote: (note: Omit<Note, "id" | "createdAt">) => Note;
  updateNote: (id: string, patch: Partial<Note>) => void;
  setNoteSummary: (id: string, length: SummaryLength, summary: NoteSummary) => void;
  removeNote: (id: string) => void;

  addFlashcards: (
    cards: { front: string; back: string; topic: string }[],
    subjectId: string,
    noteId?: string
  ) => Flashcard[];
  reviewFlashcard: (id: string, grade: ReviewGrade) => void;
  removeFlashcard: (id: string) => void;

  addTest: (test: Omit<Test, "id" | "createdAt">) => Test;
  removeTest: (id: string) => void;

  saveAttempt: (attempt: TestAttempt) => void;
  recordMastery: (
    subjectId: string,
    scores: { topic: string; score: number }[],
    source: "test" | "practice" | "flashcard" | "teach-back"
  ) => void;

  setPlan: (plan: StudyPlan) => void;
  toggleTask: (planId: string, date: string, taskId: string) => void;

  addGuide: (guide: StudyGuide) => void;
  setCramPlan: (plan: CramPlan) => void;

  appendChat: (key: string, message: ChatMessage) => void;
  clearChat: (key: string) => void;

  awardXp: (amount: number) => void;
  touchStreak: () => void;
  bumpStat: (key: keyof Stats, amount: number) => void;
  resetEverything: () => void;
}

function statusFromScore(score: number): MasteryStatus {
  if (score >= 80) return "mastered";
  if (score >= 55) return "learning";
  return "needs-review";
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      profile: defaultProfile(),
      subjects: defaultSubjects(),
      notes: [],
      flashcards: [],
      tests: [],
      attempts: [],
      mastery: [],
      plans: [],
      guides: [],
      cramPlans: [],
      chats: {},
      stats: { cardsReviewed: 0, questionsAnswered: 0, minutesStudied: 0 },
      activeSubjectId: "biology",

      markHydrated: () => set({ hydrated: true }),
      setActiveSubject: (id) => set({ activeSubjectId: id }),
      updateProfile: (patch) =>
        set((s) => ({ profile: { ...s.profile, ...patch } })),

      addSubject: (name, color, icon) => {
        const subject: Subject = {
          id: uid("sub"),
          name,
          color,
          icon,
          createdAt: Date.now(),
        };
        set((s) => ({ subjects: [...s.subjects, subject] }));
        return subject;
      },
      updateSubject: (id, patch) =>
        set((s) => ({
          subjects: s.subjects.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      removeSubject: (id) =>
        set((s) => ({
          subjects: s.subjects.filter((x) => x.id !== id),
          notes: s.notes.filter((n) => n.subjectId !== id),
          flashcards: s.flashcards.filter((f) => f.subjectId !== id),
          tests: s.tests.filter((t) => t.subjectId !== id),
          mastery: s.mastery.filter((m) => m.subjectId !== id),
          plans: s.plans.filter((p) => p.subjectId !== id),
          activeSubjectId:
            s.activeSubjectId === id
              ? s.subjects.find((x) => x.id !== id)?.id ?? ""
              : s.activeSubjectId,
        })),

      addNote: (note) => {
        const created: Note = { ...note, id: uid("note"), createdAt: Date.now() };
        set((s) => ({ notes: [created, ...s.notes] }));
        get().awardXp(10);
        get().touchStreak();
        grantAchievement(set, get, "first-note");
        return created;
      },
      updateNote: (id, patch) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
        })),
      setNoteSummary: (id, length, summary) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id
              ? { ...n, summary: { ...(n.summary ?? {}), [length]: summary } }
              : n
          ),
        })),
      removeNote: (id) =>
        set((s) => ({
          notes: s.notes.filter((n) => n.id !== id),
          flashcards: s.flashcards.filter((f) => f.noteId !== id),
        })),

      addFlashcards: (cards, subjectId, noteId) => {
        const now = Date.now();
        const created: Flashcard[] = cards.map((c) => ({
          id: uid("card"),
          noteId,
          subjectId,
          front: c.front,
          back: c.back,
          topic: c.topic,
          srs: newSrsState(now),
          createdAt: now,
        }));
        set((s) => ({ flashcards: [...s.flashcards, ...created] }));
        return created;
      },
      reviewFlashcard: (id, grade) => {
        const card = get().flashcards.find((c) => c.id === id);
        if (!card) return;
        const next = schedule(card.srs, grade);
        set((s) => ({
          flashcards: s.flashcards.map((c) =>
            c.id === id ? { ...c, srs: next } : c
          ),
          stats: { ...s.stats, cardsReviewed: s.stats.cardsReviewed + 1 },
        }));
        const score = grade === "again" ? 20 : grade === "hard" ? 55 : grade === "good" ? 80 : 95;
        get().recordMastery(card.subjectId, [{ topic: card.topic, score }], "flashcard");
        get().awardXp(grade === "again" ? 2 : 5);
        get().touchStreak();
        if (get().stats.cardsReviewed >= 50) grantAchievement(set, get, "cards-50");
      },
      removeFlashcard: (id) =>
        set((s) => ({ flashcards: s.flashcards.filter((c) => c.id !== id) })),

      addTest: (test) => {
        const created: Test = { ...test, id: uid("test"), createdAt: Date.now() };
        set((s) => ({ tests: [created, ...s.tests] }));
        return created;
      },
      removeTest: (id) =>
        set((s) => ({
          tests: s.tests.filter((t) => t.id !== id),
          attempts: s.attempts.filter((a) => a.testId !== id),
        })),

      saveAttempt: (attempt) => {
        set((s) => ({
          attempts: [
            attempt,
            ...s.attempts.filter((a) => a.id !== attempt.id),
          ],
          stats: {
            ...s.stats,
            questionsAnswered:
              s.stats.questionsAnswered + attempt.questionResults.length,
          },
        }));

        // Per-topic averages from this attempt drive the mastery grid.
        const byTopic = new Map<string, { hit: number; total: number }>();
        for (const r of attempt.questionResults) {
          const bucket = byTopic.get(r.topic) ?? { hit: 0, total: 0 };
          bucket.hit += r.credit;
          bucket.total += 1;
          byTopic.set(r.topic, bucket);
        }
        get().recordMastery(
          attempt.subjectId,
          [...byTopic.entries()].map(([topic, b]) => ({
            topic,
            score: Math.round((b.hit / Math.max(1, b.total)) * 100),
          })),
          "test"
        );

        get().awardXp(Math.round(attempt.score / 2) + 20);
        get().touchStreak();
        grantAchievement(set, get, "first-test");
        if (attempt.score >= 100) grantAchievement(set, get, "perfect-score");
      },

      recordMastery: (subjectId, scores, source) => {
        const now = Date.now();
        set((s) => {
          const next = [...s.mastery];
          for (const { topic, score } of scores) {
            if (!topic) continue;
            const idx = next.findIndex(
              (m) => m.subjectId === subjectId && m.topic === topic
            );
            if (idx === -1) {
              next.push({
                topic,
                subjectId,
                status: statusFromScore(score),
                lastUpdated: now,
                history: [{ at: now, score, source }],
              });
            } else {
              const prev = next[idx];
              const history = [...prev.history, { at: now, score, source }].slice(-20);
              // Weight recent performance but don't let one bad card wipe a topic.
              const recent = history.slice(-3);
              const avg =
                recent.reduce((sum, h) => sum + h.score, 0) / recent.length;
              next[idx] = {
                ...prev,
                status: statusFromScore(avg),
                lastUpdated: now,
                history,
              };
            }
          }
          return { mastery: next };
        });
        const mastered = get().mastery.filter((m) => m.status === "mastered");
        if (mastered.length >= 5) grantAchievement(set, get, "mastered-5");
      },

      setPlan: (plan) =>
        set((s) => ({
          plans: [plan, ...s.plans.filter((p) => p.subjectId !== plan.subjectId)],
        })),
      toggleTask: (planId, date, taskId) =>
        set((s) => ({
          plans: s.plans.map((p) => {
            if (p.id !== planId) return p;
            const days = p.days.map((d) => {
              if (d.date !== date) return d;
              const tasks = d.tasks.map((t) =>
                t.id === taskId ? { ...t, done: !t.done } : t
              );
              return { ...d, tasks, completed: tasks.every((t) => t.done) };
            });
            return { ...p, days };
          }),
        })),

      addGuide: (guide) =>
        set((s) => ({
          guides: [guide, ...s.guides.filter((g) => g.id !== guide.id)],
        })),
      setCramPlan: (plan) =>
        set((s) => ({
          cramPlans: [
            plan,
            ...s.cramPlans.filter((p) => p.subjectId !== plan.subjectId),
          ],
        })),

      appendChat: (key, message) =>
        set((s) => ({
          chats: { ...s.chats, [key]: [...(s.chats[key] ?? []), message] },
        })),
      clearChat: (key) =>
        set((s) => {
          const chats = { ...s.chats };
          delete chats[key];
          return { chats };
        }),

      awardXp: (amount) =>
        set((s) => {
          const xp = s.profile.xp + amount;
          return { profile: { ...s.profile, xp, level: levelForXp(xp) } };
        }),

      touchStreak: () => {
        const today = isoDay();
        const { profile } = get();
        if (profile.lastStudyDate === today) return;
        const yesterday = isoDay(new Date(Date.now() - 24 * 60 * 60 * 1000));
        const streakDays =
          profile.lastStudyDate === yesterday ? profile.streakDays + 1 : 1;
        set({ profile: { ...profile, lastStudyDate: today, streakDays } });
        if (streakDays >= 3) grantAchievement(set, get, "streak-3");
        if (streakDays >= 7) grantAchievement(set, get, "streak-7");
      },

      bumpStat: (key, amount) =>
        set((s) => ({ stats: { ...s.stats, [key]: s.stats[key] + amount } })),

      resetEverything: () =>
        set({
          profile: defaultProfile(),
          subjects: defaultSubjects(),
          notes: [],
          flashcards: [],
          tests: [],
          attempts: [],
          mastery: [],
          plans: [],
          guides: [],
          cramPlans: [],
          chats: {},
          stats: { cardsReviewed: 0, questionsAnswered: 0, minutesStudied: 0 },
          activeSubjectId: "biology",
        }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ hydrated, ...rest }) => rest as AppState,
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    }
  )
);

type SetFn = (
  partial: Partial<AppState> | ((s: AppState) => Partial<AppState>)
) => void;

function grantAchievement(set: SetFn, get: () => AppState, id: string): void {
  const template = ACHIEVEMENTS[id];
  if (!template) return;
  if (get().profile.achievements.some((a) => a.id === id)) return;
  set((s) => ({
    profile: {
      ...s.profile,
      achievements: [
        ...s.profile.achievements,
        { ...template, earnedAt: Date.now() },
      ],
    },
  }));
}

/* ------------------------------------------------------------------ */
/* Selectors — plain functions so they can be used inside components   */
/* without extra subscriptions.                                        */
/* ------------------------------------------------------------------ */

export function dueCards(state: AppState, subjectId?: string): Flashcard[] {
  const pool = subjectId
    ? state.flashcards.filter((c) => c.subjectId === subjectId)
    : state.flashcards;
  return sortByDue(pool).filter((c) => isDue(c.srs));
}

export function reviewQueue(state: AppState, subjectId?: string): Flashcard[] {
  const pool = subjectId
    ? state.flashcards.filter((c) => c.subjectId === subjectId)
    : state.flashcards;
  const due = sortByDue(pool);
  const dueNow = due.filter((c) => isDue(c.srs));
  // If nothing is due, offer the soonest cards so Practice is never empty.
  return dueNow.length > 0 ? dueNow : due.slice(0, 10);
}

export function weakTopics(state: AppState, subjectId?: string): TopicMastery[] {
  return state.mastery
    .filter((m) => m.status === "needs-review")
    .filter((m) => !subjectId || m.subjectId === subjectId)
    .sort((a, b) => b.lastUpdated - a.lastUpdated);
}

export function masteryFor(
  state: AppState,
  subjectId: string
): TopicMastery[] {
  return state.mastery
    .filter((m) => m.subjectId === subjectId)
    .sort((a, b) => a.topic.localeCompare(b.topic));
}

export function planFor(state: AppState, subjectId: string): StudyPlan | undefined {
  return state.plans.find((p) => p.subjectId === subjectId);
}

export function latestAttempt(state: AppState): TestAttempt | undefined {
  return state.attempts.filter((a) => a.submittedAt).sort(
    (a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0)
  )[0];
}

export function subjectById(state: AppState, id: string): Subject | undefined {
  return state.subjects.find((s) => s.id === id);
}

export function nextExam(
  state: AppState
): { subject: Subject; examDate: string } | null {
  const upcoming = state.subjects
    .filter((s) => Boolean(s.examDate))
    .map((s) => ({ subject: s, examDate: s.examDate as string }))
    .filter((x) => new Date(x.examDate).getTime() >= Date.now() - 24 * 3600 * 1000)
    .sort((a, b) => a.examDate.localeCompare(b.examDate));
  return upcoming[0] ?? null;
}

export function todayTasks(state: AppState): {
  plan: StudyPlan;
  day: StudyPlan["days"][number];
} | null {
  const today = isoDay();
  for (const plan of state.plans) {
    const day = plan.days.find((d) => d.date === today);
    if (day) return { plan, day };
  }
  // Fall back to the first unfinished day of any plan.
  for (const plan of state.plans) {
    const day = plan.days.find((d) => !d.completed);
    if (day) return { plan, day };
  }
  return null;
}
