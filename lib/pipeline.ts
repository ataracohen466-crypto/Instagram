"use client";

import * as api from "./api";
import { useStore } from "./store";
import { uid } from "./utils";
import { Question, StudyGuide, StudyPlan, SummaryLength } from "./types";

type Report = (step: string) => void;

/**
 * The `[STUDY THIS]` pipeline — the thing that makes TutorAI a product rather
 * than a set of separate AI buttons. One note goes in; a summary, a deck, a
 * quiz, a study guide and (when there's an exam date) a refreshed study plan
 * come out, all written back into the same store every other screen reads.
 */
export async function runStudyThis(noteId: string, report: Report = () => {}) {
  const store = useStore.getState();
  const note = store.notes.find((n) => n.id === noteId);
  if (!note) return;

  const subject = store.subjects.find((s) => s.id === note.subjectId);
  const subjectName = subject?.name ?? "this subject";

  report("Summarising…");
  await ensureSummary(noteId, "normal");

  report("Writing flashcards and a quiz…");
  const material = await api.generateMaterial({
    text: note.rawText,
    title: note.title,
    materials: ["flashcards", "mcq", "short", "true-false"],
    flashcardCount: 12,
    questionCount: 8,
  });

  if (material) {
    const fresh = useStore.getState();
    const already = new Set(
      fresh.flashcards.filter((c) => c.noteId === noteId).map((c) => c.front)
    );
    const incoming = material.flashcards.filter((c) => !already.has(c.front));
    if (incoming.length > 0) {
      fresh.addFlashcards(incoming, note.subjectId, noteId);
    }

    if (material.questions.length > 0) {
      useStore.getState().addTest({
        subjectId: note.subjectId,
        title: `Quiz — ${note.title}`,
        noteId,
        kind: "practice",
        config: {
          unit: note.title,
          difficulty: "mixed",
          numQuestions: material.questions.length,
          questionTypes: ["mcq", "short", "true-false"],
          timeLimitMinutes: Math.max(5, material.questions.length * 1.5),
        },
        questions: material.questions,
      });
    }
  }

  report("Building your study guide…");
  await ensureStudyGuide(noteId);

  report("Updating your plan…");
  await refreshPlan(note.subjectId);

  report("Done");
}

/** Generates one summary length if it isn't cached on the note already. */
export async function ensureSummary(noteId: string, length: SummaryLength) {
  const note = useStore.getState().notes.find((n) => n.id === noteId);
  if (!note) return null;
  const cached = note.summary?.[length];
  if (cached) return cached;

  const result = await api.summarizeNotes({
    text: note.rawText,
    length,
    title: note.title,
  });
  if (!result) return null;

  useStore.getState().setNoteSummary(noteId, length, result.summary);
  return result.summary;
}

export async function ensureStudyGuide(noteId: string): Promise<StudyGuide | null> {
  const state = useStore.getState();
  const note = state.notes.find((n) => n.id === noteId);
  if (!note) return null;

  const existing = state.guides.find((g) => g.noteId === noteId);
  if (existing) return existing;

  const subject = state.subjects.find((s) => s.id === note.subjectId);
  const result = await api.studyGuide({
    text: note.rawText,
    title: note.title,
    subject: subject?.name,
    level: state.profile.gradeLevel,
  });
  if (!result) return null;

  const guide: StudyGuide = {
    ...result.guide,
    id: uid("guide"),
    subjectId: note.subjectId,
    noteId,
    createdAt: Date.now(),
  };
  useStore.getState().addGuide(guide);
  useStore.getState().updateNote(noteId, { studyGuideId: guide.id });
  return guide;
}

/**
 * Rebuilds the plan for a subject from whatever the store currently knows —
 * mastery, recent attempts, exam date. Called after Study This and after every
 * submitted test, which is what keeps the plan honest.
 */
export async function refreshPlan(subjectId: string): Promise<StudyPlan | null> {
  const state = useStore.getState();
  const subject = state.subjects.find((s) => s.id === subjectId);
  if (!subject?.examDate) return null;

  const mastery = state.mastery.filter((m) => m.subjectId === subjectId);
  const weak = mastery.filter((m) => m.status === "needs-review").map((m) => m.topic);
  const strong = mastery.filter((m) => m.status === "mastered").map((m) => m.topic);

  const noteTopics = state.notes
    .filter((n) => n.subjectId === subjectId)
    .flatMap((n) => n.summary?.normal?.topics ?? []);
  const topics = [...new Set([...noteTopics, ...mastery.map((m) => m.topic)])];

  const recentScores = state.attempts
    .filter((a) => a.subjectId === subjectId && a.submittedAt)
    .slice(0, 3)
    .map((a) => ({
      title: state.tests.find((t) => t.id === a.testId)?.title ?? "Test",
      score: a.score,
      weakAreas: a.weakAreas,
    }));

  const result = await api.studyPlan({
    subject: subject.name,
    examDate: subject.examDate,
    level: state.profile.gradeLevel,
    dailyMinutes: state.profile.dailyMinutes,
    topics: topics.length > 0 ? topics : [subject.name],
    weakTopics: weak,
    strongTopics: strong,
    recentScores,
  });
  if (!result) return null;

  const plan: StudyPlan = {
    id: uid("plan"),
    subjectId,
    examDate: subject.examDate,
    days: result.days,
    createdAt: Date.now(),
  };
  useStore.getState().setPlan(plan);
  return plan;
}

/**
 * Builds a focused practice set from the topics a student just got wrong.
 * This is what the "Start targeted practice" button on a score report runs.
 */
export async function targetedPractice(
  subjectId: string,
  weakTopics: string[]
): Promise<string | null> {
  const state = useStore.getState();
  const subject = state.subjects.find((s) => s.id === subjectId);
  if (!subject || weakTopics.length === 0) return null;

  const material = state.notes
    .filter((n) => n.subjectId === subjectId)
    .map((n) => n.rawText)
    .join("\n\n")
    .slice(0, 20000);

  const result = await api.generateTest({
    subject: subject.name,
    unit: weakTopics.join(", "),
    difficulty: "easy",
    numQuestions: Math.min(10, Math.max(5, weakTopics.length * 3)),
    questionTypes: ["mcq", "short"],
    timeLimitMinutes: 12,
    material: material || undefined,
    weakTopics,
    title: `Targeted practice — ${weakTopics.slice(0, 2).join(", ")}`,
  });
  if (!result) return null;

  const test = useStore.getState().addTest({
    subjectId,
    title: result.title || "Targeted practice",
    kind: "practice",
    config: {
      unit: weakTopics.join(", "),
      difficulty: "easy",
      numQuestions: result.questions.length,
      questionTypes: ["mcq", "short"],
      timeLimitMinutes: 12,
    },
    questions: result.questions,
  });
  return test.id;
}

/** Shared by the test runner and the quiz runner in Practice. */
export function blankAnswers(questions: Question[]): Record<string, string> {
  return Object.fromEntries(questions.map((q) => [q.id, ""]));
}
