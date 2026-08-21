import { NextResponse } from "next/server";
import { aiEnabled, generateStructured } from "@/lib/ai";
import { objectSchema } from "@/lib/schemas";
import { offlineTeachBack } from "@/lib/offline";
import { TeachBackResult } from "@/lib/types";
import { clampText } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  concept?: string;
  explanation?: string;
  reference?: string;
  subject?: string;
  level?: string;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const concept = (body.concept ?? "").trim();
  const explanation = (body.explanation ?? "").trim();

  if (!concept || !explanation) {
    return NextResponse.json(
      { error: "Need both a concept and the student's explanation." },
      { status: 400 }
    );
  }

  const result = await generateStructured<TeachBackResult>({
    system: `You assess a student who has just tried to teach a concept back in their own words — the Feynman technique.

Rules:
- Judge understanding, not vocabulary. Correct ideas in casual language score highly.
- accuracy and masteryScore are 0-100. Be honest: a vague or hand-wavy explanation should not score above 50 no matter how confident it sounds.
- missingConcepts: things a complete explanation would have covered and theirs did not. Keep each to a few words.
- misconceptions: things they said that are actually wrong. Empty array if there are none — do not invent one.
- feedback: 2-4 sentences, encouraging but specific, addressed as "you".
- Student level: ${body.level ?? "high school"}.`,
    messages: [
      {
        role: "user",
        content: `Concept the student is explaining: ${clampText(concept, 2000)}
${body.reference ? `\nReference material:\n${clampText(body.reference, 12000)}\n` : ""}
Their explanation:
"""
${clampText(explanation, 8000)}
"""`,
      },
    ],
    tool: {
      name: "record_assessment",
      description: "Record the teach-back assessment.",
      input_schema: objectSchema(
        {
          accuracy: { type: "number", description: "0-100." },
          masteryScore: { type: "number", description: "0-100." },
          correctPoints: { type: "array", items: { type: "string" } },
          missingConcepts: { type: "array", items: { type: "string" } },
          misconceptions: { type: "array", items: { type: "string" } },
          feedback: { type: "string" },
          topic: { type: "string", description: "Short topic label, 1-4 words." },
        },
        [
          "accuracy",
          "masteryScore",
          "correctPoints",
          "missingConcepts",
          "misconceptions",
          "feedback",
          "topic",
        ]
      ),
    },
    maxTokens: 3000,
  });

  if (result && typeof result.masteryScore === "number") {
    return NextResponse.json({
      result: {
        ...result,
        accuracy: Math.max(0, Math.min(100, Math.round(result.accuracy))),
        masteryScore: Math.max(0, Math.min(100, Math.round(result.masteryScore))),
        correctPoints: result.correctPoints ?? [],
        missingConcepts: result.missingConcepts ?? [],
        misconceptions: result.misconceptions ?? [],
        topic: result.topic || concept.slice(0, 40),
      },
      source: "claude",
    });
  }

  return NextResponse.json({
    result: offlineTeachBack(`${concept} ${body.reference ?? ""}`, explanation),
    source: aiEnabled() ? "fallback-error" : "offline",
  });
}
