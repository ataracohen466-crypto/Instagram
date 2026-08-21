import {
  Difficulty,
  NoteSummary,
  Question,
  QuestionType,
  StudyPlanDay,
  StudyTask,
} from "./types";
import { uid } from "./utils";

const TYPES: QuestionType[] = [
  "mcq",
  "short",
  "matching",
  "fill-blank",
  "true-false",
  "essay",
];

interface RawQuestion {
  type?: string;
  prompt?: string;
  choices?: unknown;
  matchPrompts?: unknown;
  correctAnswer?: string;
  explanation?: string;
  topic?: string;
  difficulty?: string;
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value.filter((v): v is string => typeof v === "string");
  return out.length > 0 ? out : undefined;
}

/** Gives every generated question a stable id and fills anything the model left out. */
export function normalizeQuestions(
  raw: unknown,
  fallbackDifficulty: Difficulty = "medium"
): Question[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: RawQuestion): Question | null => {
      if (!item || typeof item.prompt !== "string" || !item.prompt.trim()) {
        return null;
      }
      const type = TYPES.includes(item.type as QuestionType)
        ? (item.type as QuestionType)
        : "short";
      let choices = stringArray(item.choices);
      if (type === "true-false" && !choices) choices = ["True", "False"];
      return {
        id: uid("q"),
        type,
        prompt: item.prompt.trim(),
        choices,
        matchPrompts: stringArray(item.matchPrompts),
        correctAnswer:
          typeof item.correctAnswer === "string" ? item.correctAnswer : "",
        explanation:
          typeof item.explanation === "string"
            ? item.explanation
            : "No explanation was provided for this question.",
        topic: typeof item.topic === "string" && item.topic ? item.topic : "General",
        difficulty: (["easy", "medium", "hard", "mixed"] as const).includes(
          item.difficulty as Difficulty
        )
          ? (item.difficulty as Difficulty)
          : fallbackDifficulty,
      };
    })
    .filter((q): q is Question => q !== null);
}

export function normalizeSummary(raw: Partial<NoteSummary> | null): NoteSummary | null {
  if (!raw || typeof raw.overview !== "string") return null;
  return {
    overview: raw.overview,
    keyConcepts: Array.isArray(raw.keyConcepts) ? raw.keyConcepts : [],
    importantDates: Array.isArray(raw.importantDates) ? raw.importantDates : [],
    vocabulary: Array.isArray(raw.vocabulary) ? raw.vocabulary : [],
    formulas: Array.isArray(raw.formulas) ? raw.formulas : [],
    peopleEvents: Array.isArray(raw.peopleEvents) ? raw.peopleEvents : [],
    causeEffect: Array.isArray(raw.causeEffect) ? raw.causeEffect : [],
    mustKnow: Array.isArray(raw.mustKnow) ? raw.mustKnow : [],
    topics: Array.isArray(raw.topics) ? raw.topics : [],
  };
}

interface RawDay {
  date?: string;
  focus?: string;
  estimatedMinutes?: number;
  tasks?: {
    label?: string;
    detail?: string;
    minutes?: number;
    topic?: string;
    kind?: string;
  }[];
}

export function normalizePlanDays(raw: unknown): StudyPlanDay[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((day: RawDay): StudyPlanDay | null => {
      if (!day || typeof day.date !== "string") return null;
      const tasks: StudyTask[] = (day.tasks ?? [])
        .filter((t) => t && typeof t.label === "string")
        .map((t) => ({
          id: uid("task"),
          label: t.label as string,
          detail: typeof t.detail === "string" ? t.detail : "",
          minutes:
            typeof t.minutes === "number" && t.minutes > 0
              ? Math.round(t.minutes)
              : 15,
          topic: typeof t.topic === "string" ? t.topic : day.focus ?? "General",
          kind: (["review", "flashcards", "practice", "read", "test"] as const).includes(
            t.kind as StudyTask["kind"]
          )
            ? (t.kind as StudyTask["kind"])
            : "review",
          done: false,
        }));
      if (tasks.length === 0) return null;
      return {
        date: day.date,
        focus: typeof day.focus === "string" ? day.focus : "Review",
        estimatedMinutes:
          typeof day.estimatedMinutes === "number" && day.estimatedMinutes > 0
            ? Math.round(day.estimatedMinutes)
            : tasks.reduce((sum, t) => sum + t.minutes, 0),
        tasks,
        completed: false,
      };
    })
    .filter((d): d is StudyPlanDay => d !== null);
}
