import { NextRequest, NextResponse } from "next/server";
import { aiEnabled, generate } from "@/lib/ai";
import { fallbackBrainstorm } from "@/lib/fallback";

export async function POST(req: NextRequest) {
  const { question, synopsis, codex, chapterTitle } = await req.json();
  if (typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  if (!aiEnabled()) {
    return NextResponse.json({ text: fallbackBrainstorm(question), offline: true });
  }

  const system = [
    "You are a sharp, honest developmental editor brainstorming with a novelist.",
    "Give concrete, specific suggestions tied to their actual story, not generic writing advice.",
    "Keep it to a short paragraph or a few bullet points — no long essays.",
    synopsis ? `Book synopsis: ${synopsis}` : "",
    chapterTitle ? `Currently working on: ${chapterTitle}` : "",
    codex ? `Known story details:\n${codex}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const text = await generate({
    system,
    messages: [{ role: "user", content: question }],
    maxTokens: 400,
  });

  return NextResponse.json({ text: text || fallbackBrainstorm(question), offline: !text });
}
