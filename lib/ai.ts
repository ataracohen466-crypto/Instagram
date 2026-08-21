import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function hasAIKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

/**
 * Asks Claude for a single JSON object matching the shape described in
 * `instructions`, and parses the response. Throws on any failure so callers
 * can fall back to a deterministic template — this app must always produce
 * a usable lesson/song/report, API key or not.
 */
export async function generateJSON<T>(system: string, prompt: string): Promise<T> {
  const anthropic = getClient();
  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("No text content in AI response");

  const text = block.text.trim();
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, text];
  const raw = (jsonMatch[1] ?? text).trim();
  return JSON.parse(raw) as T;
}

export async function generateText(system: string, prompt: string): Promise<string> {
  const anthropic = getClient();
  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("No text content in AI response");
  return block.text.trim();
}
