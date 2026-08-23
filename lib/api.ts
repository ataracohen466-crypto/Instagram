"use client";

import {
  CramPlan,
  Difficulty,
  NoteSummary,
  Question,
  QuestionType,
  StudyGuide,
  PodcastLine,
  Slide,
  StudyPlanDay,
  SummaryLength,
  TeachBackResult,
  ChatMessage,
  QuestionResult,
} from "./types";

/**
 * Thin typed wrappers over the `/api/ai/*` routes. The routes themselves always
 * answer with usable content (Claude's, or an offline fallback), so these only
 * have to deal with genuine network/HTTP failures.
 */
async function post<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const response = await fetch(`/api/ai/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      console.error(`/api/ai/${path} responded ${response.status}`);
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error(`/api/ai/${path} request failed`, error);
    return null;
  }
}

export type AiSource = "claude" | "offline" | "fallback-error" | "auto";

export function summarizeNotes(input: {
  text: string;
  length: SummaryLength;
  title?: string;
  image?: { mediaType: string; data: string } | null;
}) {
  return post<{ summary: NoteSummary; source: AiSource }>(
    "summarize-notes",
    input
  );
}

export function generateMaterial(input: {
  text: string;
  title?: string;
  materials: ("flashcards" | QuestionType)[];
  flashcardCount?: number;
  questionCount?: number;
}) {
  return post<{
    flashcards: { front: string; back: string; topic: string }[];
    questions: Question[];
    source: AiSource;
  }>("generate-material", input);
}

export function generateTest(input: {
  subject: string;
  unit: string;
  difficulty: Difficulty;
  numQuestions: number;
  questionTypes: QuestionType[];
  timeLimitMinutes: number;
  material?: string;
  weakTopics?: string[];
  title?: string;
}) {
  return post<{ title: string; questions: Question[]; source: AiSource }>(
    "generate-test",
    input
  );
}

export function gradeTest(input: {
  questions: Question[];
  answers: Record<string, string>;
  title?: string;
  subject?: string;
}) {
  return post<{
    score: number;
    questionResults: QuestionResult[];
    strongAreas: string[];
    weakAreas: string[];
    feedback: string;
    source: AiSource;
  }>("grade-test", input);
}

export function explain(input: {
  snippet: string;
  mode: "simple" | "normal" | "detailed" | "example" | "practice-question";
  subject?: string;
  level?: string;
  context?: string;
}) {
  return post<{ explanation: string; source: AiSource }>("explain", input);
}

export function teachBack(input: {
  concept: string;
  explanation: string;
  reference?: string;
  subject?: string;
  level?: string;
}) {
  return post<{ result: TeachBackResult; source: AiSource }>("teach-back", input);
}

export function studyPlan(input: {
  subject: string;
  examDate: string;
  level?: string;
  dailyMinutes: number;
  topics: string[];
  weakTopics: string[];
  strongTopics?: string[];
  recentScores?: { title: string; score: number; weakAreas: string[] }[];
}) {
  return post<{ days: StudyPlanDay[]; rationale: string; source: AiSource }>(
    "study-plan",
    input
  );
}

export function cram(input: {
  subject: string;
  notes: { title: string; text: string }[];
  weakTopics: string[];
  strongTopics?: string[];
  recentScore?: number;
  minutesAvailable?: number;
}) {
  return post<{
    plan: Omit<CramPlan, "subjectId" | "createdAt">;
    source: AiSource;
  }>("cram", input);
}

export function studyGuide(input: {
  text: string;
  title: string;
  subject?: string;
  level?: string;
}) {
  return post<{
    guide: Omit<StudyGuide, "id" | "subjectId" | "createdAt" | "noteId">;
    source: AiSource;
  }>("study-guide", input);
}

export function tutorChat(input: {
  subject: string;
  level?: string;
  history: ChatMessage[];
  message: string;
  mode?: "tutor" | "homework" | "ask";
  context?: string;
}) {
  return post<{ reply: string; source: AiSource }>("tutor-chat", input);
}

export function makeMedia(input: {
  kind: "podcast" | "slides";
  text: string;
  title: string;
  subject?: string;
  level?: string;
}) {
  return post<{ lines?: PodcastLine[]; slides?: Slide[]; source: AiSource }>(
    "media",
    input
  );
}
