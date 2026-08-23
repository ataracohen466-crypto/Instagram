import { NextRequest, NextResponse } from "next/server";
import { generateJSON, hasAIKey } from "@/lib/ai";
import { fallbackSongArrangement } from "@/lib/fallback";
import type { SongArrangement } from "@/lib/types";
import { CHORDS } from "@/lib/chords";

const SYSTEM = `You are Guitar AI's arrangement engine. You write ORIGINAL guitar teaching \
arrangements — never reproduce copyrighted lyrics or transcribe an existing recording. \
Focus purely on musical instruction: chords, rhythm, structure, and technique. \
Only use chord names from this set when possible, in order of difficulty: \
${Object.keys(CHORDS).join(", ")}. Respond with ONLY a single JSON object, no prose, matching \
exactly this TypeScript shape:
{
  "title": string,
  "originalNote": string, // one sentence clarifying this is an original arrangement, not a transcription
  "difficulty": 1|2|3|4|5,
  "bpm": number,
  "capo": number,
  "timeSignature": string,
  "chordsUsed": string[],
  "sections": [{ "name": string, "chords": string[], "strumPattern": string, "bars": number, "tab"?: string, "notes"?: string }],
  "versions": { "beginner": string, "intermediate": string, "advanced": string }
}`;

export async function POST(req: NextRequest) {
  const { title, genre, mood, difficultyPref } = await req.json();

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  if (!hasAIKey()) {
    return NextResponse.json({ arrangement: fallbackSongArrangement(title, genre, difficultyPref), source: "fallback" });
  }

  try {
    const prompt = `Song/style request: "${title}". Genre: ${genre ?? "unspecified"}. Mood: ${mood ?? "unspecified"}. \
Target difficulty: ${difficultyPref ?? "beginner-friendly"}. Create an original teaching arrangement for this.`;
    const arrangement = await generateJSON<SongArrangement>(SYSTEM, prompt);
    return NextResponse.json({ arrangement, source: "ai" });
  } catch {
    return NextResponse.json({ arrangement: fallbackSongArrangement(title, genre, difficultyPref), source: "fallback" });
  }
}
