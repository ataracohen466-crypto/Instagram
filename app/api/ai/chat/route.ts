import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { generate, aiEnabled } from "@/lib/ai";
import { getPersona } from "@/lib/personas";
import { fallbackChat } from "@/lib/fallback";

export const runtime = "nodejs";
export const maxDuration = 30;

interface IncomingMessage {
  sender: "me" | "persona";
  text: string;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const personaId: string = typeof body.personaId === "string" ? body.personaId : "";
  const myName: string = typeof body.myName === "string" ? body.myName : "there";
  const history: IncomingMessage[] = Array.isArray(body.messages) ? body.messages : [];

  const persona = getPersona(personaId);
  if (!persona) {
    return NextResponse.json({ error: "Unknown persona" }, { status: 404 });
  }

  if (!aiEnabled()) {
    return NextResponse.json({ reply: fallbackChat(persona), ai: false });
  }

  const messages: Anthropic.MessageParam[] = history
    .slice(-20)
    .filter((m) => typeof m.text === "string" && m.text.trim().length > 0)
    .map((m) => ({
      role: m.sender === "me" ? ("user" as const) : ("assistant" as const),
      content: m.text.slice(0, 2000),
    }));

  if (messages.length === 0 || messages[0].role !== "user") {
    messages.unshift({ role: "user", content: "hey!" });
  }

  const reply = await generate({
    system: `${persona.personality}

You are direct-messaging ${myName} on a social photo app. Your handle is @${persona.username}. Stay in character as an AI persona — you can acknowledge you're an AI if asked, but keep it light.

Style rules:
- Write like a real DM: short, casual, lowercase-friendly.
- One to three sentences max. Usually one.
- Ask a question back sometimes, but not every message.
- At most one emoji, often none.
- Never use markdown, bullet points, or headings.`,
    messages,
    maxTokens: 300,
  });

  return NextResponse.json({
    reply: reply || fallbackChat(persona),
    ai: true,
  });
}
