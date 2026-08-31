"use client";

import { create } from "zustand";
import { newId } from "./id";
import type {
  AppData, Settings, CheckIn, JournalEntry, Goal, GoalMilestone,
  SkinCheckIn, SkinPhoto, SkinProduct, SkinRoutineLog, SkinExperiment,
  StoryMilestone, PrivacySettings, ToolkitUse,
} from "./types";

export function defaultPrivacy(): PrivacySettings {
  return {
    lockMethod: "none",
    encryptData: false,
    autoLockMinutes: 10,
    appleHealthConnected: false,
    appleHealthScopes: {},
  };
}

export function defaultSettings(): Settings {
  return {
    theme: "system",
    onboardingComplete: false,
    privacy: defaultPrivacy(),
    skinModuleEnabled: true,
  };
}

export function emptyData(): AppData {
  return {
    version: 1,
    settings: defaultSettings(),
    checkIns: [],
    journalEntries: [],
    goals: [],
    skinCheckIns: [],
    skinPhotos: [],
    skinProducts: [],
    skinRoutineLogs: [],
    skinExperiments: [],
    storyMilestones: [],
    toolkitUses: [],
  };
}

interface BloomState extends AppData {
  hydrated: boolean;
  locked: boolean;
  hydrate: (data: AppData, locked: boolean) => void;
  setLocked: (locked: boolean) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  updatePrivacy: (patch: Partial<PrivacySettings>) => void;

  upsertCheckIn: (
    checkIn: Omit<CheckIn, "id" | "createdAt" | "updatedAt"> & { id?: string }
  ) => CheckIn;
  deleteCheckIn: (id: string) => void;

  addJournalEntry: (entry: Omit<JournalEntry, "id" | "createdAt" | "updatedAt">) => JournalEntry;
  updateJournalEntry: (id: string, patch: Partial<JournalEntry>) => void;
  deleteJournalEntry: (id: string) => void;

  addGoal: (
    goal: Pick<Goal, "title" | "category"> &
      Partial<Pick<Goal, "description" | "targetValue" | "milestones">>
  ) => Goal;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  archiveGoal: (id: string, archived: boolean) => void;
  addGoalMilestone: (goalId: string, label: string) => void;
  toggleGoalMilestone: (goalId: string, milestoneId: string) => void;
  logGoalWeek: (goalId: string, note: string, progressDelta: number) => void;
  addHelpfulThing: (goalId: string, thing: string) => void;

  addSkinCheckIn: (c: Omit<SkinCheckIn, "id" | "createdAt">) => SkinCheckIn;
  deleteSkinCheckIn: (id: string) => void;
  addSkinPhoto: (p: Omit<SkinPhoto, "id" | "createdAt"> & { id?: string }) => SkinPhoto;
  deleteSkinPhoto: (id: string) => void;
  addSkinProduct: (p: Omit<SkinProduct, "id" | "startedAt"> & { startedAt?: number }) => SkinProduct;
  stopSkinProduct: (id: string) => void;
  deleteSkinProduct: (id: string) => void;
  logSkinRoutine: (date: string, patch: Partial<Pick<SkinRoutineLog, "amDone" | "pmDone">>) => void;
  addSkinExperiment: (e: Omit<SkinExperiment, "id" | "archived">) => SkinExperiment;
  archiveSkinExperiment: (id: string, archived: boolean) => void;

  addStoryMilestone: (m: Omit<StoryMilestone, "id">) => void;
  setAutoStoryMilestones: (ms: StoryMilestone[]) => void;
  deleteStoryMilestone: (id: string) => void;

  logToolkitUse: (toolId: string) => void;

  resetAllData: () => void;
  replaceAllData: (data: AppData) => void;
}

function touchSettings<T>(patch: Partial<T>, base: T): T {
  return { ...base, ...patch };
}

export const useStore = create<BloomState>((set, get) => ({
  ...emptyData(),
  hydrated: false,
  locked: false,

  hydrate: (data, locked) => set({ ...data, hydrated: true, locked }),
  setLocked: (locked) => set({ locked }),

  updateSettings: (patch) => set((s) => ({ settings: touchSettings(patch, s.settings) })),
  updatePrivacy: (patch) =>
    set((s) => ({ settings: { ...s.settings, privacy: { ...s.settings.privacy, ...patch } } })),

  upsertCheckIn: (checkIn) => {
    const now = Date.now();
    let result!: CheckIn;
    set((s) => {
      const existingIdx = s.checkIns.findIndex(
        (c) => c.date === checkIn.date || (checkIn.id && c.id === checkIn.id)
      );
      if (existingIdx >= 0) {
        result = { ...s.checkIns[existingIdx], ...checkIn, updatedAt: now };
        const next = [...s.checkIns];
        next[existingIdx] = result;
        return { checkIns: next };
      }
      result = { ...checkIn, id: checkIn.id ?? newId(), createdAt: now, updatedAt: now };
      return { checkIns: [...s.checkIns, result] };
    });
    return result;
  },
  deleteCheckIn: (id) => set((s) => ({ checkIns: s.checkIns.filter((c) => c.id !== id) })),

  addJournalEntry: (entry) => {
    const now = Date.now();
    const full: JournalEntry = { ...entry, id: newId(), createdAt: now, updatedAt: now };
    set((s) => ({ journalEntries: [full, ...s.journalEntries] }));
    return full;
  },
  updateJournalEntry: (id, patch) =>
    set((s) => ({
      journalEntries: s.journalEntries.map((e) =>
        e.id === id ? { ...e, ...patch, updatedAt: Date.now() } : e
      ),
    })),
  deleteJournalEntry: (id) =>
    set((s) => ({ journalEntries: s.journalEntries.filter((e) => e.id !== id) })),

  addGoal: (goal) => {
    const full: Goal = {
      id: newId(),
      title: goal.title,
      category: goal.category,
      description: goal.description,
      targetValue: goal.targetValue,
      createdAt: Date.now(),
      archived: false,
      progress: 0,
      milestones: goal.milestones ?? [],
      weeklyLog: [],
      helpfulThings: [],
    };
    set((s) => ({ goals: [...s.goals, full] }));
    return full;
  },
  updateGoal: (id, patch) =>
    set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
  deleteGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
  archiveGoal: (id, archived) =>
    set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, archived } : g)) })),
  addGoalMilestone: (goalId, label) =>
    set((s) => ({
      goals: s.goals.map((g) =>
        g.id === goalId
          ? { ...g, milestones: [...g.milestones, { id: newId(), label, done: false }] }
          : g
      ),
    })),
  toggleGoalMilestone: (goalId, milestoneId) =>
    set((s) => ({
      goals: s.goals.map((g) => {
        if (g.id !== goalId) return g;
        const milestones = g.milestones.map((m) =>
          m.id === milestoneId ? { ...m, done: !m.done, doneAt: !m.done ? Date.now() : undefined } : m
        );
        const doneCount = milestones.filter((m) => m.done).length;
        const progress = milestones.length ? Math.round((doneCount / milestones.length) * 100) : g.progress;
        return { ...g, milestones, progress };
      }),
    })),
  logGoalWeek: (goalId, note, progressDelta) =>
    set((s) => ({
      goals: s.goals.map((g) => {
        if (g.id !== goalId) return g;
        const weekStart = new Date().toISOString().slice(0, 10);
        return {
          ...g,
          weeklyLog: [...g.weeklyLog, { weekStart, note, progressDelta }],
          progress: Math.max(0, Math.min(100, g.progress + progressDelta)),
        };
      }),
    })),
  addHelpfulThing: (goalId, thing) =>
    set((s) => ({
      goals: s.goals.map((g) =>
        g.id === goalId && !g.helpfulThings.includes(thing)
          ? { ...g, helpfulThings: [...g.helpfulThings, thing] }
          : g
      ),
    })),

  addSkinCheckIn: (c) => {
    const full: SkinCheckIn = { ...c, id: newId(), createdAt: Date.now() };
    set((s) => {
      const idx = s.skinCheckIns.findIndex((x) => x.date === c.date);
      if (idx >= 0) {
        const next = [...s.skinCheckIns];
        next[idx] = { ...next[idx], ...c };
        return { skinCheckIns: next };
      }
      return { skinCheckIns: [...s.skinCheckIns, full] };
    });
    return full;
  },
  deleteSkinCheckIn: (id) =>
    set((s) => ({ skinCheckIns: s.skinCheckIns.filter((c) => c.id !== id) })),

  addSkinPhoto: (p) => {
    const full: SkinPhoto = { ...p, id: p.id || newId(), createdAt: Date.now() };
    set((s) => ({ skinPhotos: [...s.skinPhotos, full] }));
    return full;
  },
  deleteSkinPhoto: (id) => set((s) => ({ skinPhotos: s.skinPhotos.filter((p) => p.id !== id) })),

  addSkinProduct: (p) => {
    const full: SkinProduct = { ...p, id: newId(), startedAt: p.startedAt ?? Date.now() };
    set((s) => ({ skinProducts: [...s.skinProducts, full] }));
    return full;
  },
  stopSkinProduct: (id) =>
    set((s) => ({
      skinProducts: s.skinProducts.map((p) => (p.id === id ? { ...p, stoppedAt: Date.now() } : p)),
    })),
  deleteSkinProduct: (id) =>
    set((s) => ({ skinProducts: s.skinProducts.filter((p) => p.id !== id) })),

  logSkinRoutine: (date, patch) =>
    set((s) => {
      const idx = s.skinRoutineLogs.findIndex((l) => l.date === date);
      if (idx >= 0) {
        const next = [...s.skinRoutineLogs];
        next[idx] = { ...next[idx], ...patch };
        return { skinRoutineLogs: next };
      }
      return {
        skinRoutineLogs: [
          ...s.skinRoutineLogs,
          { date, amDone: false, pmDone: false, ...patch },
        ],
      };
    }),

  addSkinExperiment: (e) => {
    const full: SkinExperiment = { ...e, id: newId(), archived: false };
    set((s) => ({ skinExperiments: [...s.skinExperiments, full] }));
    return full;
  },
  archiveSkinExperiment: (id, archived) =>
    set((s) => ({
      skinExperiments: s.skinExperiments.map((e) => (e.id === id ? { ...e, archived } : e)),
    })),

  addStoryMilestone: (m) =>
    set((s) => ({ storyMilestones: [...s.storyMilestones, { ...m, id: newId() }] })),
  setAutoStoryMilestones: (ms) =>
    set((s) => ({
      storyMilestones: [...s.storyMilestones.filter((m) => m.kind === "manual"), ...ms],
    })),
  deleteStoryMilestone: (id) =>
    set((s) => ({ storyMilestones: s.storyMilestones.filter((m) => m.id !== id) })),

  logToolkitUse: (toolId) =>
    set((s) => ({
      toolkitUses: [
        ...s.toolkitUses,
        { id: newId(), toolId, date: new Date().toISOString().slice(0, 10), createdAt: Date.now() },
      ],
    })),

  resetAllData: () => set({ ...emptyData(), hydrated: true, locked: false }),
  replaceAllData: (data) => set({ ...data, hydrated: true }),
}));

/** Pulls the plain-serializable slice of state back out for persistence/export. */
export function snapshotData(): AppData {
  const s = useStore.getState();
  return {
    version: s.version,
    settings: s.settings,
    checkIns: s.checkIns,
    journalEntries: s.journalEntries,
    goals: s.goals,
    skinCheckIns: s.skinCheckIns,
    skinPhotos: s.skinPhotos,
    skinProducts: s.skinProducts,
    skinRoutineLogs: s.skinRoutineLogs,
    skinExperiments: s.skinExperiments,
    storyMilestones: s.storyMilestones,
    toolkitUses: s.toolkitUses,
  };
}
