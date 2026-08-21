import { NextRequest, NextResponse } from "next/server";
import { generateJSON, hasAIKey } from "@/lib/ai";
import { fallbackComposition } from "@/lib/fallback";
import type { Composition } from "@/lib/types";
import { CHORDS } from "@/lib/chords";

const SYSTEM = `You are Guitar AI's composition engine. A user describes a song they want and you \
write a fully ORIGINAL guitar composition (never copy an existing song). Only use chord names \
from this set when possible: ${Object.keys(CHORDS).join(", ")}. Respond with ONLY a single JSON \
object, no prose, matching exactly this TypeScript shape:
{
  "title": string,
  "prompt": string,
  "mood": string,
  "melodyDescription": string, // plain-language description of the melody shape/feel, no notation needed
  "originalNote": string,
  "difficulty": 1|2|3|4|5,
  "bpm": number,
  "capo": number,
  "timeSignature": string,
  "chordsUsed": string[],
  "sections": [{ "name": string, "chords": string[], "strumPattern": string, "bars": number, "tab"?: string, "notes"?: string }],
  "versions": { "beginner": string, "intermediate": string, "advanced": string }
}`;

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();
  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  if (!hasAIKey()) {
    return NextResponse.json({ composition: fallbackComposition(prompt), source: "fallback" });
  }

  try {
    const composition = await generateJSON<Composition>(SYSTEM, `Compose: "${prompt}"`);
    return NextResponse.json({ composition, source: "ai" });
  } catch {
    return NextResponse.json({ composition: fallbackComposition(prompt), source: "fallback" });
  }
}
