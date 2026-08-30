import { NextRequest, NextResponse } from "next/server";
import { aiEnabled, generate } from "@/lib/ai";
import { fallbackRewrite } from "@/lib/fallback";

export async function POST(req: NextRequest) {
  const { selection, instruction } = await req.json();
  if (typeof selection !== "string" || !selection.trim()) {
    return NextResponse.json({ error: "selection is required" }, { status: 400 });
  }

  if (!aiEnabled()) {
    return NextResponse.json({ text: fallbackRewrite(selection), offline: true });
  }

  const system = [
    "You rewrite passages from a novel-in-progress on the author's instruction.",
    "Preserve the meaning, characters, and facts of the passage unless told otherwise.",
    "Return only the rewritten passage — no preamble, no explanation, no quotation marks.",
  ].join(" ");

  const text = await generate({
    system,
    messages: [
      {
        role: "user",
        content: `Instruction: ${instruction || "Improve this passage."}\n\nPassage:\n${selection}`,
      },
    ],
    maxTokens: 400,
  });

  return NextResponse.json({ text: text || fallbackRewrite(selection), offline: !text });
}
