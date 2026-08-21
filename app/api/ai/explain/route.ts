import { NextResponse } from "next/server";
import { generate } from "@/lib/ai";
import { offlineExplanation } from "@/lib/offline";
import { clampText } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

type Mode = "simple" | "normal" | "detailed" | "example" | "practice-question";

const MODE_BRIEF: Record<Mode, string> = {
  simple:
    "Explain it as simply as possible — like the student is hearing it for the first time. Short sentences, no jargon, one analogy.",
  normal:
    "Explain it clearly at the student's own level. Define anything technical as you go.",
  detailed:
    "Go deep: break it into numbered parts, explain the mechanism behind it, and say why it matters for an exam.",
  example:
    "Lead with one concrete worked example, then generalise from it in two or three sentences.",
  "practice-question":
    "Give ONE practice question that tests this exact idea, then a short model answer underneath a line that says 'Model answer:'.",
};

interface Body {
  snippet?: string;
  mode?: Mode;
  subject?: string;
  level?: string;
  context?: string;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const snippet = (body.snippet ?? "").trim();
  const mode: Mode = body.mode ?? "normal";

  if (!snippet) {
    return NextResponse.json({ error: "Nothing to explain." }, { status: 400 });
  }

  const text = await generate({
    system: `You are a patient tutor helping a student who has said "I don't understand this".

${MODE_BRIEF[mode]}

Rules:
- Never be condescending and never pad. Get to the explanation immediately.
- Use short paragraphs. Markdown bold and bullets are fine; no headings above ###.
- Stay on the passage the student gave you — do not wander into adjacent topics.
- Student level: ${body.level ?? "high school"}. Subject: ${body.subject ?? "general"}.`,
    messages: [
      {
        role: "user",
        content: `${
          body.context ? `Wider context from my notes:\n${clampText(body.context, 6000)}\n\n` : ""
        }The bit I don't understand:\n\n"${clampText(snippet, 6000)}"`,
      },
    ],
    maxTokens: mode === "detailed" ? 3000 : 1500,
  });

  return NextResponse.json({
    explanation: text ?? offlineExplanation(snippet, mode),
    source: text ? "claude" : "offline",
  });
}
