import type Anthropic from "@anthropic-ai/sdk";

/**
 * JSON-schema fragments handed to Claude as forced tool inputs. Keeping them in
 * one place means the shapes the model returns and the shapes in `lib/types.ts`
 * stay in step.
 */

type Schema = Record<string, unknown>;

export function objectSchema(
  properties: Record<string, Schema>,
  required: string[]
): Anthropic.Tool.InputSchema {
  return {
    type: "object",
    properties,
    required,
  } as unknown as Anthropic.Tool.InputSchema;
}

export const strings = (description: string): Schema => ({
  type: "array",
  items: { type: "string" },
  description,
});

export const vocabularySchema: Schema = {
  type: "array",
  description: "Key terms with student-friendly definitions.",
  items: objectItem(
    {
      term: { type: "string" },
      definition: { type: "string" },
    },
    ["term", "definition"]
  ),
};

export const formulaSchema: Schema = {
  type: "array",
  description: "Formulas, equations or rules worth memorising.",
  items: objectItem(
    {
      name: { type: "string" },
      expression: { type: "string" },
      whenToUse: { type: "string" },
    },
    ["name", "expression", "whenToUse"]
  ),
};

export const peopleEventsSchema: Schema = {
  type: "array",
  description: "People, events or named cases and why they matter.",
  items: objectItem(
    { name: { type: "string" }, significance: { type: "string" } },
    ["name", "significance"]
  ),
};

export const causeEffectSchema: Schema = {
  type: "array",
  description: "Cause and effect relationships found in the material.",
  items: objectItem(
    { cause: { type: "string" }, effect: { type: "string" } },
    ["cause", "effect"]
  ),
};

export const datesSchema: Schema = {
  type: "array",
  description: "Important dates or ordered milestones.",
  items: objectItem({ date: { type: "string" }, what: { type: "string" } }, [
    "date",
    "what",
  ]),
};

export function objectItem(
  properties: Record<string, Schema>,
  required: string[]
): Schema {
  return { type: "object", properties, required };
}

export const QUESTION_TYPES = [
  "mcq",
  "short",
  "matching",
  "fill-blank",
  "true-false",
  "essay",
] as const;

export const questionItemSchema: Schema = objectItem(
  {
    type: { type: "string", enum: [...QUESTION_TYPES] },
    prompt: { type: "string", description: "The question as the student reads it." },
    choices: {
      type: "array",
      items: { type: "string" },
      description:
        "MCQ options (3-5), or ['True','False'] for true-false, or the right-hand column for matching. Omit for short/essay/fill-blank.",
    },
    matchPrompts: {
      type: "array",
      items: { type: "string" },
      description: "Matching questions only: the left-hand column, same order as the correct pairs.",
    },
    correctAnswer: {
      type: "string",
      description:
        "For mcq/true-false the exact matching choice text. For matching, 'left=right' pairs joined with ' | '. For short/essay a model answer.",
    },
    explanation: { type: "string", description: "Why that answer is right." },
    topic: { type: "string", description: "Short topic label, 1-4 words." },
    difficulty: { type: "string", enum: ["easy", "medium", "hard", "mixed"] },
  },
  ["type", "prompt", "correctAnswer", "explanation", "topic", "difficulty"]
);

export const questionsSchema = (description: string): Schema => ({
  type: "array",
  description,
  items: questionItemSchema,
});

export const summaryProperties: Record<string, Schema> = {
  overview: {
    type: "string",
    description: "Prose summary at the requested length.",
  },
  keyConcepts: strings("The main ideas, one sentence each."),
  importantDates: datesSchema,
  vocabulary: vocabularySchema,
  formulas: formulaSchema,
  peopleEvents: peopleEventsSchema,
  causeEffect: causeEffectSchema,
  mustKnow: strings("The absolute must-know items for an exam."),
  topics: strings("Short topic labels covered by this material, 1-4 words each."),
};

export const summaryRequired = [
  "overview",
  "keyConcepts",
  "vocabulary",
  "mustKnow",
  "topics",
];

export const studyTaskSchema: Schema = objectItem(
  {
    label: { type: "string" },
    detail: { type: "string" },
    minutes: { type: "number" },
    topic: { type: "string" },
    kind: {
      type: "string",
      enum: ["review", "flashcards", "practice", "read", "test"],
    },
  },
  ["label", "detail", "minutes", "topic", "kind"]
);

export const studyPlanDaySchema: Schema = objectItem(
  {
    date: { type: "string", description: "ISO yyyy-mm-dd." },
    focus: { type: "string" },
    estimatedMinutes: { type: "number" },
    tasks: { type: "array", items: studyTaskSchema },
  },
  ["date", "focus", "estimatedMinutes", "tasks"]
);
