import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-5";

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function logError(error: unknown): void {
  if (error instanceof Anthropic.AuthenticationError) {
    console.error("Invalid Anthropic API key — falling back to canned content.");
  } else if (error instanceof Anthropic.RateLimitError) {
    console.error("Rate limited — falling back to canned content.");
  } else if (error instanceof Anthropic.APIError) {
    console.error(`Anthropic API error ${error.status}: ${error.message}`);
  } else {
    console.error("Anthropic request failed", error);
  }
}

interface GenerateOptions {
  system: string;
  messages: Anthropic.MessageParam[];
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
}

/**
 * Plain-text generation — used for the tutor chat and free-text explanations.
 * Returns null on any failure (including a missing key) so every caller can
 * fall back to offline content.
 */
export async function generate({
  system,
  messages,
  maxTokens = 1200,
  effort = "low",
}: GenerateOptions): Promise<string | null> {
  const anthropic = getClient();
  if (!anthropic) return null;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      output_config: { effort },
      system,
      messages,
    });

    if (response.stop_reason === "refusal") return null;

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    return text.length > 0 ? text : null;
  } catch (error) {
    logError(error);
    return null;
  }
}

export interface StructuredTool {
  name: string;
  description: string;
  input_schema: Anthropic.Tool.InputSchema;
}

interface GenerateStructuredOptions {
  system: string;
  messages: Anthropic.MessageParam[];
  tool: StructuredTool;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
}

/**
 * Forces Claude to answer by calling a single tool whose `input_schema` is the
 * shape we want back, then hands the parsed `input` object to the caller. This
 * is how every generator that needs JSON (summaries, flashcards, questions,
 * tests, grading, plans) talks to the model.
 */
export async function generateStructured<T>({
  system,
  messages,
  tool,
  maxTokens = 8000,
  effort = "medium",
}: GenerateStructuredOptions): Promise<T | null> {
  const anthropic = getClient();
  if (!anthropic) return null;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      output_config: { effort },
      system,
      messages,
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
    });

    if (response.stop_reason === "refusal") return null;

    const block = response.content.find(
      (b): b is Anthropic.ToolUseBlock =>
        b.type === "tool_use" && b.name === tool.name
    );
    if (!block) return null;

    return block.input as T;
  } catch (error) {
    logError(error);
    return null;
  }
}

/** Builds a user message that pairs an optional base64 image with some text. */
export function visionMessage(
  text: string,
  image?: { mediaType: string; data: string } | null
): Anthropic.MessageParam {
  if (!image) return { role: "user", content: text };

  return {
    role: "user",
    content: [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: image.mediaType as
            | "image/jpeg"
            | "image/png"
            | "image/gif"
            | "image/webp",
          data: image.data,
        },
      },
      { type: "text", text },
    ],
  };
}

export type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
