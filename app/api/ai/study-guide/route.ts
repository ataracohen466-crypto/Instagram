import { NextResponse } from "next/server";
import { aiEnabled, generateStructured } from "@/lib/ai";
import {
  objectItem,
  objectSchema,
  questionsSchema,
  strings,
  vocabularySchema,
} from "@/lib/schemas";
import { normalizeQuestions } from "@/lib/normalize";
import { offlineStudyGuide } from "@/lib/offline";
import { StudyGuide } from "@/lib/types";
import { clampText } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 120;

type GuideBody = Omit<StudyGuide, "id" | "subjectId" | "createdAt" | "noteId">;

interface Body {
  text?: string;
  title?: string;
  subject?: string;
  level?: string;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const text = (body.text ?? "").trim();
  const title = body.title ?? "Study guide";

  if (!text) {
    return NextResponse.json({ error: "No material supplied." }, { status: 400 });
  }

  const result = await generateStructured<GuideBody>({
    system: `You write study guides students actually use the night before an exam.

Rules:
- Everything comes from the material provided. No outside facts.
- keyConcepts: 3-5 sections, each with a heading and 3-6 tight bullet points.
- commonMistakes: real errors a student makes on this material, not generic advice like "revise more".
- practiceQuestions: 5 questions mixing recall and application, with explanations.
- miniQuiz: 5 fast questions (mcq or true-false) for a self-check.
- checklist: statements starting "I can…" that a student can honestly tick or not.
- Student level: ${body.level ?? "high school"}.`,
    messages: [
      {
        role: "user",
        content: `Subject: ${body.subject ?? "general"}
Title: ${title}

Material:
${clampText(text, 40000)}`,
      },
    ],
    tool: {
      name: "record_study_guide",
      description: "Record the structured study guide.",
      input_schema: objectSchema(
        {
          title: { type: "string" },
          keyConcepts: {
            type: "array",
            items: objectItem(
              {
                heading: { type: "string" },
                points: { type: "array", items: { type: "string" } },
              },
              ["heading", "points"]
            ),
          },
          vocabulary: vocabularySchema,
          facts: strings("Discrete facts worth memorising verbatim."),
          commonMistakes: strings("Mistakes students actually make here."),
          practiceQuestions: questionsSchema("5 practice questions."),
          miniQuiz: questionsSchema("5 quick self-check questions."),
          checklist: strings("'I can…' statements."),
        },
        [
          "title",
          "keyConcepts",
          "vocabulary",
          "facts",
          "commonMistakes",
          "practiceQuestions",
          "miniQuiz",
          "checklist",
        ]
      ),
    },
    maxTokens: 16000,
  });

  if (result && Array.isArray(result.keyConcepts) && result.keyConcepts.length) {
    return NextResponse.json({
      guide: {
        ...result,
        practiceQuestions: normalizeQuestions(result.practiceQuestions),
        miniQuiz: normalizeQuestions(result.miniQuiz),
      },
      source: "claude",
    });
  }

  return NextResponse.json({
    guide: offlineStudyGuide(text, title),
    source: aiEnabled() ? "fallback-error" : "offline",
  });
}
