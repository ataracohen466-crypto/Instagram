// Core data model for Bloom. Everything here lives only in the user's
// browser (localStorage + IndexedDB for photos) — see lib/store.ts and
// lib/db.ts. Nothing in this file is ever sent to a server.

export type ThemeName = "light" | "dark" | "system";

export type DayKey = string; // "YYYY-MM-DD", local calendar day

/** A 0-10 scale used across most check-in sliders. 0 = lowest, 10 = highest. */
export type Scale10 = number;

export const EMOTIONS = [
  "happy", "calm", "grateful", "hopeful", "proud", "excited", "content",
  "curious", "loved", "relieved",
  "tired", "anxious", "stressed", "sad", "lonely", "angry", "frustrated",
  "overwhelmed", "nervous", "numb", "bored", "insecure",
] as const;
export type Emotion = (typeof EMOTIONS)[number];

export const LIFESTYLE_FACTORS = [
  "exercise", "timeOutside", "goodSleep", "socialTime", "screenTime",
  "journaled", "music", "hydrated", "mindfulness", "ateWell",
] as const;
export type LifestyleFactor = (typeof LIFESTYLE_FACTORS)[number];

export interface CheckIn {
  id: string;
  date: DayKey;
  createdAt: number;
  updatedAt: number;

  overallMood: Scale10;
  emotions: Emotion[];
  anxiety: Scale10;
  energy: Scale10;
  motivation: Scale10;
  sleepQuality: Scale10;
  sleepHours?: number;
  socialConnection: Scale10;
  schoolWorkStress: Scale10;
  physicalWellbeing: Scale10;
  confidence: Scale10;

  gratitude?: string;
  wentWell?: string;
  difficult?: string;
  journalNote?: string;

  lifestyle: Partial<Record<LifestyleFactor, boolean>>;

  reflectionPrompt?: string;
  reflectionAnswer?: string;
}

export interface JournalPhoto {
  id: string; // key into IndexedDB blob store
  width: number;
  height: number;
}

export interface JournalEntry {
  id: string;
  date: DayKey;
  createdAt: number;
  updatedAt: number;
  title?: string;
  text: string;
  mood?: Scale10;
  tags: string[];
  photoIds: string[];
  usedVoice?: boolean;
}

export type GoalCategory =
  | "sleep" | "stress" | "exercise" | "journaling" | "social"
  | "mindfulness" | "confidence" | "study-life" | "screen-time" | "custom";

export interface GoalMilestone {
  id: string;
  label: string;
  done: boolean;
  doneAt?: number;
}

export interface GoalWeekEntry {
  weekStart: DayKey;
  note: string;
  progressDelta: number;
}

export interface Goal {
  id: string;
  title: string;
  category: GoalCategory;
  description?: string;
  createdAt: number;
  archived: boolean;
  targetValue?: number; // e.g. target sleep hours, target check-ins/week
  progress: number; // 0-100
  milestones: GoalMilestone[];
  weeklyLog: GoalWeekEntry[];
  helpfulThings: string[]; // history of what helped, user or system noted
}

// ---------- Skin tracking ----------

export const SKIN_CONCERN_AREAS = [
  "forehead", "cheeks", "chin", "nose", "jawline", "neck", "back", "other",
] as const;
export type SkinConcernArea = (typeof SKIN_CONCERN_AREAS)[number];

export interface SkinCheckIn {
  id: string;
  date: DayKey;
  createdAt: number;
  clarity: Scale10;
  breakouts: Scale10; // severity, 0 = none
  redness: Scale10;
  dryness: Scale10;
  oiliness: Scale10;
  irritation: Scale10;
  texture: Scale10; // 10 = smooth
  hydrationFeel: Scale10;
  areas: SkinConcernArea[];
  notes?: string;
}

export type SkinPhotoView = "front" | "left" | "right";

export interface SkinPhoto {
  id: string; // IndexedDB blob key
  date: DayKey;
  createdAt: number;
  view: SkinPhotoView;
  note?: string;
}

export interface SkinProduct {
  id: string;
  name: string;
  category: "cleanser" | "moisturizer" | "sunscreen" | "treatment" | "other";
  routine: "am" | "pm" | "both";
  startedAt: number;
  stoppedAt?: number;
}

export interface SkinRoutineLog {
  date: DayKey;
  amDone: boolean;
  pmDone: boolean;
}

export interface SkinExperiment {
  id: string;
  productName: string;
  changeType: "started" | "stopped" | "changed";
  startDate: DayKey;
  notes?: string;
  archived: boolean;
}

// ---------- Progress / story ----------

export interface ToolkitUse {
  id: string;
  toolId: string;
  date: DayKey;
  createdAt: number;
}

export interface StoryMilestone {
  id: string;
  date: DayKey;
  title: string;
  detail: string;
  kind: "auto" | "manual";
}

export type LockMethod = "none" | "passcode";

export interface PrivacySettings {
  lockMethod: LockMethod;
  passcodeHash?: string; // PBKDF2 hash, hex
  passcodeSalt?: string; // hex
  encryptData: boolean; // whether persisted store is AES-GCM encrypted at rest
  autoLockMinutes: number; // 0 = never
  appleHealthConnected: boolean;
  appleHealthScopes: Partial<Record<"sleep" | "workouts" | "steps" | "mindfulness" | "stateOfMind", boolean>>;
}

export interface Settings {
  theme: ThemeName;
  onboardingComplete: boolean;
  displayName?: string;
  ageRange?: "13-15" | "16-18" | "19-22" | "23+" | "prefer-not-to-say";
  checkInReminderTime?: string; // "HH:mm"
  privacy: PrivacySettings;
  skinModuleEnabled: boolean;
  lastActiveDayKey?: DayKey;
}

export interface AppData {
  version: number;
  settings: Settings;
  checkIns: CheckIn[];
  journalEntries: JournalEntry[];
  goals: Goal[];
  skinCheckIns: SkinCheckIn[];
  skinPhotos: SkinPhoto[];
  skinProducts: SkinProduct[];
  skinRoutineLogs: SkinRoutineLog[];
  skinExperiments: SkinExperiment[];
  storyMilestones: StoryMilestone[];
  toolkitUses: ToolkitUse[];
}

export const CRISIS_RESOURCES = [
  {
    region: "US",
    name: "988 Suicide & Crisis Lifeline",
    detail: "Call or text 988 — free, confidential, 24/7.",
  },
  {
    region: "US",
    name: "Crisis Text Line",
    detail: "Text HOME to 741741, 24/7.",
  },
  {
    region: "International",
    name: "Find a helpline near you",
    detail: "findahelpline.com lists crisis lines by country.",
  },
] as const;
