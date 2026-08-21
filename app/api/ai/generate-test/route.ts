import { NextResponse } from "next/server";
import { aiEnabled, generateStructured } from "@/lib/ai";
import { objectSchema, questionsSchema } from "@/lib/schemas";
import { normalizeQuestions } from "@/lib/normalize";
import { offlineQuestions } from "@/lib/offline";
import { Difficulty, Question, QuestionType } from "@/lib/types";
import { clampText } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 120;

interface Body {
  subject?: string;
  unit?: string;
  difficulty?: Difficulty;
  numQuestions?: number;
  questionTypes?: QuestionType[];
  timeLimitMinutes?: number;
  /** Optional source material — note text the test should be grounded in. */
  material?: string;
  weakTopics?: string[];
  title?: string;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const subject = body.subject ?? "General studies";
  const unit = body.unit ?? "All units";
  const difficulty: Difficulty = body.difficulty ?? "medium";
  const numQuestions = Math.min(Math.max(body.numQuestions ?? 10, 1), 40);
  const questionTypes: QuestionType[] = body.questionTypes?.length
    ? body.questionTypes
    : ["mcq", "short"];
  const material = (body.material ?? "").trim();

  const result = await generateStructured<{ questions: Question[]; title?: string }>({
    system: `You write practice exams for students.

Rules:
- Match the requested difficulty honestly: "easy" is recall, "medium" is application, "hard" is analysis and multi-step reasoning, "mixed" spans all three.
- Use only the requested question types, distributed evenly.
- ${
      material
        ? "Ground every question in the source material provided. Do not test anything outside it."
        : "You have no source material, so write questions a standard course in this subject and unit would cover."
    }
- MCQ: 4 choices, one unambiguously correct, distractors that reflect real misconceptions.
- Matching: left column in matchPrompts, right column in choices, pairs in correctAnswer as "left=right" joined by " | ".
- Short/essay: correctAnswer is a model answer detailed enough to grade against.
- Topic labels are 1-4 words, reused consistently across questions on the same idea.`,
    messages: [
      {
        role: "user",
        content: `Write a ${numQuestions}-question practice test.

Subject: ${subject}
Unit / chapter: ${unit}
Difficulty: ${difficulty}
Question types: ${questionTypes.join(", ")}
Time limit: ${body.timeLimitMinutes ?? 20} minutes${
          body.weakTopics?.length
            ? `\nWeight it toward these weak topics: ${body.weakTopics.join(", ")}`
            : ""
        }${material ? `\n\nSource material:\n${clampText(material, 40000)}` : ""}`,
      },
    ],
    tool: {
      name: "record_test",
      description: "Record the generated practice test.",
      input_schema: objectSchema(
        {
          title: { type: "string", description: "A short exam title." },
          questions: questionsSchema(`Exactly ${numQuestions} questions.`),
        },
        ["title", "questions"]
      ),
    },
    maxTokens: 16000,
  });

  const questions = normalizeQuestions(result?.questions, difficulty);

  if (questions.length > 0) {
    return NextResponse.json({
      title: result?.title ?? `${subject} — ${unit}`,
      questions: questions.slice(0, numQuestions),
      source: "claude",
    });
  }

  return NextResponse.json({
    title: body.title ?? `${subject} — ${unit}`,
    questions: offlineQuestions(
      material ||
        `${subject}. Unit: ${unit}. This offline test is built from topic labels only because no notes were supplied and no API key is configured.`,
      questionTypes,
      numQuestions,
      difficulty
    ),
    source: aiEnabled() ? "fallback-error" : "offline",
  });
}
