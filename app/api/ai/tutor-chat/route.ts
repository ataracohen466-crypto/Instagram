import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { generate } from "@/lib/ai";
import { offlineTutorReply } from "@/lib/offline";
import { ChatMessage } from "@/lib/types";
import { clampText } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  subject?: string;
  level?: string;
  history?: ChatMessage[];
  message?: string;
  /** "tutor" is Socratic; "homework" walks a problem without giving the answer. */
  mode?: "tutor" | "homework" | "ask";
  context?: string;
}

const TUTOR_SYSTEM = (subject: string, level: string) => `You are TutorAI, a patient one-to-one tutor for a ${level} student studying ${subject}.

How you teach:
- Go step by step. One idea per paragraph, and stop before the student is lost.
- When the student is trying to learn a *process*, do not just hand over the answer. Ask a guiding question that moves them one step forward, then wait. When they are simply asking a factual question ("what year was X"), just answer it — Socratic method on trivia is annoying.
- Check understanding before moving on: end most replies with one short question.
- Adjust to their level. If they say they're confused, drop a level of abstraction and use a concrete example.
- Praise specifically ("that's exactly the right first step") rather than generically.
- Never make the student feel stupid. Never lecture for more than about 200 words at a time.

Formatting: markdown bold and bullets are fine; no headings above ###. No preamble like "Great question!" — just teach.`;

const ASK_SYSTEM = (level: string) => `You are TutorAI, talking to a ${level} student who has asked you a question out loud. Answer anything they ask — it does not have to be about what they're revising.

How you answer:
- Lead with the answer. No preamble, no restating the question.
- Keep it to what someone would actually say out loud: two to five sentences for most questions. This is being read aloud by a speech synthesiser, so no markdown, no bullet lists, no headings, no code blocks.
- If the question is about something in their notes, use their notes. If it's outside their notes, just answer it from what you know and don't apologise for the topic.
- If it's a problem they're clearly meant to work out themselves, give the next step rather than the final answer, and ask what they get.
- If you don't know or aren't sure, say so plainly in one sentence.
- Numbers, dates and names should be spoken naturally ("nineteen forty-five", not "1945").`;

const HOMEWORK_SYSTEM = (subject: string, level: string) => `You are TutorAI helping a ${level} student with a ${subject} homework problem.

Hard rule: you do NOT give the final answer outright. You give the next hint, or check the work they've already done.
- If they've shown no work: give one hint that unblocks the first step, then ask what they get.
- If they've shown work: check it line by line. Say exactly where the first error is (if any) and why it's wrong — do not correct the rest until they fix that one.
- If they're right: confirm it, and ask them to explain why the method works, so it sticks.
- If they explicitly say they've given up and want the full walkthrough, give it — but structure it as numbered steps with the reasoning at each step, not just a final number.

Formatting: short paragraphs, markdown bold for key steps. No headings above ###.`;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const subject = body.subject ?? "general studies";
  const level = body.level ?? "high school";
  const message = (body.message ?? "").trim();

  if (!message) {
    return NextResponse.json({ error: "Empty message." }, { status: 400 });
  }

  const history: Anthropic.MessageParam[] = (body.history ?? [])
    .slice(-20)
    .filter((m) => typeof m.content === "string" && m.content.trim().length > 0)
    .map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: clampText(m.content, 4000),
    }));

  if (history.length > 0 && history[0].role !== "user") history.shift();

  const messages: Anthropic.MessageParam[] = [
    ...history,
    {
      role: "user",
      content: body.context
        ? `${message}\n\n[Material I'm working from]\n${clampText(body.context, 8000)}`
        : message,
    },
  ];

  const reply = await generate({
    system:
      body.mode === "homework"
        ? HOMEWORK_SYSTEM(subject, level)
        : body.mode === "ask"
        ? ASK_SYSTEM(level)
        : TUTOR_SYSTEM(subject, level),
    messages,
    // Spoken answers stay short; typed tutoring can run longer.
    maxTokens: body.mode === "ask" ? 700 : 2000,
  });

  return NextResponse.json({
    reply: reply ?? offlineTutorReply(message, subject),
    source: reply ? "claude" : "offline",
  });
}
