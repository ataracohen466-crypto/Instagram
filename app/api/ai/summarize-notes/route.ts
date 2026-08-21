import { NextResponse } from "next/server";
import { aiEnabled, generateStructured, visionMessage } from "@/lib/ai";
import { objectSchema, summaryProperties, summaryRequired } from "@/lib/schemas";
import { normalizeSummary } from "@/lib/normalize";
import { offlineSummary } from "@/lib/offline";
import { NoteSummary, SummaryLength } from "@/lib/types";
import { clampText } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

const LENGTH_BRIEF: Record<SummaryLength, string> = {
  quick: "A 60-second skim. Overview of 2-3 sentences, only the biggest ideas.",
  normal: "A standard revision summary. Overview of one solid paragraph.",
  detailed:
    "A thorough breakdown. Overview of 3-4 paragraphs, nothing important left out.",
  cram: "Exam-cram density: terse, high-signal bullets only, written for someone revising the night before. Overview of 3-4 punchy sentences.",
};

interface Body {
  text?: string;
  length?: SummaryLength;
  image?: { mediaType: string; data: string } | null;
  title?: string;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const length: SummaryLength = body.length ?? "normal";
  const text = (body.text ?? "").trim();
  const image = body.image ?? null;

  if (!text && !image) {
    return NextResponse.json(
      { error: "Nothing to summarize." },
      { status: 400 }
    );
  }

  const summary = await generateStructured<NoteSummary>({
    system: `You are an expert study coach who turns messy class notes into exam-ready summaries.

Rules:
- Ground everything in the material you are given. Never invent facts, dates or formulas that are not supported by it.
- Leave an array empty when the material genuinely has nothing of that kind (a history note has no formulas; a maths note has no people/events).
- Write for a student, not an academic: short, plain sentences.
- Topic labels must be 1-4 words and reusable as mastery-tracking keys.

Length brief: ${LENGTH_BRIEF[length]}`,
    messages: [
      visionMessage(
        image
          ? `These are photographed notes${
              body.title ? ` titled "${body.title}"` : ""
            }. Read the image carefully, transcribe what matters, then summarize it.${
              text ? `\n\nThe student also typed:\n${clampText(text, 12000)}` : ""
            }`
          : `Summarize these notes${
              body.title ? ` titled "${body.title}"` : ""
            }:\n\n${clampText(text, 40000)}`,
        image
      ),
    ],
    tool: {
      name: "record_summary",
      description: "Record the structured summary of the student's notes.",
      input_schema: objectSchema(summaryProperties, summaryRequired),
    },
    maxTokens: length === "detailed" ? 8000 : 4000,
  });

  const normalized = normalizeSummary(summary);
  if (normalized) {
    return NextResponse.json({ summary: normalized, source: "claude" });
  }

  return NextResponse.json({
    summary: offlineSummary(text || "Notes captured from an image.", length),
    source: aiEnabled() ? "fallback-error" : "offline",
  });
}
