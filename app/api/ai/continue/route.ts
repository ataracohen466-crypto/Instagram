import { NextRequest, NextResponse } from "next/server";
import { aiEnabled, generate } from "@/lib/ai";
import { fallbackContinue } from "@/lib/fallback";

export async function POST(req: NextRequest) {
  const { context, synopsis, codex } = await req.json();
  if (typeof context !== "string" || !context.trim()) {
    return NextResponse.json({ error: "context is required" }, { status: 400 });
  }

  if (!aiEnabled()) {
    return NextResponse.json({ text: fallbackContinue(context), offline: true });
  }

  const system = [
    "You are a skilled ghostwriter continuing a novel-in-progress for its author.",
    "Match the existing prose's voice, tense, and point of view exactly.",
    "Write 2-5 sentences that continue naturally from where the excerpt ends — no headers, no commentary, no quotation marks around the output.",
    synopsis ? `Book synopsis: ${synopsis}` : "",
    codex ? `Known story details:\n${codex}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const text = await generate({
    system,
    messages: [{ role: "user", content: `Continue this passage:\n\n${context}` }],
    maxTokens: 300,
  });

  return NextResponse.json({ text: text || fallbackContinue(context), offline: !text });
}
