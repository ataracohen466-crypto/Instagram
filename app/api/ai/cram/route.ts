import { NextResponse } from "next/server";
import { aiEnabled, generateStructured } from "@/lib/ai";
import {
  causeEffectSchema,
  formulaSchema,
  objectItem,
  objectSchema,
  questionsSchema,
  strings,
  vocabularySchema,
} from "@/lib/schemas";
import { normalizeQuestions } from "@/lib/normalize";
import { offlineCram } from "@/lib/offline";
import { CramPlan } from "@/lib/types";
import { clampText } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 120;

interface Body {
  subject?: string;
  notes?: { title: string; text: string }[];
  weakTopics?: string[];
  strongTopics?: string[];
  recentScore?: number;
  minutesAvailable?: number;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const notes = body.notes ?? [];
  const combined = notes
    .map((n) => `## ${n.title}\n${n.text}`)
    .join("\n\n")
    .trim();
  const minutes = Math.min(Math.max(body.minutesAvailable ?? 120, 30), 480);

  const result = await generateStructured<Omit<CramPlan, "subjectId" | "createdAt">>({
    system: `The student's exam is TOMORROW. Build a triage plan, not a syllabus.

Rules:
- Ruthless prioritisation. If something is unlikely to be worth marks tomorrow, leave it out entirely.
- mostImportant: the highest-yield concepts, ordered by exam value.
- weakest: what this specific student is weak on, taken from the mastery data given to you — not generic advice.
- confusionPoints: pairs of things students routinely mix up here, phrased as cause (what gets confused) and effect (how to keep them apart).
- practiceQuestions: 6-10 questions hitting the highest-yield material, favouring quick-to-mark types.
- schedule: time-boxed blocks totalling about ${minutes} minutes, ending with sleep advice rather than more content.
- Ground everything in the student's own notes when notes are provided.`,
    messages: [
      {
        role: "user",
        content: `Subject: ${body.subject ?? "General studies"}
I have about ${minutes} minutes tonight.
Weak topics from my tracking: ${body.weakTopics?.join(", ") || "none recorded"}
Solid topics: ${body.strongTopics?.join(", ") || "none recorded"}
${body.recentScore != null ? `Most recent practice test: ${body.recentScore}%` : ""}

${combined ? `My notes:\n${clampText(combined, 60000)}` : "I have no notes uploaded — work from the subject alone."}`,
      },
    ],
    tool: {
      name: "record_cram_plan",
      description: "Record the night-before cram plan.",
      input_schema: objectSchema(
        {
          mostImportant: strings("Highest-yield concepts, most important first."),
          weakest: strings("This student's weakest areas."),
          confusionPoints: causeEffectSchema,
          essentialVocab: vocabularySchema,
          essentialFormulas: formulaSchema,
          practiceQuestions: questionsSchema("6-10 high-yield practice questions."),
          schedule: {
            type: "array",
            description: "Time-boxed study blocks for tonight.",
            items: objectItem(
              {
                block: { type: "string" },
                minutes: { type: "number" },
                detail: { type: "string" },
              },
              ["block", "minutes", "detail"]
            ),
          },
        },
        [
          "mostImportant",
          "weakest",
          "confusionPoints",
          "essentialVocab",
          "practiceQuestions",
          "schedule",
        ]
      ),
    },
    maxTokens: 16000,
  });

  if (result && Array.isArray(result.mostImportant) && result.mostImportant.length) {
    return NextResponse.json({
      plan: {
        ...result,
        essentialFormulas: result.essentialFormulas ?? [],
        practiceQuestions: normalizeQuestions(result.practiceQuestions),
      },
      source: "claude",
    });
  }

  return NextResponse.json({
    plan: offlineCram(
      combined || `${body.subject ?? "this subject"} revision`,
      body.weakTopics ?? []
    ),
    source: aiEnabled() ? "fallback-error" : "offline",
  });
}
