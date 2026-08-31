import { NextResponse } from "next/server";
import { aiEnabled, generateStructured } from "@/lib/ai";
import { objectSchema, studyPlanDaySchema } from "@/lib/schemas";
import { normalizePlanDays } from "@/lib/normalize";
import { offlineStudyPlan } from "@/lib/offline";
import { StudyPlanDay } from "@/lib/types";
import { daysUntil, isoDay } from "@/lib/utils";

export const runtime = "nodejs";
// 60s is the ceiling on Vercel's Hobby plan; anything higher fails the
// deploy outright. On Pro this can go up to 300 for very long generations.
export const maxDuration = 60;

interface Body {
  subject?: string;
  examDate?: string;
  level?: string;
  dailyMinutes?: number;
  topics?: string[];
  weakTopics?: string[];
  strongTopics?: string[];
  recentScores?: { title: string; score: number; weakAreas: string[] }[];
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const today = isoDay();
  const examDate = body.examDate ?? isoDay(new Date(Date.now() + 14 * 86400000));
  const dailyMinutes = Math.min(Math.max(body.dailyMinutes ?? 30, 10), 240);
  const topics = body.topics ?? [];
  const weakTopics = body.weakTopics ?? [];
  const remaining = Math.max(1, Math.min(daysUntil(examDate), 30));

  const result = await generateStructured<{ days: StudyPlanDay[]; rationale?: string }>({
    system: `You build realistic day-by-day study plans.

Rules:
- Today is ${today}. The exam is on ${examDate} — that is ${remaining} day(s) away. Produce exactly ${remaining} day entries starting at ${today}, dates in ISO yyyy-mm-dd, in order, no gaps.
- Each day's tasks must total roughly ${dailyMinutes} minutes. Never exceed it by more than 15%.
- Front-load the weak topics; interleave older topics for spaced repetition rather than blocking one topic per day.
- Include at least one full practice test in the final third of the plan, and leave the last day lighter — review and consolidation only, not new material.
- Task labels are imperative and concrete ("Rework the Krebs cycle diagram from memory"), never vague ("study biology").
- kind must be one of: review, flashcards, practice, read, test.`,
    messages: [
      {
        role: "user",
        content: `Build my study plan.

Subject: ${body.subject ?? "General studies"}
My level: ${body.level ?? "high school"}
Minutes I can study per day: ${dailyMinutes}
Topics in scope: ${topics.length ? topics.join(", ") : "not specified — infer from the subject"}
Topics I'm weak on: ${weakTopics.length ? weakTopics.join(", ") : "none recorded yet"}
Topics I'm solid on: ${body.strongTopics?.join(", ") || "none recorded yet"}
${
  body.recentScores?.length
    ? `Recent test results:\n${body.recentScores
        .map(
          (r) =>
            `- ${r.title}: ${r.score}%${
              r.weakAreas.length ? ` (missed: ${r.weakAreas.join(", ")})` : ""
            }`
        )
        .join("\n")}`
    : "No test results yet."
}`,
      },
    ],
    tool: {
      name: "record_plan",
      description: "Record the day-by-day study plan.",
      input_schema: objectSchema(
        {
          days: {
            type: "array",
            description: `Exactly ${remaining} consecutive days starting ${today}.`,
            items: studyPlanDaySchema,
          },
          rationale: {
            type: "string",
            description: "One or two sentences on how the plan is sequenced.",
          },
        },
        ["days"]
      ),
    },
    maxTokens: 16000,
  });

  const days = normalizePlanDays(result?.days);
  if (days.length > 0) {
    return NextResponse.json({
      days,
      rationale: result?.rationale ?? "",
      source: "claude",
    });
  }

  return NextResponse.json({
    days: offlineStudyPlan(examDate, topics, dailyMinutes, weakTopics),
    rationale:
      "Built offline: weak topics first, a review day every third day, and a full practice test the day before the exam.",
    source: aiEnabled() ? "fallback-error" : "offline",
  });
}
