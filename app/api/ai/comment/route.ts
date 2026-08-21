import { NextResponse } from "next/server";
import { generate, aiEnabled } from "@/lib/ai";
import { getPersona, randomPersonas } from "@/lib/personas";
import { fallbackComment } from "@/lib/fallback";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const caption: string = typeof body.caption === "string" ? body.caption : "";
  const count: number = Math.min(Math.max(Number(body.count) || 2, 1), 4);
  const requested: string[] = Array.isArray(body.personaIds) ? body.personaIds : [];

  const personas = requested.length
    ? requested.map((id) => getPersona(id)).filter((p) => p !== undefined)
    : randomPersonas(count);

  const results = await Promise.all(
    personas.slice(0, count).map(async (persona) => {
      let text: string | null = null;

      if (aiEnabled()) {
        text = await generate({
          system: `${persona.personality}\n\nYou are commenting on a photo posted by a friend on a social photo app. Reply with ONLY the comment text — no quotes, no name prefix, no explanation. Keep it under 12 words and make it feel like a real Instagram comment.`,
          messages: [
            {
              role: "user",
              content: caption
                ? `The photo's caption is: "${caption}". Write your comment.`
                : `The photo has no caption. Write a short comment reacting to the photo.`,
            },
          ],
          maxTokens: 120,
        });
      }

      return {
        username: persona.username,
        avatarSeed: persona.avatarSeed,
        text: text || fallbackComment(),
      };
    })
  );

  return NextResponse.json({ comments: results, ai: aiEnabled() });
}
