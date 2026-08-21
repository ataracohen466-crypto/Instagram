import { NextResponse } from "next/server";
import { aiEnabled, generateStructured } from "@/lib/ai";
import { objectItem, objectSchema, questionsSchema } from "@/lib/schemas";
import { normalizeQuestions } from "@/lib/normalize";
import { offlineFlashcards, offlineQuestions } from "@/lib/offline";
import { Question, QuestionType } from "@/lib/types";
import { clampText } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  text?: string;
  title?: string;
  /** Which material to produce. */
  materials?: ("flashcards" | QuestionType)[];
  flashcardCount?: number;
  questionCount?: number;
}

interface Result {
  flashcards: { front: string; back: string; topic: string }[];
  questions: Question[];
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const text = (body.text ?? "").trim();
  const materials = body.materials?.length
    ? body.materials
    : (["flashcards", "mcq", "short"] as const);
  const wantsFlashcards = materials.includes("flashcards");
  const questionTypes = materials.filter(
    (m): m is QuestionType => m !== "flashcards"
  );
  const flashcardCount = Math.min(Math.max(body.flashcardCount ?? 12, 3), 30);
  const questionCount = Math.min(Math.max(body.questionCount ?? 8, 3), 30);

  if (!text) {
    return NextResponse.json({ error: "No note content." }, { status: 400 });
  }

  const properties: Record<string, Record<string, unknown>> = {};
  const required: string[] = [];

  if (wantsFlashcards) {
    properties.flashcards = {
      type: "array",
      description: `${flashcardCount} flashcards drawn strictly from this material.`,
      items: objectItem(
        {
          front: { type: "string", description: "The prompt side — a question or term." },
          back: { type: "string", description: "The answer side, 1-3 sentences." },
          topic: { type: "string", description: "Short topic label, 1-4 words." },
        },
        ["front", "back", "topic"]
      ),
    };
    required.push("flashcards");
  }

  if (questionTypes.length > 0) {
    properties.questions = questionsSchema(
      `${questionCount} questions of these types only: ${questionTypes.join(", ")}.`
    );
    required.push("questions");
  }

  const result =
    required.length > 0
      ? await generateStructured<Result>({
          system: `You build study material from a student's own notes.

Rules:
- Every card and question must be answerable from the material provided. No outside facts.
- Flashcard fronts are questions or prompts, never bare topic names.
- MCQ distractors must be plausible and drawn from the same material.
- For matching questions put the left column in matchPrompts, the right column in choices, and pair them in correctAnswer as "left=right" joined by " | ".
- Spread questions across the material rather than clustering on the first paragraph.
- Topic labels are 1-4 words and must be reused consistently so mastery tracking works.`,
          messages: [
            {
              role: "user",
              content: `Material${body.title ? ` — "${body.title}"` : ""}:\n\n${clampText(
                text,
                40000
              )}\n\nProduce ${
                wantsFlashcards ? `${flashcardCount} flashcards` : ""
              }${wantsFlashcards && questionTypes.length ? " and " : ""}${
                questionTypes.length
                  ? `${questionCount} questions (types: ${questionTypes.join(", ")})`
                  : ""
              }.`,
            },
          ],
          tool: {
            name: "record_material",
            description: "Record the generated study material.",
            input_schema: objectSchema(properties, required),
          },
          maxTokens: 12000,
        })
      : null;

  const flashcards =
    wantsFlashcards && Array.isArray(result?.flashcards) && result.flashcards.length
      ? result.flashcards
      : wantsFlashcards
      ? offlineFlashcards(text, flashcardCount)
      : [];

  const questions =
    questionTypes.length > 0
      ? (() => {
          const parsed = normalizeQuestions(result?.questions);
          return parsed.length > 0
            ? parsed
            : offlineQuestions(text, questionTypes, questionCount);
        })()
      : [];

  return NextResponse.json({
    flashcards,
    questions,
    source: result ? "claude" : aiEnabled() ? "fallback-error" : "offline",
  });
}
