import { NextResponse } from "next/server";
import { generate, aiEnabled } from "@/lib/ai";
import { PERSONAS } from "@/lib/personas";
import { fallbackCaption } from "@/lib/fallback";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const hint: string = typeof body.hint === "string" ? body.hint.slice(0, 300) : "";

  const persona = PERSONAS[Math.floor(Math.random() * PERSONAS.length)];

  let text: string | null = null;
  if (aiEnabled()) {
    text = await generate({
      system:
        "You write Instagram captions. Reply with ONLY the caption text — no quotes, no explanation, no hashtag spam. Keep it under 15 words, casual and human, at most one emoji.",
      messages: [
        {
          role: "user",
          content: hint
            ? `Write a caption for a photo described as: "${hint}"`
            : "Write a caption for a photo I just took. Make it feel spontaneous.",
        },
      ],
      maxTokens: 120,
    });
  }

  return NextResponse.json({
    caption: text || fallbackCaption(persona),
    ai: aiEnabled(),
  });
}
