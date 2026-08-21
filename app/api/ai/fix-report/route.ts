import { NextRequest, NextResponse } from "next/server";
import { generateText, hasAIKey } from "@/lib/ai";
import { fallbackReportSummary } from "@/lib/fallback";
import type { FixMyPlayingIssue } from "@/lib/types";

const SYSTEM = `You are a warm, encouraging, professional guitar teacher named Guitar AI. \
A student just finished playing a song and you've been given their real, measured performance \
data (chord accuracy percentages, timing issues, tempo drift). Write a short (3-5 sentence) \
spoken-style summary of the session. Rules: NEVER shame the student. Always name the single \
most important thing to fix first, in specific and actionable terms. Keep the tone like a \
supportive human teacher, not a robot. Do not use bullet points — write it as natural sentences.`;

export async function POST(req: NextRequest) {
  const { songTitle, overallAccuracy, issues } = (await req.json()) as {
    songTitle: string;
    overallAccuracy: number;
    issues: FixMyPlayingIssue[];
  };

  if (!hasAIKey()) {
    return NextResponse.json({ summary: fallbackReportSummary(issues ?? [], overallAccuracy), source: "fallback" });
  }

  try {
    const prompt = `Song: "${songTitle}". Overall accuracy: ${overallAccuracy}%. Measured issues: \
${JSON.stringify(issues)}. Write the session summary now.`;
    const summary = await generateText(SYSTEM, prompt);
    return NextResponse.json({ summary, source: "ai" });
  } catch {
    return NextResponse.json({ summary: fallbackReportSummary(issues ?? [], overallAccuracy), source: "fallback" });
  }
}
